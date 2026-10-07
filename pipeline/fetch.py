"""Fetch the LADOT layers and link cameras and status points to corridors.

Ported from scripts/la-speeding-cameras/fetch.py. The two point layers share no
numeric key with the corridors, so they're matched by street name and distance.
"""

import re

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.optimize import linear_sum_assignment

from arcgis import query_layer
from centerline import centerlines

# CA State Plane Zone 5, in feet
PROJ_CRS = 2229
FEET_PER_MILE = 5280

CORRIDOR_FIELDS = {
    "OBJECTID": "object_id",
    "DISTRICT": "council_district",
    "StreetName": "street_name",
    "XStreet1": "cross_street_to",
    "XStreet2": "cross_street_from",
    "speed_limi": "speed_limit",
    "EquityArea": "equity_area",
    "SchoolNearby": "school_nearby",
    "SpeedCollisions2": "speed_collisions",
    "Percentspeed": "percent_speeding",
    "TotalVehicles": "total_vehicles",
}

CAMERA_FIELDS = {
    "OBJECTID": "object_id",
    "PairID": "pair_id",
    "Primary_Street": "street_name",
    "From_": "cross_street_from",
    "To_": "cross_street_to",
    "Council_District": "council_district",
    "Traffic_Direction_Enforced": "direction_enforced",
    "Side_of_Street_Camera_is_Mounted_on": "mount_side",
    "SystemUpdate": "system_status",
}

STATUS_FIELDS = {"OBJECTID": "object_id", "ID": "system_id", "System": "system_status"}


def _select(gdf, mapping, name):
    missing = [src for src in mapping if src not in gdf.columns]
    if missing:
        raise RuntimeError(f"{name} layer is missing fields: {missing}")
    return gdf.rename(columns=mapping)[[*mapping.values(), "geometry"]]


def fetch_corridors(url):
    gdf = _select(query_layer(url), CORRIDOR_FIELDS, "corridor")
    projected = gdf.to_crs(PROJ_CRS)
    lengths_ft, lines = centerlines(projected.geometry)
    gdf["length_miles"] = lengths_ft / FEET_PER_MILE
    lines_gdf = gpd.GeoDataFrame(
        gdf[["object_id"]].copy(),
        geometry=gpd.GeoSeries(lines, crs=PROJ_CRS).simplify(5),
        crs=PROJ_CRS,
    ).to_crs(4326)
    print(f"  corridors: {len(gdf)} ({gdf['length_miles'].sum():.1f} miles)")
    return gdf, lines_gdf


def fetch_cameras(url):
    gdf = _select(query_layer(url), CAMERA_FIELDS, "camera")
    print(f"  cameras: {len(gdf)}")
    return gdf


def fetch_status(url):
    gdf = _select(query_layer(url), STATUS_FIELDS, "status")
    print(f"  status points: {len(gdf)}")
    return gdf


_STREET_TYPES = {
    "street": "st", "avenue": "ave", "boulevard": "blvd", "bl": "blvd",
    "drive": "dr", "road": "rd", "place": "pl", "lane": "ln",
    "freeway": "fwy", "parkway": "pkwy", "terrace": "ter",
}
_DIRECTIONS = {"n", "s", "e", "w", "north", "south", "east", "west"}


def normalize_street(name):
    if not isinstance(name, str):
        return ""
    tokens = re.sub(r"[^a-z0-9 ]", " ", name.lower()).split()
    return " ".join(_STREET_TYPES.get(t, t) for t in tokens if t not in _DIRECTIONS)


def _street_root(name):
    """Street name minus its type, so 'Slauson' matches 'S Slauson Ave'."""
    tokens = normalize_street(name).split()
    return " ".join(t for t in tokens if t not in _STREET_TYPES.values()) or " ".join(tokens)


def link_cameras(cameras, corridors):
    """Attach each camera to its corridor: same street first, nearest second."""
    cams = cameras.to_crs(PROJ_CRS).copy()
    cors = corridors.to_crs(PROJ_CRS)[["object_id", "street_name", "geometry"]].copy()
    cams["key"] = cams["street_name"].map(_street_root)
    cors["key"] = cors["street_name"].map(_street_root)

    matches = []
    for key, group in cams.groupby("key"):
        candidates = cors[cors["key"] == key]
        if candidates.empty:
            candidates = cors
        joined = gpd.sjoin_nearest(
            group[["geometry"]], candidates[["object_id", "geometry"]],
            how="left", distance_col="dist_ft",
        )
        matches.append(joined[~joined.index.duplicated()])

    linked = pd.concat(matches).reindex(cams.index)
    out = cameras.copy()
    out["corridor_id"] = linked["object_id"].astype("Int64")
    out["corridor_dist_ft"] = linked["dist_ft"].round(1)
    print(
        f"  linked {out['corridor_id'].notna().sum()} cameras to "
        f"{out['corridor_id'].nunique()} corridors; "
        f"{(out['corridor_dist_ft'] > 500).sum()} sit >500 ft from their corridor"
    )
    return out


def link_status(status, corridors):
    """Attach each status point (ID like '13-7') to the nearest corridor in its district."""
    pts = status.to_crs(PROJ_CRS).copy()
    cors = corridors.to_crs(PROJ_CRS)[["object_id", "council_district", "geometry"]]
    pts["district"] = pd.to_numeric(
        pts["system_id"].astype(str).str.split("-").str[0], errors="coerce"
    ).astype("Int64")

    # One status point per corridor: solve the assignment within each district
    # so two nearby corridors can't both claim the same point.
    rows = []
    for district, group in pts.groupby("district", dropna=False):
        pool = cors[cors["council_district"] == district]
        if pool.empty:
            pool = cors
        cost = np.array([[pt.distance(c) for c in pool.geometry] for pt in group.geometry])
        pt_idx, cor_idx = linear_sum_assignment(cost)
        assigned = set()
        for i, j in zip(pt_idx, cor_idx):
            pt = group.iloc[i]
            assigned.add(i)
            rows.append({
                "system_id": pt["system_id"],
                "system_status": pt["system_status"],
                "corridor_id": int(pool.iloc[j]["object_id"]),
                "status_dist_ft": round(float(cost[i, j]), 1),
            })
        for i in set(range(len(group))) - assigned:
            pt = group.iloc[i]
            j = int(cost[i].argmin())
            rows.append({
                "system_id": pt["system_id"],
                "system_status": pt["system_status"],
                "corridor_id": int(pool.iloc[j]["object_id"]),
                "status_dist_ft": round(float(cost[i, j]), 1),
            })
    out = pd.DataFrame(rows)
    dupes = out["corridor_id"].duplicated(keep=False).sum()
    print(f"  linked {len(out)} status points; {dupes} share a corridor")
    return out

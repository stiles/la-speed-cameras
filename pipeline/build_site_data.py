"""Turn the linked LADOT layers into the JSON and GeoJSON the site reads.

Only public-facing fields are published. Streetlight IDs, power state and
vendor or BSL survey notes are internal operations data and stay out.
"""

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import mapping

from fetch import PROJ_CRS, FEET_PER_MILE

ROOT = Path(__file__).resolve().parent.parent
GEO = Path(__file__).resolve().parent / "geography"

BEARINGS = {"northbound": 0, "eastbound": 90, "southbound": 180, "westbound": 270}
DIRECTION_ABBR = {"northbound": "nb", "eastbound": "eb", "southbound": "sb", "westbound": "wb"}

REGION_NAMES = {
    "antelope-valley": "Antelope Valley", "angeles-forest": "Angeles Forest",
    "central-la": "Central LA", "eastside": "Eastside", "harbor": "Harbor",
    "northeast-la": "Northeast LA", "northwest-county": "Northwest County",
    "pomona-valley": "Pomona Valley", "san-fernando-valley": "San Fernando Valley",
    "san-gabriel-valley": "San Gabriel Valley", "santa-monica-mountains": "Santa Monica Mountains",
    "south-bay": "South Bay", "south-la": "South LA", "southeast": "Southeast",
    "verdugos": "Verdugos", "westside": "Westside",
}

BORDER_BUFFER_FT = 500
ADJACENT_BUFFER_FT = 500


def _s(value):
    return value.strip() if isinstance(value, str) else ""


def slugify(text):
    text = re.sub(r"\(.*?\)", "", str(text)).lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def clean_street(name):
    """Expand 'Bl' to 'Blvd' and tidy whitespace; otherwise keep LADOT's wording."""
    if not isinstance(name, str) or not name.strip():
        return ""
    name = re.sub(r"\s*\([^)]*\d[^)]*\)", "", name)  # drop parenthetical addresses, keep "(midblock)"
    name = re.sub(r"\s+", " ", name.strip())
    name = re.sub(r"\bBl\b\.?", "Blvd", name)
    return name.replace("Jr.", "Jr")


def street_base(name):
    """Street name without a leading direction, for grouping: 'W Slauson Ave' -> 'Slauson Ave'."""
    return re.sub(r"^(N|S|E|W|North|South|East|West)\s+", "", clean_street(name))


def status_key(label):
    s = (label or "").lower()
    if "construct" in s or "install" in s or "planned" in s:
        return "construction"
    if "warn" in s:
        return "warning"
    if any(k in s for k in ("citation", "ticket", "enforc")):
        return "ticketing"
    if any(k in s for k in ("active", "operational", "live", "online")):
        return "active"
    return "unknown"


def _round_coords(geom, digits=5):
    def rnd(obj):
        if isinstance(obj, (list, tuple)):
            if obj and isinstance(obj[0], (int, float)):
                return [round(v, digits) for v in obj]
            return [rnd(o) for o in obj]
        return obj
    m = mapping(geom)
    m["coordinates"] = rnd(m["coordinates"])
    return m


def _feature_collection(features):
    return {"type": "FeatureCollection", "features": features}


def _write_json(path, obj, compact=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        if compact:
            json.dump(obj, f, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
        else:
            json.dump(obj, f, indent=1, ensure_ascii=False, allow_nan=False)
        f.write("\n")


def _svg_path(geom, minx, miny, scale, height):
    """SVG path for a projected (Multi)Polygon in a 0..width, 0..height frame (y flipped)."""
    polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    parts = []
    for poly in polys:
        for ring in [poly.exterior, *poly.interiors]:
            pts = [
                f"{(x - minx) * scale:.1f},{height - (y - miny) * scale:.1f}"
                for x, y in ring.coords
            ]
            parts.append("M" + "L".join(pts) + "Z")
    return "".join(parts)


def load_neighborhoods():
    hoods = gpd.read_file(GEO / "neighborhoods.geojson").to_crs(PROJ_CRS)
    city = gpd.read_file(GEO / "la_city_boundary.geojson").to_crs(PROJ_CRS)
    city_geom = city.union_all()
    hoods["in_la_city"] = hoods["city"] == "los-angeles"
    border = (~hoods["in_la_city"]) & hoods.intersects(city_geom.buffer(BORDER_BUFFER_FT))
    hoods = hoods[hoods["in_la_city"] | border].copy()
    hoods["geometry"] = hoods.geometry.buffer(0)
    return hoods.reset_index(drop=True), city_geom


def build(corridors, centerlines, cameras, status, previous_history=None):
    """Return a dict of output name -> object, plus the camera and corridor frames for validation."""
    hoods, city_geom = load_neighborhoods()
    previous_history = previous_history or {}

    cors = corridors.to_crs(PROJ_CRS).copy()
    lines = centerlines.to_crs(PROJ_CRS).set_index("object_id")
    cams = cameras.to_crs(PROJ_CRS).copy()

    status_by_corridor = {}
    for row in status.itertuples():
        status_by_corridor.setdefault(row.corridor_id, row)

    # Camera -> neighborhood
    cams = gpd.sjoin(cams, hoods[["slug", "geometry"]], how="left", predicate="within")
    cams = cams[~cams.index.duplicated()].rename(columns={"slug": "hood"}).drop(columns="index_right")
    missing = cams["hood"].isna()
    if missing.any():
        nearest = gpd.sjoin_nearest(cams.loc[missing, ["geometry"]], hoods[["slug", "geometry"]])
        cams.loc[missing, "hood"] = nearest["slug"]

    # --- Corridors ---
    corridor_rows = []
    slug_counts = Counter()
    for cor in cors.itertuples():
        own = cams[cams["corridor_id"] == cor.object_id]
        street = clean_street(cor.street_name)
        if len(own):
            frm = clean_street(own.iloc[0]["cross_street_from"])
            to = clean_street(own.iloc[0]["cross_street_to"])
        else:
            frm, to = clean_street(cor.cross_street_from), clean_street(cor.cross_street_to)
        base = f"{slugify(street_base(street))}-{slugify(street_base(frm))}-to-{slugify(street_base(to))}"
        slug_counts[base] += 1
        corridor_rows.append((cor, own, street, frm, to, base))

    corridor_records, corridor_features, camera_features = [], [], []
    camera_ids = Counter()
    cor_geoms = {}
    for cor, own, street, frm, to, base in corridor_rows:
        slug = base if slug_counts[base] == 1 else f"{base}-cd{cor.council_district}"
        line = lines.geometry.get(cor.object_id)
        geom_for_hoods = line if line is not None and not line.is_empty else cor.geometry
        cor_geoms[slug] = geom_for_hoods
        touched = set(hoods[hoods.intersects(geom_for_hoods)]["slug"]) | set(own["hood"].dropna())

        st = status_by_corridor.get(cor.object_id)
        raw_status = _s(st.system_status) if st is not None else ""
        if not raw_status and own["system_status"].notna().any():
            raw_status = _s(own["system_status"].dropna().iloc[0])

        cam_ids = []
        own = own.assign(_x=own.geometry.x).sort_values(["direction_enforced", "_x"])
        for cam in own.itertuples():
            direction = _s(cam.direction_enforced)
            suffix = DIRECTION_ABBR.get(direction.lower(), "cam")
            cam_id = f"{slug}-{suffix}"
            camera_ids[cam_id] += 1
            if camera_ids[cam_id] > 1:
                cam_id = f"{cam_id}-{camera_ids[cam_id]}"
            cam_ids.append(cam_id)
            pt = gpd.GeoSeries([cam.geometry], crs=PROJ_CRS).to_crs(4326).iloc[0]
            camera_features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [round(pt.x, 6), round(pt.y, 6)]},
                "properties": {
                    "id": cam_id,
                    "corridor": slug,
                    "street": street,
                    "from": frm,
                    "to": to,
                    "direction": direction or None,
                    "bearing": BEARINGS.get(direction.lower()),
                    "side": _s(cam.mount_side) or None,
                    "district": int(cor.council_district),
                    "speed_limit": int(cor.speed_limit) if pd.notna(cor.speed_limit) else None,
                    "status": status_key(raw_status),
                    "status_label": raw_status or None,
                    "hood": cam.hood,
                    "dist_from_corridor_ft": float(cam.corridor_dist_ft) if pd.notna(cam.corridor_dist_ft) else None,
                },
            })

        line_wgs = gpd.GeoSeries([geom_for_hoods], crs=PROJ_CRS).to_crs(4326).iloc[0]
        if line_wgs.geom_type in ("Polygon", "MultiPolygon"):
            line_wgs = line_wgs.boundary
        own_wgs = own.to_crs(4326)
        all_geoms = [line_wgs, *own_wgs.geometry]
        bounds = gpd.GeoSeries(all_geoms, crs=4326).total_bounds
        center = gpd.GeoSeries([geom_for_hoods], crs=PROJ_CRS).centroid.to_crs(4326).iloc[0]

        corridor_features.append({
            "type": "Feature",
            "geometry": _round_coords(line_wgs, 6),
            "properties": {"corridor": slug, "street": street, "status": status_key(raw_status)},
        })
        corridor_records.append({
            "slug": slug,
            "street": street,
            "street_slug": slugify(street_base(street)),
            "from": frm,
            "to": to,
            "district": int(cor.council_district),
            "speed_limit": int(cor.speed_limit) if pd.notna(cor.speed_limit) else None,
            "school_nearby": str(cor.school_nearby).lower() == "yes",
            "speed_collisions": int(cor.speed_collisions) if pd.notna(cor.speed_collisions) else None,
            "percent_speeding": float(cor.percent_speeding) if pd.notna(cor.percent_speeding) else None,
            "length_miles": round(float(cor.length_miles), 2) if pd.notna(cor.length_miles) else None,
            "status": status_key(raw_status),
            "status_label": raw_status or None,
            "system_id": st.system_id if st is not None else None,
            "hoods": sorted(touched),
            "cameras": cam_ids,
            "center": [round(center.x, 6), round(center.y, 6)],
            "bbox": [round(v, 6) for v in bounds],
        })

    corridor_records.sort(key=lambda r: (r["street"], r["from"]))
    cam_by_id = {f["properties"]["id"]: f for f in camera_features}

    # --- Neighborhoods ---
    hood_corridors = defaultdict(set)
    for rec in corridor_records:
        for h in rec["hoods"]:
            hood_corridors[h].add(rec["slug"])
    cor_lookup = {r["slug"]: r for r in corridor_records}

    hood_records, hood_features = [], []
    for hood in hoods.itertuples():
        geom = hood.geometry
        mine = sorted(hood_corridors.get(hood.slug, set()))
        cams_here = [
            f["properties"]["id"] for f in camera_features if f["properties"]["hood"] == hood.slug
        ]
        adjacent = sorted(
            set(hoods[hoods.intersects(geom.buffer(ADJACENT_BUFFER_FT))]["slug"]) - {hood.slug}
        )
        dists = sorted(
            ((g.distance(geom), slug) for slug, g in cor_geoms.items() if slug not in mine),
        )[:3]
        nearest = [{"corridor": s, "miles": round(d / FEET_PER_MILE, 1)} for d, s in dists]

        minx, miny, maxx, maxy = geom.bounds
        w, h = maxx - minx, maxy - miny
        scale = 1000 / max(w, h)
        simple = geom.simplify(max(w, h) / 400)
        shape = {
            "w": round(w * scale, 1),
            "h": round(h * scale, 1),
            "path": _svg_path(simple, minx, miny, scale, h * scale),
            "dots": [
                [
                    round((cams.loc[i, "geometry"].x - minx) * scale, 1),
                    round(h * scale - (cams.loc[i, "geometry"].y - miny) * scale, 1),
                ]
                for i in cams.index
                if cams.loc[i, "hood"] == hood.slug
            ],
        }

        wgs = gpd.GeoSeries([geom], crs=PROJ_CRS).to_crs(4326)
        b = wgs.total_bounds
        centroid = wgs.representative_point().iloc[0]
        hood_features.append({
            "type": "Feature",
            "geometry": _round_coords(wgs.simplify(0.0001).iloc[0], 5),
            "properties": {"slug": hood.slug, "name": hood.name},
        })
        hood_records.append({
            "slug": hood.slug,
            "name": hood.name,
            "region": hood.region,
            "region_name": REGION_NAMES.get(hood.region, hood.region.replace("-", " ").title()),
            "type": hood.type,
            "city": _s(hood.city) or None,
            "in_la_city": bool(hood.in_la_city),
            "corridors": mine,
            "camera_count": len(cams_here),
            "streets": sorted({cor_lookup[s]["street_slug"] for s in mine}),
            "districts": sorted({cor_lookup[s]["district"] for s in mine}),
            "adjacent": adjacent,
            "nearest": nearest,
            "bbox": [round(v, 5) for v in b],
            "center": [round(centroid.x, 5), round(centroid.y, 5)],
            "area_sqmi": round(float(hood.area_sqmi), 2),
            "shape": shape,
        })
    hood_records.sort(key=lambda r: r["name"])

    # --- Council districts ---
    districts = gpd.read_file(GEO / "council_districts.geojson").to_crs(PROJ_CRS)
    cam_pts = gpd.GeoDataFrame(
        [f["properties"] for f in camera_features],
        geometry=gpd.points_from_xy(
            [f["geometry"]["coordinates"][0] for f in camera_features],
            [f["geometry"]["coordinates"][1] for f in camera_features],
        ),
        crs=4326,
    ).to_crs(PROJ_CRS)
    district_records, district_features, district_mismatches = [], [], []
    for d in districts.sort_values("district").itertuples():
        n = int(d.district)
        geom = d.geometry.buffer(0)
        inside = cam_pts[cam_pts.within(geom.buffer(-200))]
        district_mismatches += [
            f"{r.id} sits inside District {n} but LADOT lists District {r.district}"
            for r in inside.itertuples()
            if r.district != n
        ]
        minx, miny, maxx, maxy = geom.bounds
        w, h = maxx - minx, maxy - miny
        scale = 1000 / max(w, h)
        mine = cam_pts[cam_pts["district"] == n]
        wgs = gpd.GeoSeries([geom], crs=PROJ_CRS).to_crs(4326)
        b = wgs.total_bounds
        district_features.append({
            "type": "Feature",
            "geometry": _round_coords(wgs.simplify(0.0001).iloc[0], 5),
            "properties": {"district": n},
        })
        district_records.append({
            "n": n,
            "member": _s(d.member) or None,
            "camera_count": len(mine),
            "hoods": sorted(hoods[hoods.intersects(geom.buffer(-500))]["slug"]),
            "bbox": [round(v, 5) for v in b],
            "area_sqmi": round(geom.area / FEET_PER_MILE**2, 1),
            "shape": {
                "w": round(w * scale, 1),
                "h": round(h * scale, 1),
                "path": _svg_path(geom.simplify(max(w, h) / 400), minx, miny, scale, h * scale),
                "dots": [
                    [round((p.x - minx) * scale, 1), round(h * scale - (p.y - miny) * scale, 1)]
                    for p in mine.geometry
                ],
            },
        })

    # --- City outline with every camera, for the site-wide share image ---
    minx, miny, maxx, maxy = city_geom.bounds
    w, h = maxx - minx, maxy - miny
    scale = 1000 / max(w, h)
    city_shape = {
        "w": round(w * scale, 1),
        "h": round(h * scale, 1),
        "path": _svg_path(city_geom.simplify(max(w, h) / 500), minx, miny, scale, h * scale),
        "dots": [
            [round((g.x - minx) * scale, 1), round(h * scale - (g.y - miny) * scale, 1)]
            for g in cams.geometry
        ],
    }

    # --- Streets ---
    streets = defaultdict(list)
    for rec in corridor_records:
        streets[rec["street_slug"]].append(rec)
    street_records = []
    for slug, recs in sorted(streets.items()):
        names = Counter(street_base(r["street"]) for r in recs)
        street_records.append({
            "slug": slug,
            "name": names.most_common(1)[0][0],
            "corridors": [r["slug"] for r in recs],
            "camera_count": sum(len(r["cameras"]) for r in recs),
            "hoods": sorted({h for r in recs for h in r["hoods"]}),
            "districts": sorted({r["district"] for r in recs}),
        })

    # --- History ---
    history = {}
    for f in camera_features:
        p = f["properties"]
        prev = previous_history.get(p["id"], {})
        changed = prev.get("status") not in (None, p["status"])
        history[p["id"]] = {
            "coords": f["geometry"]["coordinates"],
            "status": p["status"],
            "status_label": p["status_label"],
            "first_seen": prev.get("first_seen"),
            "status_changed_at": prev.get("status_changed_at"),
            "_status_changed": changed,
            "_new": not prev,
        }

    # --- CSV download ---
    csv_rows = []
    for f in camera_features:
        p = f["properties"]
        rec = cor_lookup[p["corridor"]]
        csv_rows.append({
            "camera_id": p["id"],
            "corridor": p["corridor"],
            "street": p["street"],
            "from": p["from"],
            "to": p["to"],
            "direction_enforced": p["direction"],
            "mount_side": p["side"],
            "speed_limit": p["speed_limit"],
            "council_district": p["district"],
            "neighborhood": p["hood"],
            "status": p["status_label"],
            "school_nearby": rec["school_nearby"],
            "longitude": f["geometry"]["coordinates"][0],
            "latitude": f["geometry"]["coordinates"][1],
        })

    return {
        "corridors": corridor_records,
        "neighborhoods": hood_records,
        "streets": street_records,
        "camera_features": camera_features,
        "corridor_features": corridor_features,
        "hood_features": hood_features,
        "districts": district_records,
        "city_shape": city_shape,
        "district_features": district_features,
        "district_mismatches": district_mismatches,
        "history": history,
        "csv": pd.DataFrame(csv_rows),
        "cam_by_id": cam_by_id,
        "city_geom": city_geom,
    }


def write_outputs(out, meta):
    data, public = ROOT / "data", ROOT / "public" / "data"
    _write_json(data / "corridors.json", out["corridors"])
    _write_json(data / "neighborhoods.json", out["neighborhoods"])
    _write_json(data / "streets.json", out["streets"])
    _write_json(data / "districts.json", out["districts"])
    _write_json(data / "city-shape.json", out["city_shape"], compact=True)
    _write_json(data / "meta.json", meta)
    history = {
        k: {kk: vv for kk, vv in v.items() if not kk.startswith("_")}
        for k, v in out["history"].items()
    }
    _write_json(data / "history.json", history)

    _write_json(public / "cameras.geojson", _feature_collection(out["camera_features"]), compact=True)
    _write_json(public / "corridors.geojson", _feature_collection(out["corridor_features"]), compact=True)
    _write_json(public / "neighborhoods.geojson", _feature_collection(out["hood_features"]), compact=True)
    _write_json(public / "council-districts.geojson", _feature_collection(out["district_features"]), compact=True)
    out["csv"].to_csv(public / "la-speed-cameras.csv", index=False)

"""Sanity checks and a human-readable diff for each pipeline run."""

import math

from shapely.geometry import Point

from fetch import PROJ_CRS

CAMERA_RANGE = (200, 300)
CORRIDOR_RANGE = (100, 150)
# Vista Del Mar's cameras sit right at the city limit; allow a little slop.
CITY_TOLERANCE_FT = 1320
MOVE_FLAG_FT = 300


class ValidationError(Exception):
    pass


def _feet_between(a, b):
    """Approximate ground distance in feet between two lon/lat pairs (fine at LA's scale)."""
    lat = math.radians((a[1] + b[1]) / 2)
    dx = (a[0] - b[0]) * 364000 * math.cos(lat)
    dy = (a[1] - b[1]) * 364000
    return math.hypot(dx, dy)


def validate(out):
    """Raise ValidationError on anything that would publish bad data. Return warnings."""
    errors, warnings = [], []
    cams, cors = out["camera_features"], out["corridors"]

    if not CAMERA_RANGE[0] <= len(cams) <= CAMERA_RANGE[1]:
        errors.append(f"camera count {len(cams)} outside {CAMERA_RANGE}")
    if not CORRIDOR_RANGE[0] <= len(cors) <= CORRIDOR_RANGE[1]:
        errors.append(f"corridor count {len(cors)} outside {CORRIDOR_RANGE}")

    city = out["city_geom"].buffer(CITY_TOLERANCE_FT)
    import geopandas as gpd  # local import keeps module import cheap for the diff helpers

    pts = gpd.GeoSeries(
        [Point(f["geometry"]["coordinates"]) for f in cams], crs=4326
    ).to_crs(PROJ_CRS)
    outside = [cams[i]["properties"]["id"] for i, p in enumerate(pts) if not city.contains(p)]
    if outside:
        errors.append(f"{len(outside)} cameras outside the LA city limit: {outside[:5]}")

    for f in cams:
        p = f["properties"]
        if not p["street"] or not p["corridor"]:
            errors.append(f"camera {p['id']} missing street or corridor")
        if not p["direction"]:
            warnings.append(f"camera {p['id']} has no enforced direction")
        if p["status"] == "unknown":
            warnings.append(f"camera {p['id']} has an unrecognized status: {p['status_label']!r}")
        if (p["dist_from_corridor_ft"] or 0) > 1000:
            warnings.append(f"camera {p['id']} is {p['dist_from_corridor_ft']:.0f} ft from its corridor")

    for kind, records in (("corridor", cors), ("neighborhood", out["neighborhoods"]), ("street", out["streets"])):
        slugs = [r["slug"] for r in records]
        if len(slugs) != len(set(slugs)):
            errors.append(f"duplicate {kind} slugs")
        if any(not s for s in slugs):
            errors.append(f"empty {kind} slug")

    by_id = {f["properties"]["id"]: f["properties"] for f in cams}
    for c in cors:
        dirs = [by_id[i]["direction"] for i in c["cameras"] if by_id[i]["direction"]]
        if len(dirs) != len(set(dirs)):
            warnings.append(f"corridor {c['slug']} has two cameras enforcing the same direction")
        if not c["system_id"]:
            warnings.append(f"corridor {c['slug']} has no status point")

    empty = [c["slug"] for c in cors if not c["cameras"]]
    if empty:
        warnings.append(f"{len(empty)} corridors have no camera points: {empty[:5]}")

    if errors:
        raise ValidationError("\n".join(errors))
    return warnings


def diff(previous_history, out):
    """Compare this run to the last committed history."""
    current = out["history"]
    added = sorted(set(current) - set(previous_history))
    removed = sorted(set(previous_history) - set(current))
    moved, status_changes = [], []
    for cam_id in sorted(set(current) & set(previous_history)):
        old, new = previous_history[cam_id], current[cam_id]
        feet = _feet_between(old["coords"], new["coords"])
        if feet > MOVE_FLAG_FT:
            moved.append((cam_id, round(feet)))
        if old.get("status") != new["status"] or old.get("status_label") != new["status_label"]:
            status_changes.append((cam_id, old.get("status_label"), new["status_label"]))
    return {"added": added, "removed": removed, "moved": moved, "status": status_changes}


def summarize(d):
    lines = []
    if d["added"]:
        lines.append(f"Added {len(d['added'])} cameras: " + ", ".join(d["added"][:20]))
    if d["removed"]:
        lines.append(f"Removed {len(d['removed'])} cameras: " + ", ".join(d["removed"][:20]))
    if d["moved"]:
        lines.append(
            f"Moved {len(d['moved'])} cameras more than {MOVE_FLAG_FT} ft: "
            + ", ".join(f"{c} ({ft} ft)" for c, ft in d["moved"][:20])
        )
    if d["status"]:
        lines.append(
            f"Status changed on {len(d['status'])} cameras: "
            + ", ".join(f"{c} ({a} -> {b})" for c, a, b in d["status"][:20])
        )
    return lines

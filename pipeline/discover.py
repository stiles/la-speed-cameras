"""Resolve the current LADOT speed camera layers.

LADOT republishes layers under date-stamped names (ApprovedLocations_04012026,
CameraLocations_09302026), so URLs can't be hardcoded. The public web map names
the corridor and status layers; the detailed camera-point layer isn't in it, so
the newest one is picked from the org's service directory by its date suffix.
"""

import re
from datetime import datetime

from arcgis import get_json

ORG = "https://services.arcgis.com/G3nmNsarwQblLhip/arcgis/rest/services"
WEBMAP_ID = "1782595f9631429696a3d269e4c9aea5"
WEBMAP_DATA = f"https://www.arcgis.com/sharing/rest/content/items/{WEBMAP_ID}/data"

PATTERNS = {
    "corridors": re.compile(r"^ApprovedLocations_(\d{8})(_view)?$"),
    "cameras": re.compile(r"^CameraLocations_(\d{8})$"),
}
STATUS_SERVICE = "CameraSystemLabels_view"


def _service_date(match):
    return datetime.strptime(match.group(1), "%m%d%Y")


def _newest(services, pattern):
    """Newest service by date suffix; a public _view wins ties over the base."""
    candidates = []
    for svc in services:
        m = pattern.match(svc["name"])
        if m and svc.get("type") == "FeatureServer":
            candidates.append((_service_date(m), svc["name"].endswith("_view"), svc["name"]))
    if not candidates:
        return None
    return max(candidates)[2]


def _layer_url(service_name):
    return f"{ORG}/{service_name}/FeatureServer/0"


def discover(fallback=None):
    """Return {'corridors', 'cameras', 'status'} layer URLs.

    `fallback` is the last set of URLs that worked, used per layer when
    discovery comes up empty.
    """
    fallback = fallback or {}
    found = {}

    try:
        webmap = get_json(WEBMAP_DATA)
        for layer in webmap.get("operationalLayers", []):
            url = (layer.get("url") or "").rstrip("/")
            title = (layer.get("title") or "").lower()
            if "ApprovedLocations_" in url or "corridor" in title:
                found["corridors"] = url
            elif "CameraSystemLabels" in url or title == "camera systems":
                found["status"] = url
    except Exception as exc:  # noqa: BLE001
        print(f"  ! web map lookup failed: {exc}")

    try:
        services = get_json(ORG).get("services", [])
        for key, pattern in PATTERNS.items():
            name = _newest(services, pattern)
            if not name:
                continue
            url = _layer_url(name)
            # The directory can be newer than the web map; prefer the newer date.
            current = found.get(key)
            if current is None or _date_in(url) >= _date_in(current):
                found[key] = url
        if "status" not in found and any(s["name"] == STATUS_SERVICE for s in services):
            found["status"] = _layer_url(STATUS_SERVICE)
    except Exception as exc:  # noqa: BLE001
        print(f"  ! service directory lookup failed: {exc}")

    for key in ("corridors", "cameras", "status"):
        if key not in found and key in fallback:
            print(f"  ! using fallback URL for {key}")
            found[key] = fallback[key]
        if key not in found:
            raise RuntimeError(f"Could not discover the {key} layer")
    return found


def _date_in(url):
    m = re.search(r"_(\d{8})", url)
    return datetime.strptime(m.group(1), "%m%d%Y") if m else datetime.min


if __name__ == "__main__":
    for k, v in discover().items():
        print(f"{k}: {v}")

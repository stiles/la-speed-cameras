"""Minimal ArcGIS REST helpers: JSON GETs with retries and paged feature queries."""

import time

import geopandas as gpd
import requests

SESSION = requests.Session()
SESSION.headers["User-Agent"] = "laspeedcameras.com data pipeline"


def get_json(url, params=None, retries=3):
    params = {"f": "json", **(params or {})}
    for attempt in range(retries):
        try:
            resp = SESSION.get(url, params=params, timeout=60)
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                raise RuntimeError(f"{url}: {data['error']}")
            return data
        except (requests.RequestException, RuntimeError):
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt * 3)


def layer_info(layer_url):
    return get_json(layer_url)


def query_layer(layer_url, page_size=1000):
    """Return every feature in a layer as a GeoDataFrame in EPSG:4326."""
    features, offset = [], 0
    while True:
        data = get_json(
            f"{layer_url}/query",
            {
                "where": "1=1",
                "outFields": "*",
                "outSR": 4326,
                "f": "geojson",
                "resultOffset": offset,
                "resultRecordCount": page_size,
            },
        )
        batch = data.get("features", [])
        features.extend(batch)
        exceeded = data.get("exceededTransferLimit") or data.get("properties", {}).get(
            "exceededTransferLimit"
        )
        if not batch or (len(batch) < page_size and not exceeded):
            break
        offset += len(batch)
    if not features:
        raise RuntimeError(f"No features returned from {layer_url}")
    return gpd.GeoDataFrame.from_features(features, crs=4326)

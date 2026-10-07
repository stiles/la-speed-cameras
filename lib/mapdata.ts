"use client";

import type { CameraProps } from "./types";

type FC<G extends GeoJSON.Geometry, P> = GeoJSON.FeatureCollection<G, P>;
export type CameraFC = FC<GeoJSON.Point, CameraProps>;
export type CorridorFC = FC<GeoJSON.LineString | GeoJSON.MultiLineString, { corridor: string; street: string; status: string }>;
export type HoodFC = FC<GeoJSON.Polygon | GeoJSON.MultiPolygon, { slug: string; name: string }>;

const cache = new Map<string, Promise<unknown>>();

function load<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${url}`);
        return r.json();
      }),
    );
  }
  return cache.get(url) as Promise<T>;
}

export const loadCameras = () => load<CameraFC>("/data/cameras.geojson");
export const loadCorridors = () => load<CorridorFC>("/data/corridors.geojson");
export const loadHoods = () => load<HoodFC>("/data/neighborhoods.geojson");

"use client";

import bearing from "@turf/bearing";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import pointToLineDistance from "@turf/point-to-line-distance";
import { lineString, point } from "@turf/helpers";
import { MAPBOX_TOKEN } from "./site";
import type { CameraFC } from "./mapdata";
import type { CameraProps } from "./types";

export type RouteOption = {
  id: string;
  label: string;
  geometry: GeoJSON.LineString;
  durationMin: number;
  distanceMi: number;
  facing: CameraProps[];
  opposite: CameraProps[];
};

/** Cameras within this distance of the route line count as on it. */
const ON_ROUTE_M = 25;
/** Max difference between travel heading and enforced heading to count as facing you. */
const HEADING_TOLERANCE = 60;
const MAX_EXCLUDES = 50;

function angleDiff(a: number, b: number) {
  const d = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return d;
}

export function camerasOnRoute(line: GeoJSON.LineString, cams: CameraFC) {
  const ls = lineString(line.coordinates);
  const lons = line.coordinates.map((c) => c[0]);
  const lats = line.coordinates.map((c) => c[1]);
  const pad = 0.002;
  const [w, s, e, n] = [Math.min(...lons) - pad, Math.min(...lats) - pad, Math.max(...lons) + pad, Math.max(...lats) + pad];
  const facing: CameraProps[] = [];
  const opposite: CameraProps[] = [];
  for (const f of cams.features) {
    const [lon, lat] = f.geometry.coordinates;
    if (lon < w || lon > e || lat < s || lat > n) continue;
    const pt = point([lon, lat]);
    if (pointToLineDistance(pt, ls, { units: "meters" }) > ON_ROUTE_M) continue;
    const p = f.properties;
    if (p.bearing === null || p.bearing === undefined) {
      facing.push(p);
      continue;
    }
    const snapped = nearestPointOnLine(ls, pt);
    const i = Math.min(snapped.properties.index ?? 0, line.coordinates.length - 2);
    const travel = bearing(point(line.coordinates[i]), point(line.coordinates[i + 1]));
    (angleDiff(travel, p.bearing) <= HEADING_TOLERANCE ? facing : opposite).push(p);
  }
  return { facing, opposite };
}

type DirectionsResponse = {
  code: string;
  message?: string;
  routes: { geometry: GeoJSON.LineString; duration: number; distance: number }[];
};

async function directions(from: [number, number], to: [number, number], extra: Record<string, string> = {}) {
  const coords = `${from.join(",")};${to.join(",")}`;
  const params = new URLSearchParams({
    alternatives: "true",
    geometries: "geojson",
    overview: "full",
    access_token: MAPBOX_TOKEN,
    ...extra,
  });
  const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?${params}`);
  const data = (await res.json()) as DirectionsResponse;
  if (!res.ok || data.code !== "Ok") throw new Error(data.message || "No route found");
  return data.routes;
}

function toOptions(routes: DirectionsResponse["routes"], cams: CameraFC, prefix: string, labels: string[]): RouteOption[] {
  return routes.map((r, i) => {
    const { facing, opposite } = camerasOnRoute(r.geometry, cams);
    return {
      id: `${prefix}-${i}`,
      label: labels[i] ?? `Option ${i + 1}`,
      geometry: r.geometry,
      durationMin: Math.round(r.duration / 60),
      distanceMi: Math.round((r.distance / 1609.34) * 10) / 10,
      facing,
      opposite,
    };
  });
}

export async function planRoutes(from: [number, number], to: [number, number], cams: CameraFC) {
  const routes = await directions(from, to);
  return toOptions(routes, cams, "r", ["Fastest", "Alternate", "Another alternate"]);
}

/** Ask Mapbox for a route that excludes the given camera points. */
export async function avoidRoute(from: [number, number], to: [number, number], avoid: CameraProps[], cams: CameraFC) {
  const byId = new Map(cams.features.map((f) => [f.properties.id, f.geometry.coordinates]));
  const points = avoid
    .slice(0, MAX_EXCLUDES)
    .map((c) => byId.get(c.id))
    .filter((c): c is GeoJSON.Position => Boolean(c))
    .map(([lon, lat]) => `point(${lon.toFixed(6)} ${lat.toFixed(6)})`);
  const routes = await directions(from, to, { exclude: points.join(","), alternatives: "false" });
  return toOptions(routes.slice(0, 1), cams, "avoid", ["Camera-dodging"]);
}

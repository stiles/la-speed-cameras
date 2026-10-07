import distance from "@turf/distance";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import type { CameraFC, HoodFC } from "./mapdata";
import type { CameraProps, StatusKey } from "./types";

export type CorridorSummary = {
  slug: string;
  street: string;
  from: string;
  to: string;
  status: StatusKey;
  hood: string;
  cameras: { id: string; direction: string | null; coordinates: [number, number] }[];
  center: [number, number];
};

export function summarizeCorridors(fc: CameraFC): CorridorSummary[] {
  const map = new Map<string, CorridorSummary>();
  for (const f of fc.features) {
    const p = f.properties as CameraProps;
    const coords = f.geometry.coordinates as [number, number];
    let c = map.get(p.corridor);
    if (!c) {
      c = { slug: p.corridor, street: p.street, from: p.from, to: p.to, status: p.status, hood: p.hood, cameras: [], center: coords };
      map.set(p.corridor, c);
    }
    c.cameras.push({ id: p.id, direction: p.direction, coordinates: coords });
  }
  for (const c of map.values()) {
    const n = c.cameras.length;
    c.center = [
      c.cameras.reduce((s, x) => s + x.coordinates[0], 0) / n,
      c.cameras.reduce((s, x) => s + x.coordinates[1], 0) / n,
    ];
  }
  return Array.from(map.values()).sort((a, b) => a.street.localeCompare(b.street));
}

export function milesBetween(a: [number, number], b: [number, number]) {
  return distance(point(a), point(b), { units: "miles" });
}

export function nearestCorridors(list: CorridorSummary[], at: [number, number], limit = 8) {
  return list
    .map((c) => ({ c, miles: Math.min(...c.cameras.map((x) => milesBetween(at, x.coordinates))) }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, limit);
}

export function hoodAt(fc: HoodFC, at: [number, number]) {
  const pt = point(at);
  return fc.features.find((f) => booleanPointInPolygon(pt, f))?.properties ?? null;
}

export function inBounds([lon, lat]: [number, number], [w, s, e, n]: [number, number, number, number]) {
  return lon >= w && lon <= e && lat >= s && lat <= n;
}

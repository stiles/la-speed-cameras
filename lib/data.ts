import "server-only";
import fs from "node:fs";
import path from "node:path";
import corridorsJson from "@/data/corridors.json";
import neighborhoodsJson from "@/data/neighborhoods.json";
import streetsJson from "@/data/streets.json";
import metaJson from "@/data/meta.json";
import historyJson from "@/data/history.json";
import type { Camera, Corridor, HistoryEntry, Meta, Neighborhood, SearchItem, Street } from "./types";
import { plural } from "./format";

export const corridors = corridorsJson as unknown as Corridor[];
export const neighborhoods = neighborhoodsJson as unknown as Neighborhood[];
export const streets = streetsJson as unknown as Street[];
export const meta = metaJson as unknown as Meta;
export const history = historyJson as unknown as Record<string, HistoryEntry>;

const camerasGeo = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "public/data/cameras.geojson"), "utf8"),
) as GeoJSON.FeatureCollection<GeoJSON.Point, Omit<Camera, "coordinates">>;

const hoodsGeo = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "public/data/neighborhoods.geojson"), "utf8"),
) as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { slug: string; name: string }>;
const hoodGeoMap = new Map(hoodsGeo.features.map((f) => [f.properties.slug, f]));

export const hoodGeometry = (slug: string) => hoodGeoMap.get(slug) ?? null;

export const cameras: Camera[] = camerasGeo.features.map((f) => ({
  ...f.properties,
  coordinates: f.geometry.coordinates as [number, number],
}));

const bySlug = <T extends { slug: string }>(items: T[]) => new Map(items.map((i) => [i.slug, i]));
const corridorMap = bySlug(corridors);
const hoodMap = bySlug(neighborhoods);
const streetMap = bySlug(streets);
const cameraMap = new Map(cameras.map((c) => [c.id, c]));

export const getCorridor = (slug: string) => corridorMap.get(slug);
export const getNeighborhood = (slug: string) => hoodMap.get(slug);
export const getStreet = (slug: string) => streetMap.get(slug);
export const getCamera = (id: string) => cameraMap.get(id);

export function corridorsFor(slugs: string[]) {
  return slugs.map((s) => corridorMap.get(s)).filter((c): c is Corridor => Boolean(c));
}

export function camerasFor(corridorList: Corridor[]) {
  return corridorList.flatMap((c) => c.cameras.map((id) => cameraMap.get(id)).filter((x): x is Camera => Boolean(x)));
}

export function hoodsFor(slugs: string[]) {
  return slugs.map((s) => hoodMap.get(s)).filter((h): h is Neighborhood => Boolean(h));
}

export const districts = Array.from(new Set(corridors.map((c) => c.district))).sort((a, b) => a - b);

export function corridorsInDistrict(n: number) {
  return corridors.filter((c) => c.district === n);
}

export function boundsOf(list: { bbox: [number, number, number, number] }[]): [number, number, number, number] | null {
  if (!list.length) return null;
  return list.reduce<[number, number, number, number]>(
    (acc, { bbox }) => [
      Math.min(acc[0], bbox[0]),
      Math.min(acc[1], bbox[1]),
      Math.max(acc[2], bbox[2]),
      Math.max(acc[3], bbox[3]),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

/** Corridor label used in headings and lists: "Venice Blvd between Lincoln Blvd and Pisani Pl". */
export function corridorLabel(c: Corridor) {
  return `${c.street} between ${c.from} and ${c.to}`;
}

export function hoodName(slug: string) {
  return hoodMap.get(slug)?.name ?? slug;
}

export function searchIndex(): SearchItem[] {
  return [
    ...neighborhoods.map((h) => ({
      kind: "neighborhood" as const,
      label: h.name,
      sub: h.camera_count ? plural(h.camera_count, "camera") : h.in_la_city ? "No cameras" : "Outside LA city",
      href: `/neighborhoods/${h.slug}`,
    })),
    ...streets.map((s) => ({
      kind: "street" as const,
      label: s.name,
      sub: plural(s.camera_count, "camera"),
      href: `/streets/${s.slug}`,
    })),
    ...corridors.map((c) => ({
      kind: "corridor" as const,
      label: `${c.street} at ${c.from}`,
      sub: `to ${c.to}`,
      href: `/cameras/${c.slug}`,
      bbox: c.bbox,
    })),
  ];
}

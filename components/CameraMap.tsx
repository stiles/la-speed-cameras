"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { CITY_BBOX, MAPBOX_STYLE, MAPBOX_TOKEN } from "@/lib/site";
import { loadCameras, loadCorridors } from "@/lib/mapdata";
import { STATUS, directionLabel } from "@/lib/format";
import type { StatusKey } from "@/lib/types";

export type MapController = {
  map: mapboxgl.Map;
  fitBounds: (bbox: [number, number, number, number], maxZoom?: number) => void;
  flyTo: (center: [number, number], zoom?: number) => void;
  setLocation: (center: [number, number] | null) => void;
};

type Props = {
  bounds?: [number, number, number, number];
  outline?: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
  highlight?: string[];
  routes?: GeoJSON.FeatureCollection<GeoJSON.LineString, { index: number; active: boolean }>;
  routeHits?: string[];
  selected?: string | null;
  cooperative?: boolean;
  className?: string;
  label?: string;
  onReady?: (ctrl: MapController) => void;
  onSelect?: (cameraId: string | null) => void;
  onMoveEnd?: (bbox: [number, number, number, number]) => void;
};

const SIREN = "#ff3b1f";
const INK = "#16161d";

const STATUS_FILL: Record<StatusKey, string> = {
  construction: "#ffffff",
  warning: "#fcd34d",
  ticketing: SIREN,
  active: SIREN,
  unknown: "#d4d4d8",
};

function arrowImage(size = 48) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(size / 2, size * 0.12);
  ctx.lineTo(size * 0.82, size * 0.62);
  ctx.lineTo(size / 2, size * 0.5);
  ctx.lineTo(size * 0.18, size * 0.62);
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

function maskFor(outline: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>): GeoJSON.Feature<GeoJSON.Polygon> {
  const world = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];
  const g = outline.geometry;
  const holes = g.type === "Polygon" ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]);
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [world, ...holes] } };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const statusFillExpr = [
  "match",
  ["get", "status"],
  ...Object.entries(STATUS_FILL).flat(),
  "#ffffff",
] as unknown as mapboxgl.ExpressionSpecification;

export default function CameraMap({
  bounds,
  outline,
  highlight,
  routes,
  routeHits,
  selected,
  cooperative = false,
  className = "relative h-full w-full",
  label = "Map of speed camera locations",
  onReady,
  onSelect,
  onMoveEnd,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const callbacks = useRef({ onSelect, onMoveEnd, onReady });
  callbacks.current = { onSelect, onMoveEnd, onReady };

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) {
      console.warn("NEXT_PUBLIC_MAPBOX_TOKEN is not set");
      return;
    }
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: container.current,
      style: MAPBOX_STYLE,
      bounds: bounds ?? CITY_BBOX,
      fitBoundsOptions: { padding: 40, maxZoom: 15 },
      cooperativeGestures: cooperative,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("style.load", async () => {
      const [cams, cors] = await Promise.all([loadCameras(), loadCorridors()]);
      if (mapRef.current !== map) return;
      map.addImage("cam-arrow", arrowImage(), { sdf: true, pixelRatio: 2 });

      if (outline) {
        map.addSource("mask", { type: "geojson", data: maskFor(outline) });
        map.addLayer({ id: "mask", type: "fill", source: "mask", paint: { "fill-color": "#ffffff", "fill-opacity": 0.55 } });
        map.addSource("outline", { type: "geojson", data: outline });
        map.addLayer({
          id: "outline",
          type: "line",
          source: "outline",
          paint: { "line-color": INK, "line-width": 2, "line-dasharray": [2, 1.5] },
        });
      }

      map.addSource("routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "routes-alt",
        type: "line",
        source: "routes",
        filter: ["!", ["get", "active"]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#71717a", "line-width": 5, "line-opacity": 0.55 },
      });
      map.addLayer({
        id: "routes-active",
        type: "line",
        source: "routes",
        filter: ["get", "active"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#2563eb", "line-width": 6 },
      });

      map.addSource("corridors", { type: "geojson", data: cors });
      map.addLayer({
        id: "corridors",
        type: "line",
        source: "corridors",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": SIREN,
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 13, 6, 16, 14],
          "line-opacity": 0.35,
        },
      });

      map.addSource("cameras", { type: "geojson", data: cams, promoteId: "id" });
      map.addLayer({
        id: "cameras-hit",
        type: "circle",
        source: "cameras",
        paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 7, 15, 16], "circle-opacity": 0 },
      });
      map.addLayer({
        id: "cameras",
        type: "circle",
        source: "cameras",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 12, 5.5, 15, 10],
          "circle-color": statusFillExpr,
          "circle-stroke-color": SIREN,
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 9, 1.5, 14, 2.5],
        },
      });
      map.addLayer({
        id: "cameras-arrow",
        type: "symbol",
        source: "cameras",
        minzoom: 12.5,
        filter: ["!=", ["get", "bearing"], null],
        layout: {
          "icon-image": "cam-arrow",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 12.5, 0.45, 16, 0.8],
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
        paint: {
          "icon-color": ["match", ["get", "status"], ["construction", "unknown"], SIREN, "#ffffff"],
        },
      });
      map.addLayer({
        id: "cameras-selected",
        type: "circle",
        source: "cameras",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 8, 15, 18],
          "circle-color": "transparent",
          "circle-stroke-color": INK,
          "circle-stroke-width": 3,
        },
      });

      const popup = new mapboxgl.Popup({ closeButton: true, maxWidth: "280px", offset: 12 });
      map.on("click", "cameras-hit", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as unknown as { id: string; corridor: string; street: string; from: string; to: string; direction: string | null; status: StatusKey; speed_limit: number | null };
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        popup
          .setLngLat(coords)
          .setHTML(
            `<div class="cam-popup"><div class="cam-popup-status">${escapeHtml(STATUS[p.status]?.label ?? "")}</div>` +
              `<strong>${escapeHtml(p.street)}</strong><div>between ${escapeHtml(p.from)} and ${escapeHtml(p.to)}</div>` +
              `<div class="cam-popup-meta">Enforces ${escapeHtml(directionLabel(p.direction === "null" ? null : p.direction))}` +
              (p.speed_limit ? ` · ${p.speed_limit} mph limit` : "") +
              `</div><a href="/cameras/${encodeURIComponent(p.corridor)}">Details and Street View &rarr;</a></div>`,
          )
          .addTo(map);
        callbacks.current.onSelect?.(p.id);
      });
      map.on("mouseenter", "cameras-hit", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "cameras-hit", () => (map.getCanvas().style.cursor = ""));
      map.on("moveend", () => {
        const b = map.getBounds();
        if (b) callbacks.current.onMoveEnd?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      });

      setLoaded(true);
      callbacks.current.onReady?.({
        map,
        fitBounds: (bbox, maxZoom = 15) => map.fitBounds(bbox, { padding: 60, maxZoom, duration: 900 }),
        flyTo: (center, zoom = 14) => map.flyTo({ center, zoom, duration: 900 }),
        setLocation: (center) => {
          markerRef.current?.remove();
          markerRef.current = null;
          if (center) {
            const el = document.createElement("div");
            el.className = "you-are-here";
            markerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(center).addTo(map);
          }
        },
      });
      const b = map.getBounds();
      if (b) callbacks.current.onMoveEnd?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; prop changes are applied in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const ids = highlight ?? routeHits;
    const dimmed = ids && ids.length ? ids : null;
    const corridorFilter = dimmed && highlight ? ["in", ["get", "corridor"], ["literal", highlight]] : null;
    map.setPaintProperty(
      "corridors",
      "line-opacity",
      corridorFilter ? ["case", corridorFilter, 0.55, 0.15] : 0.35,
    );
    const camFilter = routeHits?.length
      ? ["in", ["get", "id"], ["literal", routeHits]]
      : corridorFilter;
    map.setPaintProperty("cameras", "circle-opacity", camFilter ? ["case", camFilter, 1, 0.35] : 1);
    map.setPaintProperty("cameras", "circle-stroke-opacity", camFilter ? ["case", camFilter, 1, 0.35] : 1);
  }, [loaded, highlight, routeHits]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    map.setFilter("cameras-selected", ["==", ["get", "id"], selected ?? ""]);
  }, [loaded, selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const src = map.getSource("routes") as mapboxgl.GeoJSONSource | undefined;
    src?.setData(routes ?? { type: "FeatureCollection", features: [] });
  }, [loaded, routes]);

  return (
    <div className={className}>
      {/* mapbox-gl.css forces position: relative on this node, so size it with h-full rather than inset-0 */}
      <div ref={container} className="h-full w-full" role="region" aria-label={label} />
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 grid place-items-center bg-zinc-100 p-6 text-center text-sm text-zinc-600">
          Map unavailable: set NEXT_PUBLIC_MAPBOX_TOKEN.
        </div>
      )}
    </div>
  );
}

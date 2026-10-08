"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MapClient from "./MapClient";
import SearchBox from "./SearchBox";
import StatusBadge from "./StatusBadge";
import ShareBar from "./ShareBar";
import type { MapController } from "./CameraMap";
import { loadCameras, loadHoods } from "@/lib/mapdata";
import { hoodAt, inBounds, nearestCorridors, summarizeCorridors, type CorridorSummary } from "@/lib/geo";
import { directionLabel, plural } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

type Found = {
  label: string;
  center: [number, number];
  hood: { slug: string; name: string } | null;
  near: { c: CorridorSummary; miles: number }[];
};

type Snap = "peek" | "half" | "full";
const SNAP_CLASS: Record<Snap, string> = {
  peek: "max-lg:h-[150px]",
  half: "max-lg:h-[50%]",
  full: "max-lg:h-full",
};

export default function HomeExplorer() {
  const params = useSearchParams();
  const ctrl = useRef<MapController | null>(null);
  const [corridors, setCorridors] = useState<CorridorSummary[]>([]);
  const [view, setView] = useState<[number, number, number, number] | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [snap, setSnap] = useState<Snap>("peek");
  const drag = useRef<number | null>(null);

  useEffect(() => {
    loadCameras().then((fc) => setCorridors(summarizeCorridors(fc)));
  }, []);

  const goTo = useCallback(
    async (center: [number, number], label: string) => {
      const [hoods, cams] = await Promise.all([loadHoods(), loadCameras()]);
      const list = corridors.length ? corridors : summarizeCorridors(cams);
      const hood = hoodAt(hoods, center);
      const near = nearestCorridors(list, center, 8);
      setFound({ label, center, hood, near });
      setSnap("half");
      ctrl.current?.setLocation(center);
      const [lon, lat] = center;
      const pts = [center, [lon - 0.018, lat - 0.014], [lon + 0.018, lat + 0.014], ...near.slice(0, 3).map((n) => n.c.center)];
      const lons = pts.map((p) => p[0]);
      const lats = pts.map((p) => p[1]);
      const sheet = window.matchMedia("(max-width: 1023px)").matches;
      ctrl.current?.fitBounds(
        [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)],
        13,
        sheet ? { top: 40, right: 30, left: 30, bottom: Math.max(440, window.innerHeight * 0.64) * 0.5 + 20 } : { top: 60, right: 60, bottom: 60, left: 460 },
      );
    },
    [corridors],
  );

  const pendingAt = useRef<{ center: [number, number]; label: string } | null>(null);
  const handledAt = useRef<string | null>(null);
  useEffect(() => {
    const at = params.get("at");
    if (!at || handledAt.current === at) return;
    handledAt.current = at;
    const [lon, lat] = at.split(",").map(Number);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      pendingAt.current = { center: [lon, lat], label: params.get("label") || "That spot" };
      if (ctrl.current) {
        goTo(pendingAt.current.center, pendingAt.current.label);
        pendingAt.current = null;
      }
    }
  }, [params, goTo]);

  const inView = useMemo(() => {
    if (!view) return corridors;
    return corridors.filter((c) => c.cameras.some((cam) => inBounds(cam.coordinates, view)));
  }, [corridors, view]);

  const cameraCount = inView.reduce((n, c) => n + c.cameras.length, 0);

  function focusCorridor(c: CorridorSummary) {
    setSelected(c.cameras[0]?.id ?? null);
    ctrl.current?.flyTo(c.center, 16);
    setSnap("peek");
  }

  return (
    <div className="relative h-[64dvh] min-h-[440px] w-full overflow-hidden lg:h-[78vh]">
      <MapClient
        className="absolute inset-0"
        selected={selected}
        onSelect={setSelected}
        onMoveEnd={setView}
        onReady={(c) => {
          ctrl.current = c;
          if (pendingAt.current) {
            goTo(pendingAt.current.center, pendingAt.current.label);
            pendingAt.current = null;
          }
        }}
      />

      <div
        className={`absolute z-20 flex flex-col bg-white shadow-2xl transition-[height] duration-300 max-lg:inset-x-0 max-lg:bottom-0 max-lg:rounded-t-xl lg:bottom-4 lg:left-4 lg:top-4 lg:w-[400px] lg:rounded-xl ${SNAP_CLASS[snap]}`}
      >
        <button
          type="button"
          aria-label={snap === "full" ? "Collapse list" : "Expand list"}
          className="mx-auto mt-2 h-6 w-full touch-none lg:hidden"
          onClick={() => setSnap((s) => (s === "peek" ? "half" : s === "half" ? "full" : "peek"))}
          onPointerDown={(e) => (drag.current = e.clientY)}
          onPointerUp={(e) => {
            if (drag.current === null) return;
            const dy = e.clientY - drag.current;
            drag.current = null;
            if (Math.abs(dy) < 30) return;
            setSnap((s) => (dy < 0 ? (s === "peek" ? "half" : "full") : s === "full" ? "half" : "peek"));
          }}
        >
          <span className="mx-auto block h-1.5 w-12 rounded-full bg-zinc-300" />
        </button>

        <div className="px-4 pb-3 lg:pt-4">
          <SearchBox
            placeholder="Your neighborhood, street or address"
            onLocation={(center, label) => goTo(center, label)}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          {found ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-ink p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-widest text-siren">Near {found.label}</p>
                {found.hood ? (
                  <p className="mt-1 text-lg">
                    You&rsquo;re in{" "}
                    <Link href={`/neighborhoods/${found.hood.slug}`} className="font-bold underline decoration-siren">
                      {found.hood.name}
                    </Link>
                    .{" "}
                    {found.near[0] && found.near[0].miles < 0.25
                      ? "There's a camera right around the corner."
                      : found.near[0]
                        ? `The closest camera is ${found.near[0].miles.toFixed(1)} miles away.`
                        : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-lg">That spot is outside the neighborhoods we cover.</p>
                )}
                <button type="button" onClick={() => { setFound(null); ctrl.current?.setLocation(null); }} className="mt-2 text-sm text-white/70 underline">
                  Clear
                </button>
              </div>
              <ul className="divide-y divide-zinc-100">
                {found.near.map(({ c, miles }) => (
                  <CorridorRow key={c.slug} c={c} onFocus={focusCorridor} extra={`${miles.toFixed(1)} mi`} />
                ))}
              </ul>
              {found.hood && (
                <ShareBar
                  variant="card"
                  url={`${SITE_URL}/${found.hood.slug}`}
                  text={`Just found out where the speed cameras are near ${found.hood.name}. Watch your rear end:`}
                  heading="Now warn your group chat"
                  sub="Friends don't let friends get flashed."
                  page="home:search"
                />
              )}
            </div>
          ) : (
            <>
              <p className="mb-2 text-sm text-zinc-600">
                <strong className="text-ink">{plural(cameraCount, "camera")}</strong> on{" "}
                {plural(inView.length, "corridor")} in this view
              </p>
              <ul className="divide-y divide-zinc-100">
                {inView.slice(0, 60).map((c) => (
                  <CorridorRow key={c.slug} c={c} onFocus={focusCorridor} />
                ))}
              </ul>
              {inView.length > 60 && (
                <p className="pt-3 text-sm text-zinc-500">
                  Zoom in to narrow it down, or see the <Link href="/list" className="underline">full list</Link>.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CorridorRow({ c, onFocus, extra }: { c: CorridorSummary; onFocus: (c: CorridorSummary) => void; extra?: string }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <button type="button" onClick={() => onFocus(c)} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{c.street}</span>
          <StatusBadge status={c.status} short />
        </span>
        <span className="block truncate text-sm text-zinc-600">
          {c.from} to {c.to}
        </span>
        <span className="block text-xs text-zinc-500">
          {c.cameras.map((x) => directionLabel(x.direction)).join(", ")}
          {extra ? ` · ${extra}` : ""}
        </span>
      </button>
      <Link href={`/cameras/${c.slug}`} className="shrink-0 pt-1 text-sm font-medium text-zinc-500 hover:text-ink" aria-label={`Details for ${c.street} between ${c.from} and ${c.to}`}>
        Details
      </Link>
    </li>
  );
}

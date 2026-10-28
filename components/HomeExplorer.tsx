"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import MapClient from "./MapClient";
import SearchBox from "./SearchBox";
import Legend from "./Legend";
import type { MapController } from "./CameraMap";
import { loadCameras, loadHoods } from "@/lib/mapdata";
import { hoodAt, nearestCorridors, summarizeCorridors, type CorridorSummary } from "@/lib/geo";
import { spellPlural } from "@/lib/format";
import type { SearchItem, StatusKey } from "@/lib/types";

type Found = {
  label: string;
  center: [number, number];
  hood: { slug: string; name: string } | null;
  near: { c: CorridorSummary; miles: number }[];
};

// Leave room for the search box on top and the result card (bottom on phones, left on desktop).
function cardPadding() {
  return window.matchMedia("(max-width: 1023px)").matches
    ? { top: 80, right: 50, left: 30, bottom: 170 }
    : { top: 60, right: 60, bottom: 60, left: 460 };
}

export default function HomeExplorer({ counts }: { counts: Partial<Record<StatusKey, number>> }) {
  const params = useSearchParams();
  const router = useRouter();
  const ctrl = useRef<MapController | null>(null);
  const [corridors, setCorridors] = useState<CorridorSummary[]>([]);
  const [found, setFound] = useState<Found | null>(null);
  const [street, setStreet] = useState<SearchItem | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    loadCameras().then((fc) => setCorridors(summarizeCorridors(fc)));
  }, []);

  const goTo = useCallback(
    async (center: [number, number], label: string) => {
      const [hoods, cams] = await Promise.all([loadHoods(), loadCameras()]);
      const list = corridors.length ? corridors : summarizeCorridors(cams);
      const hood = hoodAt(hoods, center);
      const near = nearestCorridors(list, center, 3);
      setStreet(null);
      setFound({ label, center, hood, near });
      ctrl.current?.setLocation(center);
      const [lon, lat] = center;
      const pts = [center, [lon - 0.018, lat - 0.014], [lon + 0.018, lat + 0.014], ...near.map((n) => n.c.center)];
      const lons = pts.map((p) => p[0]);
      const lats = pts.map((p) => p[1]);
      ctrl.current?.fitBounds([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], 13, cardPadding());
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

  // Streets stay on the home map; everything else opens its page.
  function chooseItem(item: SearchItem) {
    if (item.kind !== "street" || !item.bbox || !item.corridors) {
      router.push(item.href);
      return;
    }
    setFound(null);
    setSelected(null);
    ctrl.current?.setLocation(null);
    setStreet(item);
    ctrl.current?.fitBounds(item.bbox, 15, cardPadding());
  }

  function focusCorridor(c: CorridorSummary) {
    setSelected(c.cameras[0]?.id ?? null);
    ctrl.current?.flyTo(c.center, 16);
  }

  function clear() {
    setFound(null);
    setStreet(null);
    setSelected(null);
    ctrl.current?.setLocation(null);
  }

  const streetCorridors = street ? corridors.filter((c) => street.corridors?.includes(c.slug)) : [];
  const streetCameras = streetCorridors.reduce((n, c) => n + c.cameras.length, 0);
  const card =
    "absolute inset-x-3 bottom-9 z-20 max-h-[50%] overflow-y-auto overscroll-contain rounded-lg bg-white p-3 lg:p-4 shadow-2xl ring-1 ring-black/10 lg:bottom-auto lg:left-4 lg:right-auto lg:top-[5.25rem] lg:max-h-[calc(100%-240px)] lg:w-[25rem]";

  return (
    <div className="relative h-[60dvh] min-h-[420px] w-full lg:h-[74vh]">
      <MapClient
        className="absolute inset-0"
        selected={selected}
        highlight={street?.corridors}
        onSelect={setSelected}
        cooperative
        controls="bottom-right"
        onReady={(c) => {
          ctrl.current = c;
          if (pendingAt.current) {
            goTo(pendingAt.current.center, pendingAt.current.label);
            pendingAt.current = null;
          }
        }}
      />

      <div className="absolute inset-x-3 top-3 z-30 lg:left-4 lg:right-auto lg:top-4 lg:w-[25rem]">
        <SearchBox
          placeholder="Street or address"
          onLocation={(center, label) => goTo(center, label)}
          onItem={chooseItem}
        />
      </div>

      {found ? (
        <div className={card}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-xs font-bold uppercase tracking-widest text-siren">Near {found.label}</p>
            <button type="button" onClick={clear} className="shrink-0 text-sm text-zinc-500 underline hover:text-ink">
              Clear
            </button>
          </div>
          <p className="mt-1 text-base leading-snug">
            {found.hood ? (
              <>
                You&rsquo;re in <strong>{found.hood.name}</strong>.{" "}
              </>
            ) : (
              "That spot is outside the neighborhoods we cover. "
            )}
            {found.near[0] && found.near[0].miles < 0.25
              ? `There's a camera right around the corner on ${found.near[0].c.street}.`
              : found.near[0]
                ? `The closest camera is ${found.near[0].miles.toFixed(1)} miles away on ${found.near[0].c.street}.`
                : ""}
          </p>
          <ul className="mt-2 divide-y max-lg:hidden divide-zinc-100 border-t border-zinc-100">
            {found.near.map(({ c, miles }) => (
              <li key={c.slug} className="flex items-baseline gap-3 py-2 text-sm">
                <button type="button" onClick={() => focusCorridor(c)} className="min-w-0 flex-1 truncate text-left">
                  <span className="font-semibold">{c.street}</span>{" "}
                  <span className="text-zinc-600">
                    {c.from} to {c.to}
                  </span>
                </button>
                <span className="shrink-0 tabular-nums text-zinc-500">{miles.toFixed(1)} mi</span>
              </li>
            ))}
          </ul>
          {found.hood && (
            <Link
              href={`/neighborhoods/${found.hood.slug}`}
              className="mt-2 inline-block rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-asphalt"
            >
              {found.hood.name}&rsquo;s cameras &rarr;
            </Link>
          )}
        </div>
      ) : street ? (
        <div className={card}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-xs font-bold uppercase tracking-widest text-siren">Street</p>
            <button type="button" onClick={clear} className="shrink-0 text-sm text-zinc-500 underline hover:text-ink">
              Clear
            </button>
          </div>
          <p className="mt-1 text-base leading-snug">
            <strong>{street.label}</strong>
            {streetCorridors.length > 0 &&
              ` has ${spellPlural(streetCameras, "camera")} at ${spellPlural(streetCorridors.length, "location")}.`}
          </p>
          <ul className="mt-2 divide-y max-lg:hidden divide-zinc-100 border-t border-zinc-100">
            {streetCorridors.map((c) => (
              <li key={c.slug} className="py-2 text-sm">
                <button type="button" onClick={() => focusCorridor(c)} className="w-full truncate text-left">
                  <span className="font-semibold">{c.from}</span> <span className="text-zinc-600">to {c.to}</span>
                </button>
              </li>
            ))}
          </ul>
          <Link
            href={street.href}
            className="mt-2 inline-block rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-asphalt"
          >
            All cameras on {street.label} &rarr;
          </Link>
        </div>
      ) : null}

      <Legend counts={counts} overlay className={found || street ? "max-lg:hidden" : ""} />
    </div>
  );
}

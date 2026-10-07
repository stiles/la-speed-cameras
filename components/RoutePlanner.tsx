"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";
import MapClient from "./MapClient";
import SearchBox from "./SearchBox";
import ShareBar from "./ShareBar";
import type { MapController } from "./CameraMap";
import { loadCameras } from "@/lib/mapdata";
import { avoidRoute, planRoutes, type RouteOption } from "@/lib/route";
import { directionLabel, plural } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

type End = { center: [number, number]; label: string };

function parseEnd(v: string | null, label: string | null): End | null {
  if (!v) return null;
  const [lon, lat] = v.split(",").map(Number);
  return Number.isFinite(lon) && Number.isFinite(lat) ? { center: [lon, lat], label: label || "Pinned spot" } : null;
}

export default function RoutePlanner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ctrl = useRef<MapController | null>(null);
  const [from, setFrom] = useState<End | null>(() => parseEnd(params.get("from"), params.get("fl")));
  const [to, setTo] = useState<End | null>(() => parseEnd(params.get("to"), params.get("tl")));
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avoiding, setAvoiding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    const q = new URLSearchParams({
      from: from.center.map((v) => v.toFixed(5)).join(","),
      fl: from.label,
      to: to.center.map((v) => v.toFixed(5)).join(","),
      tl: to.label,
    });
    router.replace(`${pathname}?${q}`, { scroll: false });

    let cancelled = false;
    setLoading(true);
    setError(null);
    loadCameras()
      .then((cams) => planRoutes(from.center, to.center, cams))
      .then((opts) => {
        if (cancelled) return;
        setOptions(opts);
        setActive(opts[0]?.id ?? null);
        track("route_check", { routes: opts.length, cameras: opts[0]?.facing.length ?? 0 });
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [from, to, pathname, router]);

  const current = options.find((o) => o.id === active) ?? null;

  useEffect(() => {
    if (!current || !ctrl.current) return;
    const lons = current.geometry.coordinates.map((c) => c[0]);
    const lats = current.geometry.coordinates.map((c) => c[1]);
    ctrl.current.fitBounds([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], 15);
  }, [current]);

  const routesFC = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: options.map((o, i) => ({
        type: "Feature" as const,
        geometry: o.geometry,
        properties: { index: i, active: o.id === active },
      })),
    }),
    [options, active],
  );

  async function dodge() {
    if (!from || !to || !current) return;
    setAvoiding(true);
    setError(null);
    try {
      const cams = await loadCameras();
      const [opt] = await avoidRoute(from.center, to.center, current.facing, cams);
      track("route_avoid", { before: current.facing.length, after: opt.facing.length });
      setOptions((prev) => [...prev.filter((o) => !o.id.startsWith("avoid")), opt]);
      setActive(opt.id);
    } catch (e) {
      setError(`Couldn't find a route around them: ${(e as Error).message}. Try one of the alternates.`);
    } finally {
      setAvoiding(false);
    }
  }

  const fewest = options.length ? Math.min(...options.map((o) => o.facing.length)) : 0;
  const shareUrl = typeof window !== "undefined" && from && to ? `${SITE_URL}/route?${new URLSearchParams({
    from: from.center.map((v) => v.toFixed(4)).join(","),
    fl: from.label,
    to: to.center.map((v) => v.toFixed(4)).join(","),
    tl: to.label,
  })}` : `${SITE_URL}/route`;

  return (
    <div className="grid lg:grid-cols-[420px_1fr]">
      <div className="space-y-5 border-zinc-200 bg-paper p-4 lg:max-h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:border-r">
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">From</label>
          <SearchBox
            placesOnly
            placeholder="Home, an address or a place"
            ariaLabel="Starting point"
            defaultValue={from?.label ?? ""}
            onLocation={(center, label) => setFrom({ center, label })}
          />
          <label className="block pt-2 text-xs font-bold uppercase tracking-widest text-zinc-500">To</label>
          <SearchBox
            placesOnly
            showLocate={false}
            placeholder="Work, school, the beach"
            ariaLabel="Destination"
            defaultValue={to?.label ?? ""}
            onLocation={(center, label) => setTo({ center, label })}
          />
        </div>

        {loading && <p className="text-sm text-zinc-600">Scouting the route...</p>}
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        {!from || !to ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-zinc-700 ring-1 ring-zinc-200">
            Enter where you start and where you&rsquo;re headed. We&rsquo;ll check the fastest route and a couple of
            alternates for speed cameras, counting only the ones that enforce your direction of travel.
          </div>
        ) : null}

        {options.length > 0 && (
          <div className="space-y-2">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setActive(o.id)}
                className={`w-full rounded-2xl bg-white p-4 text-left ring-1 transition ${o.id === active ? "ring-2 ring-blue-600" : "ring-zinc-200 hover:ring-ink"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{o.label}</span>
                  <span className="text-sm text-zinc-600">
                    {o.durationMin} min · {o.distanceMi} mi
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`font-display text-2xl font-extrabold ${o.facing.length ? "text-siren" : "text-emerald-600"}`}>
                    {o.facing.length}
                  </span>
                  <span className="text-sm text-zinc-700">
                    {o.facing.length === 1 ? "camera facing your direction" : "cameras facing your direction"}
                    {o.facing.length === fewest && options.length > 1 && fewest < Math.max(...options.map((x) => x.facing.length)) ? " · fewest" : ""}
                  </span>
                </div>
                {o.opposite.length > 0 && (
                  <p className="text-xs text-zinc-500">
                    Plus {plural(o.opposite.length, "camera")} for oncoming traffic. Those are your drive home.
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {current && current.facing.length > 0 && !current.id.startsWith("avoid") && (
          <button
            type="button"
            onClick={dodge}
            disabled={avoiding}
            className="w-full rounded-full bg-siren px-5 py-3 font-bold text-white hover:bg-siren-dark disabled:opacity-60"
          >
            {avoiding ? "Plotting an escape..." : "Find a route that dodges them"}
          </button>
        )}

        {current && current.facing.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-lg font-bold">On this route</h2>
            <ul className="divide-y divide-zinc-200 rounded-2xl bg-white ring-1 ring-zinc-200">
              {current.facing.map((c) => (
                <li key={c.id} className="p-3 text-sm">
                  <Link href={`/cameras/${c.corridor}`} className="font-semibold hover:underline">
                    {c.street}
                  </Link>{" "}
                  between {c.from} and {c.to}
                  <span className="block text-xs text-zinc-500">
                    Enforces {directionLabel(c.direction)}
                    {c.speed_limit ? ` · ${c.speed_limit} mph limit, flagged at ${c.speed_limit + 11}+` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {current && current.facing.length === 0 && (
          <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
            Clean run. No cameras facing your direction on this route. Still, the speed limit is the speed limit.
          </p>
        )}

        {current && from && to && (
          <ShareBar
            url={shareUrl}
            text={
              current.facing.length
                ? `My commute passes ${plural(current.facing.length, "speed camera")}. Check yours:`
                : "My commute is speed-camera-free. Check yours:"
            }
            heading="Carpool buddies deserve to know"
            sub="Send your route to whoever drives it with you."
            page="route"
          />
        )}

        <p className="text-xs text-zinc-500">
          Routes and drive times come from Mapbox and don&rsquo;t reflect live traffic. A camera counts as on your
          route if it&rsquo;s within about 80 feet of it. Please don&rsquo;t use this while driving.
        </p>
      </div>

      <div className="relative h-[60vh] lg:h-[calc(100dvh-3.5rem)]">
        <MapClient
          className="absolute inset-0"
          routes={routesFC}
          routeHits={current ? current.facing.map((c) => c.id) : undefined}
          onReady={(c) => (ctrl.current = c)}
          label="Map of your route and the speed cameras on it"
        />
      </div>
    </div>
  );
}

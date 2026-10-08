"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { track } from "@/lib/analytics";
import { geocode, type Place } from "@/lib/geocode";
import type { SearchItem } from "@/lib/types";

type Result =
  | { type: "item"; item: SearchItem }
  | { type: "place"; place: Place };

type Props = {
  placeholder?: string;
  size?: "lg" | "md";
  autoFocus?: boolean;
  /** Called for addresses and "use my location". Without it, addresses open the home map. */
  onLocation?: (center: [number, number], label: string) => void;
  /** Called for local matches. Without it, they navigate to their page. */
  onItem?: (item: SearchItem) => void;
  /** Only search addresses (route planner inputs). */
  placesOnly?: boolean;
  showLocate?: boolean;
  defaultValue?: string;
  ariaLabel?: string;
  onQuery?: (q: string) => void;
};

let indexPromise: Promise<SearchItem[]> | null = null;
const loadIndex = () => (indexPromise ??= fetch("/search-index.json").then((r) => r.json()));

const KIND_LABEL: Record<SearchItem["kind"], string> = {
  neighborhood: "Neighborhood",
  street: "Street",
  corridor: "Camera",
};

export default function SearchBox({
  placeholder = "Search a neighborhood, street or address",
  size = "md",
  autoFocus = false,
  onLocation,
  onItem,
  placesOnly = false,
  showLocate = true,
  defaultValue = "",
  ariaLabel = "Search for speed cameras",
  onQuery,
}: Props) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [locating, setLocating] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const tracked = useRef(false);

  useEffect(() => setQ(defaultValue), [defaultValue]);

  const fuse = useMemo(
    () => (items ? new Fuse(items, { keys: ["label"], threshold: 0.32, ignoreLocation: true }) : null),
    [items],
  );

  const local = useMemo(() => {
    if (placesOnly || !fuse || q.trim().length < 2) return [];
    return fuse
      .search(q.trim(), { limit: 12 })
      .map((r) => r.item)
      .sort((a, b) => (a.kind === "corridor" ? 1 : 0) - (b.kind === "corridor" ? 1 : 0))
      .slice(0, 6);
  }, [fuse, q, placesOnly]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3 || term === defaultValue) {
      setPlaces([]);
      return;
    }
    const t = setTimeout(async () => {
      abort.current?.abort();
      abort.current = new AbortController();
      try {
        setPlaces(await geocode(term, abort.current.signal));
      } catch {
        /* aborted */
      }
    }, 280);
    return () => clearTimeout(t);
  }, [q, defaultValue]);

  const results: Result[] = [
    ...local.map((item) => ({ type: "item" as const, item })),
    ...places.map((place) => ({ type: "place" as const, place })),
  ];

  function choose(r: Result) {
    setOpen(false);
    if (r.type === "item") {
      track("search", { kind: r.item.kind, label: r.item.label });
      setQ(r.item.label);
      if (onItem) onItem(r.item);
      else router.push(r.item.href);
      return;
    }
    track("search", { kind: "address" });
    setQ(r.place.label);
    if (onLocation) onLocation(r.place.center, r.place.label);
    else router.push(`/?at=${r.place.center.map((v) => v.toFixed(5)).join(",")}&label=${encodeURIComponent(r.place.label)}`);
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const center: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        track("search", { kind: "locate" });
        setQ("My location");
        if (onLocation) onLocation(center, "My location");
        else router.push(`/?at=${center.map((v) => v.toFixed(5)).join(",")}&label=My%20location`);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const big = size === "lg";

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-2xl bg-white shadow-lg ring-1 ring-black/10 focus-within:ring-2 focus-within:ring-siren ${big ? "p-2" : "p-1.5"}`}
      >
        <svg viewBox="0 0 24 24" className={`ml-2 shrink-0 text-zinc-400 ${big ? "size-6" : "size-5"}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          value={q}
          placeholder={placeholder}
          onFocus={() => {
            if (!placesOnly) loadIndex().then(setItems);
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQ(e.target.value);
            onQuery?.(e.target.value);
            setOpen(true);
            setActive(0);
            if (!tracked.current) {
              tracked.current = true;
              track("search_start");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              choose(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-400 ${big ? "py-2 text-lg" : "py-1.5 text-base"}`}
        />
        {showLocate && (
          <button
            type="button"
            onClick={locate}
            className="shrink-0 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-asphalt"
            aria-label="Use my location"
          >
            {locating ? "Finding you..." : "Near me"}
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-[60vh] overflow-auto rounded-2xl bg-white py-2 text-ink shadow-2xl ring-1 ring-black/10"
        >
          {results.map((r, i) => {
            const label = r.type === "item" ? r.item.label : r.place.label;
            const sub = r.type === "item" ? r.item.sub : r.place.sub;
            const kind = r.type === "item" ? KIND_LABEL[r.item.kind] : "Address";
            return (
              <li
                key={`${kind}-${label}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-baseline gap-3 px-4 py-2 ${i === active ? "bg-zinc-100" : ""}`}
              >
                <span className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-wide text-zinc-400">{kind}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{label}</span>
                  {sub && <span className="block truncate text-xs text-zinc-500">{sub}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

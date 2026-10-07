"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { StatusKey } from "@/lib/types";

export type Row = {
  slug: string;
  street: string;
  from: string;
  to: string;
  hoods: string;
  district: number;
  speed_limit: number | null;
  cameras: number;
  directions: string;
  status: StatusKey;
};

type Key = "street" | "hoods" | "district" | "speed_limit" | "cameras" | "status";

const COLS: { key: Key; label: string; className?: string }[] = [
  { key: "street", label: "Street" },
  { key: "hoods", label: "Neighborhood", className: "max-md:hidden" },
  { key: "district", label: "District", className: "max-sm:hidden text-right" },
  { key: "speed_limit", label: "Limit", className: "text-right" },
  { key: "cameras", label: "Cameras", className: "max-sm:hidden text-right" },
  { key: "status", label: "Status" },
];

export default function ListTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "street", dir: 1 });

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term
      ? rows.filter((r) => `${r.street} ${r.from} ${r.to} ${r.hoods} district ${r.district}`.toLowerCase().includes(term))
      : rows;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return cmp * sort.dir;
    });
  }, [rows, q, sort]);

  return (
    <div>
      <label className="mb-3 block">
        <span className="sr-only">Filter the list</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by street, cross street, neighborhood or district"
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 outline-none focus:border-ink"
        />
      </label>
      <p className="mb-2 text-sm text-zinc-500" aria-live="polite">
        Showing {shown.length} of {rows.length} locations
      </p>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-zinc-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-3 py-2.5 font-semibold ${c.className ?? ""}`}
                  aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 uppercase hover:text-ink"
                    onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : 1 }))}
                  >
                    {c.label}
                    <span aria-hidden>{sort.key === c.key ? (sort.dir === 1 ? "↑" : "↓") : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {shown.map((r) => (
              <tr key={r.slug} className="hover:bg-zinc-50">
                <td className="px-3 py-2.5">
                  <Link href={`/cameras/${r.slug}`} className="font-semibold hover:underline">
                    {r.street}
                  </Link>
                  <div className="text-xs text-zinc-500">
                    {r.from} to {r.to} · {r.directions}
                  </div>
                </td>
                <td className="px-3 py-2.5 max-md:hidden">{r.hoods}</td>
                <td className="px-3 py-2.5 text-right max-sm:hidden">{r.district}</td>
                <td className="px-3 py-2.5 text-right">{r.speed_limit ?? "–"}</td>
                <td className="px-3 py-2.5 text-right max-sm:hidden">{r.cameras}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={r.status} short />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

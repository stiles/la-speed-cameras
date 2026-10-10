import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { streets } from "@/lib/data";

export const metadata: Metadata = pageMeta({
  title: "Speed cameras by street",
  description: "Every Los Angeles street with a speed camera, from Venice Blvd to Victory Blvd, with exact blocks and directions.",
  path: "/streets",
});

export default function StreetsIndex() {
  const sorted = [...streets].sort((a, b) => b.camera_count - a.camera_count || a.name.localeCompare(b.name));
  return (
    <>
      <PageHeader
        kicker="Streets"
        title="Speed cameras by street"
        lede={`${streets.length} streets get at least one camera. Some get a lot more than one.`}
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((s) => (
            <li key={s.slug}>
              <Link href={`/streets/${s.slug}`} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-zinc-200 hover:ring-ink">
                <span className="font-semibold">{s.name}</span>
                <span className="text-sm text-zinc-500">
                  {s.camera_count} camera{s.camera_count === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

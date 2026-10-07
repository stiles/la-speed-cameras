import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import MapClient from "@/components/MapClient";
import CameraList from "@/components/CameraList";
import ShareBar from "@/components/ShareBar";
import Caveat from "@/components/Caveat";
import Legend from "@/components/Legend";
import { boundsOf, corridorsInDistrict, districts, hoodsFor } from "@/lib/data";
import { plural } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return districts.map((d) => ({ n: String(d) }));
}

type Params = { params: Promise<{ n: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { n } = await params;
  const list = corridorsInDistrict(Number(n));
  const count = list.reduce((s, c) => s + c.cameras.length, 0);
  return {
    title: `Speed cameras in LA Council District ${n}`,
    description: `All ${count} speed cameras in Los Angeles City Council District ${n}, by street and neighborhood.`,
    alternates: { canonical: `/council-districts/${n}` },
  };
}

export default async function DistrictPage({ params }: Params) {
  const { n } = await params;
  const d = Number(n);
  const list = corridorsInDistrict(d);
  if (!list.length) notFound();
  const count = list.reduce((s, c) => s + c.cameras.length, 0);
  const hoods = hoodsFor(Array.from(new Set(list.flatMap((c) => c.hoods)))).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/council-districts", label: "Council districts" }]}
        kicker="Council district"
        title={`District ${d}`}
        lede={`${plural(count, "camera")} at ${list.length} locations.`}
      />
      <div className="relative h-[50vh] min-h-[320px] border-b border-zinc-200">
        <MapClient className="absolute inset-0" bounds={boundsOf(list)!} highlight={list.map((c) => c.slug)} cooperative label={`Map of speed cameras in Council District ${d}`} />
      </div>
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
        <Legend />
        <CameraList corridors={list} />
        <section>
          <h2 className="mb-2 font-display text-xl font-bold">Neighborhoods with cameras in District {d}</h2>
          <ul className="flex flex-wrap gap-2">
            {hoods.map((h) => (
              <li key={h.slug}>
                <Link href={`/neighborhoods/${h.slug}`} className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm hover:border-ink">
                  {h.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <ShareBar url={`${SITE_URL}/council-districts/${d}`} text={`Council District ${d} has ${plural(count, "speed camera")}. Here's where.`} page={`district:${d}`} />
        <Caveat />
      </div>
    </>
  );
}

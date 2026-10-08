import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import MapClient from "@/components/MapClient";
import CameraList from "@/components/CameraList";
import ShareBar from "@/components/ShareBar";
import Caveat from "@/components/Caveat";
import Legend from "@/components/Legend";
import JsonLd, { breadcrumbs } from "@/components/JsonLd";
import { boundsOf, corridorsFor, getStreet, hoodsFor, streets } from "@/lib/data";
import { listJoin, plural } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return streets.map((s) => ({ slug: s.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const s = getStreet(slug);
  if (!s) return {};
  const hoods = hoodsFor(s.hoods).map((h) => h.name);
  const title = `${s.name} speed cameras: ${plural(s.camera_count, "camera")} in Los Angeles`;
  return {
    title,
    description: `Where the speed cameras are on ${s.name}${hoods.length ? ` in ${listJoin(hoods.slice(0, 4))}` : ""}: exact blocks, directions enforced and status.`,
    alternates: { canonical: `/streets/${s.slug}` },
    openGraph: { title, url: `/streets/${s.slug}` },
  };
}

export default async function StreetPage({ params }: Params) {
  const { slug } = await params;
  const s = getStreet(slug);
  if (!s) notFound();
  const list = corridorsFor(s.corridors);
  const hoods = hoodsFor(s.hoods);
  const bounds = boundsOf(list)!;
  const lede =
    list.length === 1
      ? `${s.name} has ${plural(s.camera_count, "camera")}, between ${list[0].from} and ${list[0].to}.`
      : `${s.name} has ${plural(s.camera_count, "camera")} on ${list.length} different stretches${hoods.length ? `, running through ${listJoin(hoods.slice(0, 5).map((h) => h.name))}` : ""}.`;

  return (
    <>
      <JsonLd
        data={breadcrumbs(
          [
            { name: "Home", path: "/" },
            { name: "Streets", path: "/streets" },
            { name: s.name, path: `/streets/${s.slug}` },
          ],
          SITE_URL,
        )}
      />
      <PageHeader
        crumbs={[{ href: "/streets", label: "Streets" }]}
        kicker="Street"
        title={`Speed cameras on ${s.name}`}
        lede={lede}
      />
      <div className="relative h-[50vh] min-h-[320px] border-b border-zinc-200">
        <MapClient className="absolute inset-0" bounds={bounds} highlight={s.corridors} cooperative label={`Map of speed cameras on ${s.name}`} />
      </div>
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
        <Legend />
        <CameraList corridors={list} />
        {hoods.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-xl font-bold">Neighborhoods along {s.name}</h2>
            <ul className="flex flex-wrap gap-2">
              {hoods.map((h) => (
                <li key={h.slug}>
                  <Link href={`/neighborhoods/${h.slug}`} className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm hover:border-ink">
                    {h.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ShareBar
          url={`${SITE_URL}/streets/${s.slug}`}
          text={`Heads up: ${s.name} has ${plural(s.camera_count, "speed camera")}. Here's exactly where.`}
          page={`street:${s.slug}`}
          heading={`Who do you know that flies down ${s.name}?`}
        />
        <Caveat />
      </div>
    </>
  );
}

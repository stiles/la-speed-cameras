import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import MapClient from "@/components/MapClient";
import ShareBar from "@/components/ShareBar";
import Caveat from "@/components/Caveat";
import StatusBadge from "@/components/StatusBadge";
import CameraList from "@/components/CameraList";
import JsonLd, { breadcrumbs } from "@/components/JsonLd";
import { corridorLabel, corridors, getCamera, getCorridor, getStreet, history, hoodsFor } from "@/lib/data";
import { STATUS, addDays, apDate, directionLabel, listJoin, streetViewUrl } from "@/lib/format";
import { REPORT_URL, SITE_URL } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return corridors.map((c) => ({ slug: c.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const c = getCorridor(slug);
  if (!c) return {};
  const hoods = hoodsFor(c.hoods).map((h) => h.name);
  const title = `Speed camera on ${corridorLabel(c)}`;
  return {
    title,
    description: `${c.street} speed camera${c.cameras.length > 1 ? "s" : ""} between ${c.from} and ${c.to}${hoods.length ? ` in ${listJoin(hoods)}` : ""}, Los Angeles. ${STATUS[c.status].label}. ${c.speed_limit ? `${c.speed_limit} mph limit.` : ""}`,
    alternates: { canonical: `/cameras/${c.slug}` },
    openGraph: { title, url: `/cameras/${c.slug}` },
  };
}

export default async function CorridorPage({ params }: Params) {
  const { slug } = await params;
  const c = getCorridor(slug);
  if (!c) notFound();
  const cams = c.cameras.map(getCamera).filter((x) => x !== undefined);
  const hoods = hoodsFor(c.hoods);
  const street = getStreet(c.street_slug);
  const siblings = street ? street.corridors.filter((s) => s !== c.slug).map(getCorridor).filter((x) => x !== undefined) : [];
  const changedAt = cams.map((cam) => history[cam.id]?.status_changed_at).find(Boolean) ?? null;
  const warningEnds = (c.status === "warning" || c.status === "active") && changedAt ? addDays(changedAt, 60) : null;
  const pad = 0.004;
  const bounds: [number, number, number, number] = [c.bbox[0] - pad, c.bbox[1] - pad, c.bbox[2] + pad, c.bbox[3] + pad];

  return (
    <>
      <JsonLd
        data={breadcrumbs(
          [
            { name: "Home", path: "/" },
            ...(street ? [{ name: street.name, path: `/streets/${street.slug}` }] : []),
            { name: `${c.from} to ${c.to}`, path: `/cameras/${c.slug}` },
          ],
          SITE_URL,
        )}
      />
      <PageHeader
        crumbs={[
          { href: "/streets", label: "Streets" },
          ...(street ? [{ href: `/streets/${street.slug}`, label: street.name }] : []),
        ]}
        kicker={hoods.map((h) => h.name).join(" / ") || "Los Angeles"}
        title={c.street}
        lede={`Between ${c.from} and ${c.to}. ${cams.length === 1 ? "One camera" : `${cams.length} cameras`}, enforcing ${listJoin(cams.map((x) => directionLabel(x.direction)))} traffic.`}
      >
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          {c.speed_limit && <span className="rounded-md bg-white/10 px-3 py-0.5 text-sm">{c.speed_limit} mph limit</span>}
          {c.school_nearby && <span className="rounded-md bg-white/10 px-3 py-0.5 text-sm">Near a school</span>}
          <span className="rounded-md bg-white/10 px-3 py-0.5 text-sm">Council District {c.district}</span>
        </div>
      </PageHeader>

      <div className="relative h-[46vh] min-h-[300px] border-b border-zinc-200">
        <MapClient className="absolute inset-0" bounds={bounds} highlight={[c.slug]} cooperative label={`Map of the speed cameras on ${corridorLabel(c)}`} />
      </div>

      <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
        <section className="rounded-lg bg-white p-5 ring-1 ring-zinc-200">
          <h2 className="font-display text-xl font-bold">Status: {STATUS[c.status].label}</h2>
          <p className="mt-1 text-zinc-700">{STATUS[c.status].blurb}</p>
          {warningEnds && (
            <p className="mt-2 text-sm text-zinc-600">
              LADOT&rsquo;s status changed on {apDate(changedAt)}. If that&rsquo;s when warnings started, tickets would begin
              around {apDate(warningEnds)}. That date is our estimate, not LADOT&rsquo;s.
            </p>
          )}
          {c.speed_limit && (
            <p className="mt-3 text-sm text-zinc-700">
              The posted limit is {c.speed_limit} mph, so the camera flags anyone going {c.speed_limit + 11} mph or faster.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl font-bold">The cameras</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {cams.map((cam) => (
              <li key={cam.id} className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
                <p className="font-semibold capitalize">{directionLabel(cam.direction)}</p>
                <p className="text-sm text-zinc-600">
                  {cam.side && cam.side !== "Median" ? `Mounted on the ${cam.side.toLowerCase()} side of the street` : cam.side === "Median" ? "Mounted in the median" : "Mounting side not listed"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {cam.coordinates[1].toFixed(5)}, {cam.coordinates[0].toFixed(5)}
                </p>
                <a
                  href={streetViewUrl(cam.coordinates, cam.bearing)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-semibold underline"
                >
                  See it on Street View
                </a>
              </li>
            ))}
          </ul>
          {cams.some((cam) => (cam.dist_from_corridor_ft ?? 0) > 500) && (
            <p className="mt-3 text-sm text-zinc-600">
              At least one camera here sits a few hundred feet past the end of the stretch LADOT mapped as the
              corridor. We show the camera where LADOT&rsquo;s camera data puts it.
            </p>
          )}
        </section>

        <section className="rounded-lg border-2 border-dashed border-zinc-300 p-5">
          <h2 className="font-display text-xl font-bold">Spotted this camera?</h2>
          <p className="mt-1 text-zinc-700">
            If it&rsquo;s up, missing or somewhere else, tell us. Photos welcome; we&rsquo;re working on a way to post them here.
          </p>
          <a href={REPORT_URL} className="mt-3 inline-block rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-asphalt">
            Report a problem or send a photo
          </a>
        </section>

        {siblings.length > 0 && street && (
          <section>
            <h2 className="mb-3 font-display text-xl font-bold">More cameras on {street.name}</h2>
            <CameraList corridors={siblings} />
          </section>
        )}

        {hoods.length > 0 && (
          <p className="text-sm text-zinc-700">
            See every camera in{" "}
            {hoods.map((h, i) => (
              <span key={h.slug}>
                {i > 0 && (i === hoods.length - 1 ? " and " : ", ")}
                <Link href={`/neighborhoods/${h.slug}`} className="font-semibold underline">{h.name}</Link>
              </span>
            ))}{" "}
            or <Link href={`/council-districts/${c.district}`} className="font-semibold underline">Council District {c.district}</Link>.
          </p>
        )}

        <ShareBar
          url={`${SITE_URL}/cameras/${c.slug}`}
          text={`Speed camera alert: ${c.street} between ${c.from} and ${c.to}. Ease off.`}
          page={`corridor:${c.slug}`}
        />
        <Caveat />
      </div>
    </>
  );
}

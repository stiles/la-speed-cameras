import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import PageHeader from "@/components/PageHeader";
import ListTable, { type Row } from "@/components/ListTable";
import Caveat from "@/components/Caveat";
import JsonLd from "@/components/JsonLd";
import { corridors, getCamera, hoodName, meta } from "@/lib/data";
import { apDate, directionLabel } from "@/lib/format";
import { LADOT_URL, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Full list of Los Angeles speed camera locations",
  description: `All ${meta.counts.cameras} City of LA speed cameras at ${meta.counts.corridors} locations, sortable by street, neighborhood, district and speed limit. Download as CSV or GeoJSON.`,
  path: "/list",
});

export default function ListPage() {
  const rows: Row[] = corridors.map((c) => ({
    slug: c.slug,
    street: c.street,
    from: c.from,
    to: c.to,
    hoods: c.hoods.map(hoodName).join(", "),
    district: c.district,
    speed_limit: c.speed_limit,
    cameras: c.cameras.length,
    directions: c.cameras.map((id) => directionLabel(getCamera(id)?.direction ?? null)).join(", "),
    status: c.status,
  }));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "City of Los Angeles speed camera locations",
          description: `Locations, enforced directions and status of the ${meta.counts.cameras} speed cameras in the City of Los Angeles speed safety pilot, compiled from LADOT data.`,
          url: `${SITE_URL}/list`,
          dateModified: meta.data_updated,
          creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          isBasedOn: LADOT_URL,
          spatialCoverage: "Los Angeles, California",
          distribution: [
            { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${SITE_URL}/data/la-speed-cameras.csv` },
            { "@type": "DataDownload", encodingFormat: "application/geo+json", contentUrl: `${SITE_URL}/data/cameras.geojson` },
          ],
        }}
      />
      <PageHeader
        kicker="Every camera"
        title="The full list"
        lede={`${meta.counts.cameras} cameras at ${meta.counts.corridors} locations, as of ${apDate(meta.data_updated)}. Sort it, filter it, take it with you.`}
      >
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <a href="/data/la-speed-cameras.csv" download className="rounded-md bg-white px-4 py-2 font-semibold text-ink hover:bg-zinc-200">
            Download CSV
          </a>
          <a href="/data/cameras.geojson" download className="rounded-md border border-white/30 px-4 py-2 font-semibold hover:border-white">
            Download GeoJSON
          </a>
        </div>
      </PageHeader>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <ListTable rows={rows} />
        <Caveat />
      </div>
    </>
  );
}

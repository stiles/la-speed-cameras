import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { corridorsInDistrict, districts, getDistrict } from "@/lib/data";

export const metadata: Metadata = {
  title: "Speed cameras by council district",
  description: "Los Angeles speed camera locations in each of the 15 City Council districts.",
  alternates: { canonical: "/council-districts" },
};

export default function DistrictsIndex() {
  return (
    <>
      <PageHeader
        kicker="Council districts"
        title="Speed cameras by council district"
        lede="LADOT spread the 125 locations across all 15 council districts, with eight or nine in each."
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {districts.map((d) => {
            const list = corridorsInDistrict(d);
            return (
              <li key={d}>
                <Link href={`/council-districts/${d}`} className="block rounded-lg bg-white p-4 ring-1 ring-zinc-200 hover:ring-ink">
                  <span className="block font-display text-3xl font-extrabold">{d}</span>
                  {getDistrict(d)?.member && <span className="block text-sm font-semibold">{getDistrict(d)?.member}</span>}
                  <span className="text-sm text-zinc-600">
                    {list.reduce((n, c) => n + c.cameras.length, 0)} cameras, {list.length} locations
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import SearchBox from "@/components/SearchBox";
import { neighborhoods } from "@/lib/data";

export const metadata: Metadata = {
  title: "Speed cameras by neighborhood",
  description:
    "Find Los Angeles speed cameras in your neighborhood, from Hollywood and Mar Vista to Boyle Heights and the Valley, plus the cities that border LA.",
  alternates: { canonical: "/neighborhoods" },
};

export default function NeighborhoodsIndex() {
  const la = neighborhoods.filter((h) => h.in_la_city);
  const outside = neighborhoods.filter((h) => !h.in_la_city);
  const regions = Array.from(new Set(la.map((h) => h.region_name))).sort();

  return (
    <>
      <PageHeader
        kicker="Neighborhoods"
        title="Find the cameras near you"
        lede={`All ${la.length} City of LA neighborhoods, plus the ${outside.length} cities and unincorporated areas next door. The number is how many cameras sit inside each one.`}
      >
        <div className="mt-6 max-w-xl text-ink">
          <SearchBox placeholder="Type your neighborhood or address" />
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        {regions.map((region) => (
          <section key={region}>
            <h2 className="mb-3 font-display text-2xl font-bold">{region}</h2>
            <HoodGrid items={la.filter((h) => h.region_name === region)} />
          </section>
        ))}
        <section>
          <h2 className="mb-1 font-display text-2xl font-bold">Next door to LA</h2>
          <p className="mb-3 max-w-2xl text-sm text-zinc-600">
            These areas aren&rsquo;t part of the City of Los Angeles, so the city&rsquo;s program doesn&rsquo;t put
            cameras there. Their pages show the closest LA cameras.
          </p>
          <HoodGrid items={outside} />
        </section>
      </div>
    </>
  );
}

function HoodGrid({ items }: { items: typeof neighborhoods }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((h) => (
        <li key={h.slug}>
          <Link
            href={`/neighborhoods/${h.slug}`}
            className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-zinc-200 hover:ring-ink"
          >
            <span className="truncate font-medium">{h.name}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${h.camera_count ? "bg-siren text-white" : "bg-zinc-100 text-zinc-500"}`}
            >
              {h.camera_count}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

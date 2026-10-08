import { Suspense } from "react";
import Link from "next/link";
import HomeExplorer from "@/components/HomeExplorer";
import ShareBar from "@/components/ShareBar";
import Caveat from "@/components/Caveat";
import Legend from "@/components/Legend";
import JsonLd from "@/components/JsonLd";
import { meta, neighborhoods } from "@/lib/data";
import { apDate } from "@/lib/format";
import { DESCRIPTION, FIRST_ACTIVATION, SITE_NAME, SITE_URL } from "@/lib/site";

export default function Home() {
  const top = [...neighborhoods].filter((h) => h.camera_count).sort((a, b) => b.camera_count - a.camera_count).slice(0, 12);
  const popular = ["hollywood", "mar-vista", "venice", "del-rey", "silver-lake", "koreatown", "downtown", "north-hollywood", "boyle-heights", "westwood", "echo-park", "highland-park"]
    .map((s) => neighborhoods.find((h) => h.slug === s))
    .filter((h) => h !== undefined);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          description: DESCRIPTION,
        }}
      />
      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:py-8">
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Where are LA&rsquo;s speed cameras?
            </h1>
            <p className="mt-2 max-w-2xl text-white/80 sm:text-lg">
              All {meta.counts.cameras} of them, mapped. Search your neighborhood, your street or your commute.{" "}
              <span className="font-semibold text-siren">Watch your rear end out there.</span>
            </p>
          </div>
          <p className="shrink-0 text-sm text-white/60">
            First cameras switch on <strong className="text-white">{apDate(FIRST_ACTIVATION, false)}</strong>
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="h-[64dvh] min-h-[440px] animate-pulse bg-zinc-200 lg:h-[78vh]" />}>
        <HomeExplorer />
      </Suspense>

      <div className="mx-auto max-w-6xl px-4">
        <Legend counts={meta.status_counts} className="py-3" />

        <section className="grid gap-4 py-10 sm:grid-cols-4">
          {[
            { n: meta.counts.cameras, label: "cameras" },
            { n: meta.counts.corridors, label: "street segments" },
            { n: meta.counts.neighborhoods_with_cameras, label: "neighborhoods" },
            { n: "11+", label: "mph over the limit to get flagged" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
              <div className="font-display text-4xl font-extrabold text-siren">{s.n}</div>
              <div className="text-sm text-zinc-600">{s.label}</div>
            </div>
          ))}
        </section>

        <section className="py-6">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-3xl font-extrabold">Pick your neighborhood</h2>
            <Link href="/neighborhoods" className="text-sm font-semibold underline">All {neighborhoods.length}</Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {popular.map((h) => (
              <li key={h.slug}>
                <Link
                  href={`/neighborhoods/${h.slug}`}
                  className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-zinc-200 hover:ring-ink"
                >
                  <span className="font-semibold">{h.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${h.camera_count ? "bg-siren text-white" : "bg-zinc-100 text-zinc-500"}`}>
                    {h.camera_count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="py-10">
          <h2 className="mb-1 font-display text-3xl font-extrabold">Most watched</h2>
          <p className="mb-4 text-zinc-600">The neighborhoods with the most cameras. Tread lightly.</p>
          <ol className="grid gap-2 sm:grid-cols-2">
            {top.map((h, i) => (
              <li key={h.slug}>
                <Link href={`/neighborhoods/${h.slug}`} className="flex items-center gap-4 rounded-xl bg-white px-4 py-3 ring-1 ring-zinc-200 hover:ring-ink">
                  <span className="w-6 font-display text-xl font-extrabold text-zinc-300">{i + 1}</span>
                  <span className="flex-1 font-semibold">{h.name}</span>
                  <span className="h-2 rounded-full bg-siren" style={{ width: `${(h.camera_count / top[0].camera_count) * 120}px` }} aria-hidden />
                  <span className="w-6 text-right text-sm font-bold">{h.camera_count}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-6 py-10 md:grid-cols-3">
          {[
            {
              h: "How it works",
              p: "Cameras on streetlight poles read the rear plate of anyone going 11 mph or more over the limit. Tickets get mailed to the registered owner.",
            },
            {
              h: "Warnings first",
              p: "Every camera starts with a 60-day warning period. After that, fines start at $50. They're civil tickets, like parking tickets, with no points on your license.",
            },
            {
              h: "How to avoid them",
              p: "Easy: stay under 11 over. Or check your commute and pick a route that skips them. We won't judge. Much.",
            },
          ].map((x) => (
            <div key={x.h}>
              <h3 className="mb-2 font-display text-xl font-bold">{x.h}</h3>
              <p className="text-zinc-700">{x.p}</p>
            </div>
          ))}
        </section>

        <div className="mb-10 flex flex-wrap gap-3">
          <Link href="/route" className="rounded-full bg-siren px-5 py-3 font-bold text-white hover:bg-siren-dark">
            Check my commute
          </Link>
          <Link href="/about" className="rounded-full bg-white px-5 py-3 font-semibold ring-1 ring-zinc-300 hover:ring-ink">
            About the program
          </Link>
        </div>

        <ShareBar
          url={SITE_URL}
          text="Every speed camera in LA, on one map. Look up your neighborhood before the tickets start."
          page="home"
        />

        <Caveat className="mt-8" />
      </div>
    </>
  );
}

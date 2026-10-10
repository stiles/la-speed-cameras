import { Suspense } from "react";
import Link from "next/link";
import HomeExplorer from "@/components/HomeExplorer";
import ShareBar from "@/components/ShareBar";
import Caveat from "@/components/Caveat";
import JsonLd from "@/components/JsonLd";
import { meta, neighborhoods } from "@/lib/data";
import { apDate } from "@/lib/format";
import { DESCRIPTION, FIRST_ACTIVATION, SITE_NAME, SITE_URL } from "@/lib/site";

export default function Home() {
  const top = [...neighborhoods].filter((h) => h.camera_count).sort((a, b) => b.camera_count - a.camera_count).slice(0, 12);

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
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:py-8">
          <div>
            <h1 className="font-display text-[1.7rem] font-extrabold leading-tight tracking-tight sm:text-5xl">
              Where are LA&rsquo;s speed cameras?
            </h1>
            <p className="mt-2 max-w-2xl text-white/80 max-sm:text-[15px] sm:text-lg">
              All {meta.counts.cameras} of them, mapped.{" "}
              <span className="max-sm:hidden">Search your neighborhood, your street or your commute. </span>
              <span className="font-semibold text-siren">Watch your rear end out there.</span>
            </p>
          </div>
          <p className="shrink-0 text-sm text-white/60">
            First cameras switch on <strong className="text-white">{apDate(FIRST_ACTIVATION, false)}</strong>
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="h-[60dvh] min-h-[420px] animate-pulse bg-zinc-200 lg:h-[74vh]" />}>
        <HomeExplorer counts={meta.status_counts} />
      </Suspense>

      <div className="mx-auto max-w-6xl px-4">
        <section className="py-10">
          <div className="mb-1 flex items-end justify-between">
            <h2 className="font-display text-3xl font-extrabold">Most watched</h2>
            <Link href="/neighborhoods" className="text-sm font-semibold underline">All {neighborhoods.length} neighborhoods</Link>
          </div>
          <p className="mb-4 text-zinc-600">The neighborhoods with the most cameras. Tread lightly.</p>
          <ol className="sm:columns-2 sm:gap-x-10">
            {top.map((h, i) => (
              <li key={h.slug} className={`break-inside-avoid border-b border-zinc-200 ${i === 0 || i === top.length / 2 ? "sm:border-t sm:border-t-zinc-300" : ""} ${i === 0 ? "border-t border-t-zinc-300" : ""}`}>
                <Link href={`/neighborhoods/${h.slug}`} className="group flex items-baseline gap-4 py-3">
                  <span className="w-5 text-sm tabular-nums text-zinc-400">{i + 1}</span>
                  <span className="flex-1 font-semibold group-hover:underline">{h.name}</span>
                  <span className="text-sm tabular-nums text-zinc-600">{h.camera_count} cameras</span>
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
              p: "Easy: stay under 11 over. Or check your commute and pick a route that bypasses them.",
            },
          ].map((x) => (
            <div key={x.h}>
              <h3 className="mb-2 font-display text-xl font-bold">{x.h}</h3>
              <p className="text-zinc-700">{x.p}</p>
            </div>
          ))}
        </section>

        <div className="mb-10 flex flex-wrap gap-3">
          <Link href="/route" className="rounded-md bg-siren px-5 py-3 font-bold text-white hover:bg-siren-dark">
            Check my commute
          </Link>
          <Link href="/about" className="rounded-md bg-white px-5 py-3 font-semibold ring-1 ring-zinc-300 hover:ring-ink">
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

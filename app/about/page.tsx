import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import JsonLd, { faq } from "@/components/JsonLd";
import { meta } from "@/lib/data";
import { apDate } from "@/lib/format";
import { AB645_URL, COUNCIL_FILE_URL, FIRST_ACTIVATION, LADOT_URL, LA_GEOGRAPHY_URL, REPORT_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About LA's speed cameras: tickets, fines and how this map works",
  description:
    "How the Los Angeles speed camera pilot works: the 11 mph threshold, the 60-day warning period, fines, where the data comes from and how often this map updates.",
  alternates: { canonical: "/about" },
};

const FAQS = [
  {
    q: "When do LA's speed cameras turn on?",
    a: `LADOT says the first cameras activate ${apDate(FIRST_ACTIVATION)} and expects all of them to be on by the end of 2026.`,
  },
  {
    q: "How fast do you have to go to get a ticket?",
    a: "11 mph or more over the posted speed limit. Below that, the cameras don't flag you.",
  },
  {
    q: "Is there a warning period?",
    a: "Yes. State law requires a 60-day warning period when the program starts and whenever a new camera is switched on. During that time, speeders get warning notices instead of tickets.",
  },
  {
    q: "How much is a speed camera ticket in Los Angeles?",
    a: "Fines start at $50 and rise with speed. They're civil penalties, like parking tickets, and don't add points to your license. Income-based reductions are available.",
  },
  {
    q: "Do the cameras photograph drivers?",
    a: "The cameras read rear license plates. LADOT says only the plate information needed for enforcement is collected.",
  },
];

export default function About() {
  return (
    <>
      <JsonLd data={faq(FAQS)} />
      <PageHeader kicker="About" title="How LA's speed cameras work" lede="Tickets, fines, the warning period and where this map's data comes from." />
      <article className="prose-copy mx-auto max-w-3xl px-4 py-10">
        <p className="lede">
          The City of Los Angeles is installing speed cameras at 125 locations, two cameras per location in most
          cases, one for each direction of travel. It&rsquo;s a five-year pilot allowed under California&rsquo;s{" "}
          <a href={AB645_URL}>AB 645</a>, and it runs through Jan. 1, 2032.
        </p>
        <p className="mt-4">
          This site exists so nobody has to find out where they are from a letter in the mail. It&rsquo;s independent
          and not affiliated with the city or LADOT.
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-zinc-300 ring-1 ring-zinc-300 sm:grid-cols-5">
          {[
            ["Starts", apDate(FIRST_ACTIVATION, false)],
            ["Flagged at", "11+ mph over"],
            ["Warning period", "60 days"],
            ["Fines start at", "$50"],
            ["License points", "None"],
          ].map(([k, v]) => (
            <div key={k} className="bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{k}</dt>
              <dd className="mt-1 font-display text-xl font-extrabold text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <h2>How the cameras work</h2>
        <ul>
          <li><strong>What they catch.</strong> Cameras on streetlight poles read the rear license plate of vehicles going 11 mph or more over the limit.</li>
          <li><strong>Who gets the ticket.</strong> The registered owner, by mail. Tickets are civil penalties, like parking tickets, with no points on your license.</li>
          <li><strong>Warnings first.</strong> Every new camera starts with a 60-day warning period. After that, fines start at $50 and go up with speed.</li>
          <li><strong>Help paying.</strong> Income-based fine reductions and a community service option are available. Details are on <a href={LADOT_URL}>LADOT&rsquo;s site</a>.</li>
          <li><strong>Why these streets.</strong> LADOT picked locations using speed-related crash data, speeding counts and proximity to schools and senior centers, then finalized them with council offices. Each of the 15 council districts got eight or nine.</li>
        </ul>

        <h2>How to avoid a ticket</h2>
        <p>
          The honest answer: drive less than 11 mph over the limit, which is a pretty generous cushion. The other
          answer: <Link href="/route">check your commute</Link> and pick a route that skips them. Your call. Either
          way, watch your rear end.
        </p>

        <h2 id="data">How the data works</h2>
        <h3>Where it comes from</h3>
        <p>
          Camera locations come from LADOT&rsquo;s public ArcGIS layers, the same ones behind the map on{" "}
          <a href={LADOT_URL}>LADOT&rsquo;s program page</a>. We combine three of them: the 125 approved corridors,
          the individual camera mounting points with the direction each one enforces, and the per-location status
          LADOT uses on its map. Neighborhood boundaries come from the LA Times Mapping LA project, maintained in{" "}
          <a href={LA_GEOGRAPHY_URL}>la-geography</a>.
        </p>
        <h3>How often it updates</h3>
        <p>
          A script checks LADOT&rsquo;s data twice a day. When a status changes, the site updates automatically.
          When locations move or cameras are added or removed, a person reviews the change before it goes live.
          The data was last updated {apDate(meta.data_updated)}, and LADOT last edited its camera layer{" "}
          {apDate(meta.source_edited.cameras)}.
        </p>
        <h3>Things to keep in mind</h3>
        <ul>
          <li><strong>It can change.</strong> Cameras are still being installed. Locations, timing and status can change, and LADOT&rsquo;s data can lag what&rsquo;s on the street.</li>
          <li><strong>Positions are approximate.</strong> They come from LADOT&rsquo;s planned mounting points, not a survey of installed poles.</li>
          <li><strong>Some cameras sit past their corridor.</strong> A few are a few hundred feet beyond the stretch LADOT mapped. We show cameras where LADOT&rsquo;s camera data puts them.</li>
          <li><strong>A few gaps in LADOT&rsquo;s data.</strong> A handful of cameras don&rsquo;t list the direction they enforce, and one location lists two cameras for the same direction. We show what LADOT published.</li>
          <li><strong>Neighborhoods are unofficial.</strong> Assignments use the LA Times boundaries. Your mental map of Silver Lake may differ.</li>
          <li><strong>City of LA only.</strong> Some neighboring cities, including Glendale and Long Beach, are authorized to run their own programs.</li>
        </ul>
        <h3>Get the data or report a problem</h3>
        <p>
          Want the raw data? <Link href="/list">Download it</Link>. Spot something wrong?{" "}
          <a href={REPORT_URL}>Tell us</a>. For official answers, email LADOT through its{" "}
          <a href={LADOT_URL}>program page</a> or follow <a href={COUNCIL_FILE_URL}>Council File 23-1168</a>.
        </p>

        <h2 id="changes">What changed</h2>
        <dl className="divide-y divide-zinc-200">
          {meta.changelog.slice(0, 15).map((entry) => (
            <div key={entry.date + entry.changes[0]} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-sm font-semibold text-zinc-500">{apDate(entry.date)}</dt>
              <dd>{entry.changes.map((c) => c.replace(/: .*$/, "")).join("; ")}</dd>
            </div>
          ))}
        </dl>

        <h2>Questions</h2>
        <dl className="divide-y divide-zinc-200">
          {FAQS.map((f) => (
            <div key={f.q} className="py-4">
              <dt className="text-lg font-semibold text-ink">{f.q}</dt>
              <dd className="mt-1 text-zinc-600">{f.a}</dd>
            </div>
          ))}
        </dl>
      </article>
    </>
  );
}

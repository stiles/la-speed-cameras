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
        <p>
          The City of Los Angeles is installing speed cameras at 125 locations, two cameras per location in most
          cases, one for each direction of travel. It&rsquo;s a five-year pilot allowed under California&rsquo;s{" "}
          <a href={AB645_URL}>AB 645</a>, and it runs through Jan. 1, 2032. LADOT says the first cameras switch on{" "}
          {apDate(FIRST_ACTIVATION)}, and the rest follow by the end of 2026.
        </p>
        <p>
          This site exists so nobody has to find out where they are from a letter in the mail. It&rsquo;s independent
          and not affiliated with the city or LADOT.
        </p>

        <h2>How the cameras work</h2>
        <ul>
          <li>Cameras are mounted on streetlight poles and read the rear license plate of vehicles going 11 mph or more over the limit.</li>
          <li>Tickets go to the registered owner by mail. They&rsquo;re civil penalties, like parking tickets, with no points on your license.</li>
          <li>Every new camera starts with a 60-day warning period. After that, fines start at $50 and go up with speed.</li>
          <li>Income-based fine reductions and a community service option are available. Details are on <a href={LADOT_URL}>LADOT&rsquo;s site</a>.</li>
          <li>LADOT picked locations using speed-related crash data, speeding counts and proximity to schools and senior centers, then finalized them with council offices. Each of the 15 council districts got eight or nine.</li>
        </ul>

        <h2>How to avoid a ticket</h2>
        <p>
          The honest answer: drive less than 11 mph over the limit, which is a pretty generous cushion. The other
          answer: <Link href="/route">check your commute</Link> and pick a route that skips them. Your call. Either
          way, watch your rear end.
        </p>

        <h2 id="data">How the data works</h2>
        <p>
          Camera locations come from LADOT&rsquo;s public ArcGIS layers, the same ones behind the map on{" "}
          <a href={LADOT_URL}>LADOT&rsquo;s program page</a>. We combine three of them: the 125 approved corridors,
          the individual camera mounting points with the direction each one enforces, and the per-location status
          LADOT uses on its map. Neighborhood boundaries come from the LA Times Mapping LA project, maintained in{" "}
          <a href={LA_GEOGRAPHY_URL}>la-geography</a>.
        </p>
        <p>
          A script checks LADOT&rsquo;s data twice a day. When a status changes, the site updates automatically.
          When locations move or cameras are added or removed, a person reviews the change before it goes live.
          The data was last updated {apDate(meta.data_updated)}, and LADOT last edited its camera layer{" "}
          {apDate(meta.source_edited.cameras)}.
        </p>
        <p>Things to keep in mind:</p>
        <ul>
          <li>Cameras are still being installed. Locations, timing and status can change, and LADOT&rsquo;s data can lag what&rsquo;s on the street.</li>
          <li>Positions are approximate. They come from LADOT&rsquo;s planned mounting points, not a survey of installed poles.</li>
          <li>Some cameras sit a few hundred feet past the end of the stretch LADOT mapped as their corridor. We show cameras where LADOT&rsquo;s camera data puts them.</li>
          <li>A handful of cameras don&rsquo;t list the direction they enforce, and one location lists two cameras for the same direction. We show what LADOT published.</li>
          <li>Neighborhood assignments use the LA Times boundaries, which are unofficial. Your mental map of Silver Lake may differ.</li>
          <li>This site covers the City of LA program only. Some neighboring cities, including Glendale and Long Beach, are authorized to run their own.</li>
        </ul>
        <p>
          Want the raw data? <Link href="/list">Download it</Link>. Spot something wrong?{" "}
          <a href={REPORT_URL}>Tell us</a>. For official answers, email LADOT through its{" "}
          <a href={LADOT_URL}>program page</a> or follow <a href={COUNCIL_FILE_URL}>Council File 23-1168</a>.
        </p>

        <h2 id="changes">What changed</h2>
        <ul>
          {meta.changelog.slice(0, 15).map((entry) => (
            <li key={entry.date + entry.changes[0]}>
              <strong>{apDate(entry.date)}:</strong> {entry.changes.map((c) => c.replace(/: .*$/, "")).join("; ")}
            </li>
          ))}
        </ul>

        <h2>Questions</h2>
        <dl className="space-y-4">
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold">{f.q}</dt>
              <dd className="mt-1 text-zinc-700">{f.a}</dd>
            </div>
          ))}
        </dl>
      </article>
    </>
  );
}

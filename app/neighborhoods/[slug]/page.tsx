import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MapClient from "@/components/MapClient";
import CameraList from "@/components/CameraList";
import ShareBar from "@/components/ShareBar";
import Caveat from "@/components/Caveat";
import Legend from "@/components/Legend";
import SearchBox from "@/components/SearchBox";
import JsonLd, { breadcrumbs, faq } from "@/components/JsonLd";
import {
  boundsOf,
  corridorsFor,
  getCamera,
  getNeighborhood,
  hoodGeometry,
  hoodsFor,
  neighborhoods,
  getStreet,
} from "@/lib/data";
import { distancePhrase, hoodAnswer, hoodKicker, hoodShareText } from "@/lib/copy";
import { apDate, listJoin, plural } from "@/lib/format";
import { FIRST_ACTIVATION, SITE_URL } from "@/lib/site";
import type { Corridor, Neighborhood } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return neighborhoods.map((h) => ({ slug: h.slug }));
}

type Params = { params: Promise<{ slug: string }> };

function split(h: Neighborhood) {
  const own = corridorsFor(h.corridors);
  const inside = own.filter((c) => c.cameras.some((id) => getCamera(id)?.hood === h.slug));
  const edge = own.filter((c) => !inside.includes(c));
  const nearest = corridorsFor(h.nearest.map((n) => n.corridor));
  return { own, inside, edge, nearest };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const h = getNeighborhood(slug);
  if (!h) return {};
  const { inside, nearest } = split(h);
  const streets = Array.from(new Set(inside.map((c) => c.street))).slice(0, 3);
  const title = !h.in_la_city
    ? `Speed cameras near ${h.name}: the closest LA cameras`
    : h.camera_count
      ? `Speed cameras in ${h.name}: ${plural(h.camera_count, "camera")} on ${streets.join(", ")}`
      : `Speed cameras in ${h.name}, Los Angeles`;
  return {
    title,
    description: hoodAnswer(h, inside, nearest) + " Map, list and status of every LA speed camera nearby.",
    alternates: { canonical: `/neighborhoods/${h.slug}` },
    openGraph: { title, url: `/neighborhoods/${h.slug}` },
  };
}

export default async function NeighborhoodPage({ params }: Params) {
  const { slug } = await params;
  const h = getNeighborhood(slug);
  if (!h) notFound();

  const { own, inside, edge, nearest } = split(h);
  const shown = new Set(own.map((c) => c.slug));
  const adjacent = hoodsFor(h.adjacent);
  const nextDoor = adjacent
    .map((a) => ({ hood: a, corridors: corridorsFor(a.corridors).filter((c) => !shown.has(c.slug)) }))
    .filter((x) => x.corridors.length);
  nextDoor.forEach((x) => x.corridors.forEach((c) => shown.add(c.slug)));
  const nearbyOnly = nearest.filter((c) => !shown.has(c.slug));

  const mapCorridors: Corridor[] = [...own, ...nextDoor.flatMap((x) => x.corridors), ...(own.length ? [] : nearbyOnly)];
  const bounds = boundsOf([{ bbox: h.bbox }, ...(own.length ? own : nearest.slice(0, 1))]) ?? h.bbox;
  const answer = hoodAnswer(h, inside, nearest);
  const shareUrl = `${SITE_URL}/${h.slug}`;
  const nextDoorCount = nextDoor.reduce((n, x) => n + x.corridors.reduce((m, c) => m + c.cameras.length, 0), 0);

  const faqs = [
    { q: `Are there speed cameras in ${h.name}?`, a: answer },
    {
      q: `Are there speed cameras near ${h.name}?`,
      a: nextDoor.length
        ? `Yes. Neighboring ${listJoin(nextDoor.map((x) => x.hood.name))} ${nextDoor.length === 1 ? "has" : "have"} ${plural(nextDoorCount, "camera")}.`
        : nearest[0]
          ? `The closest camera is on ${nearest[0].street} at ${nearest[0].from}, ${distancePhrase(h.nearest[0].miles)}.`
          : "None of the neighboring areas have cameras.",
    },
    {
      q: "When do LA's speed cameras start issuing tickets?",
      a: `LADOT says the first cameras switch on ${apDate(FIRST_ACTIVATION)}, with all of them active by the end of 2026. Each camera starts with a 60-day warning period before tickets go out.`,
    },
    {
      q: "How fast do you have to go to get a speed camera ticket in LA?",
      a: "Cameras only flag vehicles going 11 mph or more over the posted limit. Fines start at $50 and the tickets are civil, like parking tickets, with no points on your license.",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbs(
            [
              { name: "Home", path: "/" },
              { name: "Neighborhoods", path: "/neighborhoods" },
              { name: h.name, path: `/neighborhoods/${h.slug}` },
            ],
            SITE_URL,
          ),
          faq(faqs),
        ]}
      />
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-6">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-white/60">
            <Link href="/neighborhoods" className="hover:text-white">Neighborhoods</Link>
            <span className="mx-2">/</span>
            <span>{h.region_name}</span>
          </nav>
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-siren">{hoodKicker(h)}</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">Speed cameras in {h.name}</h1>
          <p className="mt-4 max-w-3xl text-lg text-white/85 sm:text-xl">{answer}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-md bg-white/10 px-3 py-1">
              <strong className="text-white">{h.camera_count}</strong> inside
            </span>
            {nextDoorCount > 0 && (
              <span className="rounded-md bg-white/10 px-3 py-1">
                <strong className="text-white">{nextDoorCount}</strong> next door
              </span>
            )}
            <a href="#share" className="rounded-md bg-siren px-3 py-1 font-semibold text-white hover:bg-siren-dark">
              Warn a neighbor
            </a>
          </div>
        </div>
      </section>

      <div className="relative h-[58vh] min-h-[360px] w-full border-b border-zinc-200">
        <MapClient
          className="absolute inset-0"
          bounds={bounds}
          outline={hoodGeometry(h.slug)}
          highlight={mapCorridors.map((c) => c.slug)}
          cooperative
          label={`Map of speed cameras in and around ${h.name}`}
        />
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <Legend />

          {inside.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-2xl font-bold">In {h.name}</h2>
              <CameraList corridors={inside} showHood={false} />
            </section>
          )}

          {edge.length > 0 && (
            <section>
              <h2 className="mb-1 font-display text-2xl font-bold">Along the edge</h2>
              <p className="mb-3 text-sm text-zinc-600">These corridors run along or just over the {h.name} line.</p>
              <CameraList corridors={edge} />
            </section>
          )}

          {nextDoor.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-2xl font-bold">Next door</h2>
              <div className="space-y-6">
                {nextDoor.map(({ hood, corridors }) => (
                  <div key={hood.slug}>
                    <h3 className="mb-2 font-semibold">
                      <Link href={`/neighborhoods/${hood.slug}`} className="underline decoration-siren/50">
                        {hood.name}
                      </Link>
                    </h3>
                    <CameraList corridors={corridors} showHood={false} headingLevel="h4" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {own.length === 0 && nearbyOnly.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-2xl font-bold">Closest cameras</h2>
              <CameraList
                corridors={nearbyOnly}
                distances={Object.fromEntries(h.nearest.map((n) => [n.corridor, n.miles]))}
              />
            </section>
          )}

          <div id="share" className="scroll-mt-20">
            <ShareBar
              url={shareUrl}
              text={hoodShareText(h, inside)}
              page={`neighborhood:${h.slug}`}
              heading={`Know someone who drives through ${h.name}?`}
            />
          </div>

          <section>
            <h2 className="mb-4 font-display text-2xl font-bold">Questions people ask</h2>
            <dl className="space-y-5">
              {faqs.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold">{f.q}</dt>
                  <dd className="mt-1 text-zinc-700">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Caveat />
        </div>

        <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
          <div>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-zinc-500">Look up another spot</h2>
            <SearchBox placeholder="Neighborhood, street or address" />
          </div>
          {adjacent.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-zinc-500">Neighbors</h2>
              <ul className="flex flex-wrap gap-2">
                {adjacent.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/neighborhoods/${a.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm hover:border-ink"
                    >
                      {a.name}
                      <span className="text-xs text-zinc-500">{a.camera_count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {h.streets.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-zinc-500">Streets</h2>
              <ul className="space-y-1 text-sm">
                {h.streets.map((s) => (
                  <li key={s}>
                    <Link href={`/streets/${s}`} className="underline decoration-zinc-300 hover:decoration-ink">
                      All cameras on {getStreet(s)?.name ?? s}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {h.districts.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-zinc-500">Council district</h2>
              <ul className="space-y-1 text-sm">
                {h.districts.map((d) => (
                  <li key={d}>
                    <Link href={`/council-districts/${d}`} className="underline decoration-zinc-300 hover:decoration-ink">
                      District {d} cameras
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

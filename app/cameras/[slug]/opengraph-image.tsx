import { ogCard, OG_SIZE } from "@/lib/og";
import { corridors, getCorridor } from "@/lib/data";
import { STATUS, capitalize, spell } from "@/lib/format";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Speed camera location";

export function generateStaticParams() {
  return corridors.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCorridor(slug)!;
  return ogCard({
    kicker: `Speed camera · ${STATUS[c.status].label}`,
    title: c.street,
    note: `Between ${c.from} and ${c.to}. ${c.cameras.length === 1 ? "One camera." : `${capitalize(spell(c.cameras.length))} cameras, one for each direction.`}`,
    footer: c.speed_limit ? `${c.speed_limit} mph limit. Flagged at ${c.speed_limit + 11}+.` : "Watch your rear end out there.",
  });
}

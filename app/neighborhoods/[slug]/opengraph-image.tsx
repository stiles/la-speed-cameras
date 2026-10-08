import { ogCard, OG_SIZE } from "@/lib/og";
import { getNeighborhood, neighborhoods } from "@/lib/data";
import { distancePhrase } from "@/lib/copy";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Speed cameras in this neighborhood";

export function generateStaticParams() {
  return neighborhoods.map((h) => ({ slug: h.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = getNeighborhood(slug)!;
  if (!h.in_la_city) {
    const near = h.nearest[0];
    return ogCard({
      kicker: "Next door to LA",
      title: h.name,
      note: near ? `Not in LA's program. The closest LA speed camera is ${distancePhrase(near.miles)}.` : "Not in LA's speed camera program.",
      shape: h.shape,
    });
  }
  return ogCard({
    kicker: h.region_name,
    title: h.name,
    count: h.camera_count,
    countLabel: h.camera_count === 0 ? "speed cameras (for now)" : "speed cameras",
    shape: h.shape,
  });
}

import { ogCard, OG_SIZE } from "@/lib/og";
import { getStreet, streets } from "@/lib/data";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Speed cameras on this street";

export function generateStaticParams() {
  return streets.map((s) => ({ slug: s.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getStreet(slug)!;
  return ogCard({ kicker: "Speed cameras on", title: s.name, count: s.camera_count });
}

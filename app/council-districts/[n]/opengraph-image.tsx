import { ogCard, OG_SIZE } from "@/lib/og";
import { districts, getDistrict } from "@/lib/data";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Speed cameras in this council district";

export function generateStaticParams() {
  return districts.map((d) => ({ n: String(d) }));
}

export default async function Image({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const d = getDistrict(Number(n))!;
  return ogCard({
    kicker: d.member ? `Council District ${d.n} · ${d.member}` : "LA City Council",
    title: `District ${d.n}`,
    count: d.camera_count,
    shape: d.shape,
  });
}

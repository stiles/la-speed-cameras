import { ogCard, OG_SIZE } from "@/lib/og";
import { cityShape, meta } from "@/lib/data";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "LA Speed Cameras: every Los Angeles speed camera on one map";

export default function Image() {
  return ogCard({
    kicker: "City of Los Angeles",
    title: "Where are LA's speed cameras?",
    count: meta.counts.cameras,
    countLabel: "cameras, mapped",
    shape: cityShape,
    dotScale: 1 / 110,
  });
}

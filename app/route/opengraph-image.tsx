import { ogCard, OG_SIZE } from "@/lib/og";
import { cityShape } from "@/lib/data";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Check your commute for LA speed cameras";

export default function Image() {
  return ogCard({
    kicker: "Commute check",
    title: "Speed cameras on your drive?",
    note: "Check your route, then find one that skips them.",
    shape: cityShape,
    dotScale: 1 / 110,
  });
}

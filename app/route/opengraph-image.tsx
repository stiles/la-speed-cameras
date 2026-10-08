import { ogCard, OG_SIZE } from "@/lib/og";
import { cityShape } from "@/lib/data";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Check your commute for LA speed cameras";

export default function Image() {
  return ogCard({
    kicker: "Commute check",
    title: "How many speed cameras are on your drive?",
    note: "Enter where you start and where you're headed. We'll count the cameras and look for a way around them.",
    shape: cityShape,
    dotScale: 1 / 110,
  });
}

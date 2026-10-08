import Link from "next/link";
import { getCamera, hoodName } from "@/lib/data";
import { directionLabel } from "@/lib/format";
import type { Corridor } from "@/lib/types";
import StatusBadge from "./StatusBadge";

type Props = {
  corridors: Corridor[];
  showHood?: boolean;
  distances?: Record<string, number>;
  headingLevel?: "h3" | "h4";
};

export default function CameraList({ corridors, showHood = true, distances, headingLevel = "h3" }: Props) {
  const H = headingLevel;
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
      {corridors.map((c) => {
        const cams = c.cameras.map(getCamera).filter(Boolean);
        return (
          <li key={c.slug} className="group relative flex gap-4 p-4 hover:bg-zinc-50">
            <div className="mt-1 grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-xs font-bold text-white">
              {c.speed_limit ?? "?"}
              <span className="sr-only"> mph speed limit</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <H className="font-semibold">
                  <Link href={`/cameras/${c.slug}`} className="after:absolute after:inset-0">
                    {c.street}
                  </Link>
                </H>
                <StatusBadge status={c.status} short />
                {distances?.[c.slug] !== undefined && (
                  <span className="text-xs text-zinc-500">{distances[c.slug]} mi away</span>
                )}
              </div>
              <p className="text-sm text-zinc-700">
                Between {c.from} and {c.to}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {cams.length === 1 ? "1 camera" : `${cams.length} cameras`}, enforcing{" "}
                {cams.map((cam) => directionLabel(cam!.direction)).join(" and ")}
                {c.speed_limit ? ` · ${c.speed_limit} mph limit` : ""}
                {c.school_nearby ? " · near a school" : ""}
                {showHood && c.hoods.length ? ` · ${c.hoods.map(hoodName).join(", ")}` : ""}
              </p>
            </div>
            <span aria-hidden className="self-center text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-ink">
              &rarr;
            </span>
          </li>
        );
      })}
    </ul>
  );
}

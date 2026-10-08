import Link from "next/link";
import { meta } from "@/lib/data";
import { apDate } from "@/lib/format";
import { LADOT_URL } from "@/lib/site";

export default function Caveat({ className = "" }: { className?: string }) {
  return (
    <aside className={`rounded-xl border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-950 ${className}`}>
      <strong className="font-semibold">Before you rely on this: </strong>
      Locations come from LADOT data last edited {apDate(meta.source_edited.cameras ?? meta.data_updated)}. Cameras are
      still being installed, and locations and timing can change. Positions are approximate. This site is not
      affiliated with the City of Los Angeles; check{" "}
      <a href={LADOT_URL} className="underline">
        LADOT
      </a>{" "}
      for official information. <Link href="/about#data" className="underline">How the data works</Link>.
    </aside>
  );
}

import Link from "next/link";
import { meta } from "@/lib/data";
import { apDate } from "@/lib/format";
import { LADOT_URL, LA_GEOGRAPHY_URL } from "@/lib/site";
import { Logo } from "./Header";

export default function Footer() {
  return (
    <footer className="mt-16 bg-ink text-white/70">
      <div className="stripes h-2" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo className="text-white" />
          <p>
            An independent guide to the City of Los Angeles speed camera pilot. Not affiliated with the city or
            LADOT. Locations come from{" "}
            <a className="underline" href={LADOT_URL}>
              LADOT
            </a>{" "}
            data and can change while cameras are installed.
          </p>
          <p>Data updated {apDate(meta.data_updated)}.</p>
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-white">Find cameras</h2>
          <ul className="space-y-1.5">
            <li><Link href="/neighborhoods">By neighborhood</Link></li>
            <li><Link href="/streets">By street</Link></li>
            <li><Link href="/council-districts">By council district</Link></li>
            <li><Link href="/route">On my commute</Link></li>
            <li><Link href="/list">Full list and downloads</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-white">The fine print</h2>
          <ul className="space-y-1.5">
            <li><Link href="/about">About the program</Link></li>
            <li><Link href="/about#data">How the data works</Link></li>
            <li><Link href="/about#changes">What changed</Link></li>
            <li><a href={LA_GEOGRAPHY_URL}>Neighborhood boundaries</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

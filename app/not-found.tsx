import Link from "next/link";
import SearchBox from "@/components/SearchBox";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-siren">404</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold">Wrong turn</h1>
      <p className="mt-3 text-zinc-700">That page doesn&rsquo;t exist. At least there&rsquo;s no camera here.</p>
      <div className="mt-8 text-left">
        <SearchBox placeholder="Search a neighborhood, street or address" />
      </div>
      <Link href="/" className="mt-6 inline-block font-semibold underline">Back to the map</Link>
    </div>
  );
}

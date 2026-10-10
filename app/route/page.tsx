import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { Suspense } from "react";
import RoutePlanner from "@/components/RoutePlanner";

export const metadata: Metadata = pageMeta({
  title: "Check your commute for speed cameras",
  description: "Enter where you start and where you're going to see which Los Angeles speed cameras are on your route, and find one that skips them.",
  path: "/route",
});

export default function RoutePage() {
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-2 px-4 py-5">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Check your commute</h1>
          <p className="text-white/75">Which cameras are on your route, and is there a way around them?</p>
        </div>
      </section>
      <Suspense fallback={<div className="h-[70vh] animate-pulse bg-zinc-200" />}>
        <RoutePlanner />
      </Suspense>
    </>
  );
}

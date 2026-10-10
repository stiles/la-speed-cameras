"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

type Props = {
  url: string;
  text: string;
  page: string;
  prompt: string;
  /** Show the bar once this element has scrolled out of view above the viewport. */
  afterId: string;
  /** Hide the bar once this element (the full share card) reaches the viewport. */
  untilId: string;
};

const DISMISSED = "sticky-share-dismissed";

export default function StickyShare({ url, text, page, prompt, afterId, untilId }: Props) {
  const [inRange, setInRange] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISSED) === "1");
    const after = document.getElementById(afterId);
    const until = document.getElementById(untilId);
    if (!after || !until) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setInRange(after.getBoundingClientRect().bottom < 0 && until.getBoundingClientRect().top > window.innerHeight);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [afterId, untilId]);

  async function share() {
    if (typeof navigator.share === "function") {
      track("share", { channel: "native", page, placement: "sticky" });
      try {
        await navigator.share({ title: "LA Speed Cameras", text, url });
      } catch {
        /* dismissed */
      }
      return;
    }
    track("share", { channel: "copy", page, placement: "sticky" });
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function dismiss() {
    sessionStorage.setItem(DISMISSED, "1");
    setDismissed(true);
  }

  const visible = inRange && !dismissed;

  return (
    <div
      inert={!visible}
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-30 bg-ink pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-4px_16px_rgba(0,0,0,0.2)] transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-full"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{prompt}</p>
        <button
          type="button"
          onClick={share}
          className="shrink-0 rounded-md bg-siren px-4 py-2 text-sm font-bold text-white hover:bg-siren-dark"
        >
          {copied ? "Link copied" : "Warn them"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide share prompt"
          className="-mr-2 grid size-10 shrink-0 place-items-center rounded-md text-white/60 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

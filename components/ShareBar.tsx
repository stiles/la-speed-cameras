"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

type Props = {
  url: string;
  text: string;
  title?: string;
  heading?: string;
  sub?: string;
  variant?: "card" | "inline";
  page?: string;
};

const enc = encodeURIComponent;

function channels(url: string, text: string) {
  const both = `${text} ${url}`;
  return [
    { id: "sms", label: "Text", href: `sms:?&body=${enc(both)}` },
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${enc(both)}` },
    { id: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
    { id: "bluesky", label: "Bluesky", href: `https://bsky.app/intent/compose?text=${enc(both)}` },
    { id: "threads", label: "Threads", href: `https://www.threads.net/intent/post?text=${enc(both)}` },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { id: "nextdoor", label: "Nextdoor", href: `https://nextdoor.com/sharekit/?source=laspeedcameras&body=${enc(both)}` },
    { id: "email", label: "Email", href: `mailto:?subject=${enc("LA speed cameras near you")}&body=${enc(both)}` },
  ];
}

export default function ShareBar({
  url,
  text,
  title = "LA Speed Cameras",
  heading = "Don't let your friends get flashed",
  sub = "Send this to the friend who drives like they're late for a Dodgers game.",
  variant = "card",
  page = "",
}: Props) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

  async function nativeShare() {
    track("share", { channel: "native", page });
    try {
      await navigator.share({ title, text, url });
    } catch {
      /* dismissed */
    }
  }

  async function copy() {
    track("share", { channel: "copy", page });
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const buttons = (
    <div className="flex flex-wrap gap-2">
      {canShare && (
        <button
          type="button"
          onClick={nativeShare}
          className="rounded-full bg-siren px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-siren-dark"
        >
          Share
        </button>
      )}
      <button
        type="button"
        onClick={copy}
        data-copy
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-asphalt"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
      {channels(url, text)
        .filter((c) => !canShare || more || c.id === "sms" || c.id === "whatsapp")
        .map((c) => (
        <a
          key={c.id}
          href={c.href}
          target={c.href.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          onClick={() => track("share", { channel: c.id, page })}
          className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:border-ink"
        >
          {c.label}
        </a>
      ))}
      {canShare && !more && (
        <button
          type="button"
          onClick={() => setMore(true)}
          data-more
          className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:border-ink"
        >
          More
        </button>
      )}
    </div>
  );

  if (variant === "inline") return buttons;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white" aria-label="Share">
      <div className="stripes absolute inset-x-0 top-0 h-1.5" aria-hidden />
      <h2 className="font-display text-2xl font-extrabold">{heading}</h2>
      <p className="mb-4 mt-1 text-white/75">{sub}</p>
      <p className="mb-4 rounded-lg bg-white/10 p-3 text-sm text-white/90">
        &ldquo;{text}&rdquo; <span className="text-white/60">{url.replace(/^https?:\/\//, "")}</span>
      </p>
      <div className="[&_a]:border-white/25 [&_a]:bg-transparent [&_a]:text-white [&_a:hover]:border-white [&_[data-more]]:border-white/25 [&_[data-more]]:bg-transparent [&_[data-more]]:text-white [&_[data-copy]]:bg-white [&_[data-copy]]:text-ink">
        {buttons}
      </div>
    </section>
  );
}

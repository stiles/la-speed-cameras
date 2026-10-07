"use client";

import { track as vercelTrack } from "@vercel/analytics";

type Props = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Send a custom event to Google Analytics and Vercel Analytics. */
export function track(name: string, props: Props = {}) {
  vercelTrack(name, props);
  window.gtag?.("event", name, props);
}

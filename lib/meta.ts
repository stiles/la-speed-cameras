import type { Metadata } from "next";
import { SITE_NAME } from "./site";

/** Page metadata with matching share tags. Next replaces the layout's openGraph object rather than merging it. */
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", title, description, url: path },
    twitter: { card: "summary_large_image", title, description },
  };
}

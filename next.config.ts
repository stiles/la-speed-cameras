import type { NextConfig } from "next";
import neighborhoods from "./data/neighborhoods.json";

// Top-level paths that a neighborhood alias must never shadow.
const RESERVED = new Set(["about", "list", "route", "neighborhoods", "streets", "cameras", "council-districts", "data", "api"]);

const nextConfig: NextConfig = {
  async redirects() {
    return (neighborhoods as { slug: string }[])
      .filter((h) => !RESERVED.has(h.slug))
      .map((h) => ({ source: `/${h.slug}`, destination: `/neighborhoods/${h.slug}`, permanent: true }));
  },
  async headers() {
    return [
      {
        source: "/data/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;

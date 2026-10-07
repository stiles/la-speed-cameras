import type { MetadataRoute } from "next";
import { corridors, districts, meta, neighborhoods, streets } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = meta.data_updated;
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" = "weekly") => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "daily"),
    page("/neighborhoods", 0.9, "weekly"),
    page("/list", 0.8, "daily"),
    page("/route", 0.8, "monthly"),
    page("/streets", 0.6),
    page("/council-districts", 0.5),
    page("/about", 0.6, "monthly"),
    ...neighborhoods.map((h) => page(`/neighborhoods/${h.slug}`, h.in_la_city ? 0.8 : 0.6)),
    ...streets.map((s) => page(`/streets/${s.slug}`, 0.6)),
    ...corridors.map((c) => page(`/cameras/${c.slug}`, 0.5)),
    ...districts.map((d) => page(`/council-districts/${d}`, 0.4)),
  ];
}

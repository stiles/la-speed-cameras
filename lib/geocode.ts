"use client";

import { LA_BBOX, LA_CENTER, MAPBOX_TOKEN } from "./site";

export type Place = { label: string; sub: string; center: [number, number] };

export async function geocode(query: string, signal?: AbortSignal): Promise<Place[]> {
  if (!MAPBOX_TOKEN || query.trim().length < 3) return [];
  const params = new URLSearchParams({
    q: query,
    access_token: MAPBOX_TOKEN,
    bbox: LA_BBOX.join(","),
    proximity: LA_CENTER.join(","),
    country: "us",
    limit: "5",
    language: "en",
    types: "address,poi,street,neighborhood,locality,place,postcode",
  });
  // Geocoding v6 has no POIs, so use Search Box for "UCLA" or "Venice Beach"
  const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?${params}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features: { geometry: { coordinates: [number, number] }; properties: { name: string; place_formatted?: string; full_address?: string } }[];
  };
  return data.features.map((f) => ({
    label: f.properties.name,
    sub: f.properties.place_formatted ?? "",
    center: f.geometry.coordinates,
  }));
}

export async function reverseGeocode([lon, lat]: [number, number]): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;
  const params = new URLSearchParams({ longitude: String(lon), latitude: String(lat), access_token: MAPBOX_TOKEN, limit: "1", types: "address,street" });
  const res = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${params}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { features: { properties: { name: string } }[] };
  return data.features[0]?.properties.name ?? null;
}

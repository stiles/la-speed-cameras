import type { Corridor, Neighborhood } from "./types";
import { listJoin, spellPlural } from "./format";

/** Programs in neighboring cities that this site doesn't map. */
export const OTHER_PROGRAMS: Record<string, string> = {
  glendale: "Glendale is one of the cities authorized to run its own speed camera pilot under AB 645.",
  "long-beach": "Long Beach is one of the cities authorized to run its own speed camera pilot under AB 645.",
};

export function hoodKicker(h: Neighborhood) {
  const n = h.camera_count;
  if (!h.in_la_city) return "Outside the city limits";
  if (n === 0) return "Camera-free, for now";
  if (n <= 2) return "Light coverage";
  if (n <= 6) return "Keep an eye out";
  return "Tread lightly";
}

export function distancePhrase(miles: number) {
  if (miles < 0.1) return "just over the line";
  return `about ${miles} ${miles === 1 ? "mile" : "miles"} away`;
}

function streetsSentence(corridors: Corridor[]) {
  const streets = Array.from(new Set(corridors.map((c) => c.street)));
  return listJoin(streets);
}

/** One-sentence answer to "are there speed cameras in X?" */
export function hoodAnswer(h: Neighborhood, own: Corridor[], nearest: Corridor[]) {
  const n = h.camera_count;
  if (!h.in_la_city) {
    const extra = OTHER_PROGRAMS[h.slug] ? ` ${OTHER_PROGRAMS[h.slug]}` : "";
    const near = nearest[0] ? ` The closest LA city camera is on ${nearest[0].street} at ${nearest[0].from}, ${distancePhrase(h.nearest[0].miles)}.` : "";
    const edge = own.length ? ` Cameras sit along its edge on ${streetsSentence(own)}.` : near;
    return `${h.name} isn't part of the City of Los Angeles, so LA's speed camera program doesn't cover it.${extra}${edge}`;
  }
  if (n === 0 && own.length) {
    return `No cameras sit inside ${h.name}, but ${spellPlural(own.length, "camera corridor")} runs along its edge on ${streetsSentence(own)}.`;
  }
  if (n === 0) {
    const near = nearest[0];
    return near
      ? `No. ${h.name} doesn't have any of the city's 125 speed camera locations. The closest is on ${near.street} at ${near.from}, ${distancePhrase(h.nearest[0].miles)}.`
      : `No. ${h.name} doesn't have any of the city's speed camera locations.`;
  }
  const where = own.length === 1
    ? `on ${own[0].street} between ${own[0].from} and ${own[0].to}`
    : `on ${streetsSentence(own)}`;
  return `Yes. ${h.name} has ${spellPlural(n, "speed camera")} ${where}.`;
}

export function hoodShareText(h: Neighborhood, own: Corridor[]) {
  if (!h.in_la_city) return `Are there speed cameras near ${h.name}? Here's every one in LA, mapped.`;
  if (h.camera_count === 0) return `${h.name} has no speed cameras (yet). Here's where the closest ones are.`;
  const streets = Array.from(new Set(own.map((c) => c.street))).slice(0, 2);
  return `${h.name} has ${spellPlural(h.camera_count, "speed camera")} on ${listJoin(streets)}. Don't say nobody warned you.`;
}

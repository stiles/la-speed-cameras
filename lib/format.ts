import type { StatusKey } from "./types";

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/** AP style for prose: spell out zero through nine, numerals from 10 up. Tables, badges and big display numbers keep numerals. */
export function spell(n: number) {
  return Number.isInteger(n) && n >= 0 && n < 10 ? WORDS[n] : n.toLocaleString("en-US");
}

export function spellPlural(n: number, one: string, many = `${one}s`) {
  return `${spell(n)} ${n === 1 ? one : many}`;
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function listJoin(items: string[]) {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

/** AP-style date from YYYY-MM-DD or an ISO timestamp, read in LA time. */
export function apDate(value: string | null | undefined, withYear = true) {
  if (!value) return "";
  const d = value.length === 10 ? new Date(`${value}T12:00:00-07:00`) : new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const label = `${MONTHS[get("month") - 1]} ${get("day")}`;
  return withYear ? `${label}, ${get("year")}` : label;
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const STATUS: Record<StatusKey, { label: string; short: string; tone: string; blurb: string }> = {
  construction: {
    label: "Under construction",
    short: "Coming soon",
    tone: "bg-white text-ink ring-1 ring-inset ring-ink/30",
    blurb: "LADOT lists this camera as under construction. It isn't issuing anything yet.",
  },
  warning: {
    label: "Warning period",
    short: "Warnings",
    tone: "bg-amber-300 text-ink",
    blurb: "Switched on and mailing warning notices only, for the first 60 days.",
  },
  ticketing: {
    label: "Issuing tickets",
    short: "Ticketing",
    tone: "bg-siren text-white",
    blurb: "Issuing citations to drivers going 11+ mph over the limit.",
  },
  active: {
    label: "Active",
    short: "Active",
    tone: "bg-siren text-white",
    blurb: "LADOT lists this camera as active. New cameras start with a 60-day warning period.",
  },
  unknown: {
    label: "Status unclear",
    short: "Unclear",
    tone: "bg-zinc-200 text-ink",
    blurb: "LADOT's status for this camera is one we haven't seen before. Check with LADOT.",
  },
};

export function directionLabel(direction: string | null) {
  return direction ? direction.toLowerCase() : "direction not listed";
}

export function streetViewUrl([lon, lat]: [number, number], bearing: number | null) {
  const heading = bearing ?? 0;
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}&heading=${heading}`;
}

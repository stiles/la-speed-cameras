import type { StatusKey } from "@/lib/types";

const ITEMS: { status: StatusKey; label: string; fill: string; arrow: string }[] = [
  { status: "construction", label: "Coming soon", fill: "#ffffff", arrow: "#d63c2c" },
  { status: "warning", label: "Warnings only", fill: "#fcd34d", arrow: "#ffffff" },
  { status: "ticketing", label: "Issuing tickets", fill: "#d63c2c", arrow: "#ffffff" },
];

type Props = {
  counts?: Partial<Record<StatusKey, number>>;
  /** Compact card for laying over a map. Hides the direction and zone keys on small screens. */
  overlay?: boolean;
  className?: string;
};

export default function Legend({ counts, overlay = false, className = "" }: Props) {
  const extra = overlay ? "max-sm:hidden" : "";
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-700 ${overlay ? "rounded-md bg-white/95 px-3 py-2 shadow-md ring-1 ring-black/10 sm:flex-col sm:items-start" : ""} ${className}`}
    >
      {ITEMS.map((i) => (
        <span key={i.status} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-3 rounded-full border-2 border-siren"
            style={{ background: i.fill }}
            aria-hidden
          />
          {i.label}
          {counts && <span className="text-zinc-500">({counts[i.status] ?? 0})</span>}
        </span>
      ))}
      <span className={`inline-flex items-center gap-1.5 ${extra}`}>
        <svg viewBox="0 0 12 12" className="size-3 text-siren" aria-hidden>
          <path d="M6 1 10 8 6 6.5 2 8Z" fill="currentColor" />
        </svg>
        Direction enforced
      </span>
      <span className={`inline-flex items-center gap-1.5 ${extra}`}>
        <span className="inline-block h-1.5 w-5 rounded-sm bg-siren/35" aria-hidden />
        Enforcement zone
      </span>
    </div>
  );
}

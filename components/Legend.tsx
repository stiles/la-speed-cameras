import type { StatusKey } from "@/lib/types";

const ITEMS: { status: StatusKey; label: string; fill: string; arrow: string }[] = [
  { status: "construction", label: "Coming soon", fill: "#ffffff", arrow: "#ff3b1f" },
  { status: "warning", label: "Warnings only", fill: "#fcd34d", arrow: "#ffffff" },
  { status: "ticketing", label: "Issuing tickets", fill: "#ff3b1f", arrow: "#ffffff" },
];

export default function Legend({ counts, className = "" }: { counts?: Partial<Record<StatusKey, number>>; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-700 ${className}`}>
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
      <span className="inline-flex items-center gap-1.5">
        <svg viewBox="0 0 12 12" className="size-3 text-siren" aria-hidden>
          <path d="M6 1 10 8 6 6.5 2 8Z" fill="currentColor" />
        </svg>
        Direction enforced
      </span>
    </div>
  );
}

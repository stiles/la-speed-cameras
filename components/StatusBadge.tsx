import { STATUS } from "@/lib/format";
import type { StatusKey } from "@/lib/types";

export default function StatusBadge({ status, short = false }: { status: StatusKey; short?: boolean }) {
  const s = STATUS[status] ?? STATUS.unknown;
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${s.tone}`}>
      {short ? s.short : s.label}
    </span>
  );
}

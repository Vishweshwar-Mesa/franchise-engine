import { STATUSES, type Status } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";

export function StatusCounts({ counts, active, onPick }: { counts: Record<Status, number>; active?: Status | null; onPick?: (s: Status | null) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick?.(active === s ? null : s)}
          className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-left", active === s && "ring-2 ring-ring")}
        >
          <span className="text-xl font-semibold">{counts[s]}</span>
          <StatusBadge status={s} />
        </button>
      ))}
    </div>
  );
}

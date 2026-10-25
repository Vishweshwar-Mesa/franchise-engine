"use client";
import { STATUSES, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TONE } from "./status-badge";
import { CountUp } from "./motion";

/** One neutral tile per status with a coloured marker; click one to filter. */
export function StatusCounts({ counts, active, onPick }: { counts: Record<Status, number>; active?: Status | null; onPick?: (s: Status | null) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={active === s}
          onClick={() => onPick?.(active === s ? null : s)}
          className={cn(
            "tile flex min-h-24 flex-col justify-between gap-2 rounded-2xl border bg-card p-4 text-left",
            active === s && "border-primary",
          )}
        >
          <span className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: `var(--bar-${TONE[s]})` }} />
            {s}
          </span>
          <CountUp value={counts[s]} className="text-3xl font-bold tracking-tight" />
        </button>
      ))}
    </div>
  );
}

"use client";
import { STATUSES, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TONE } from "./status-badge";
import { CountUp } from "./motion";

/** Tinted tiles per status; click one to filter. */
export function StatusCounts({ counts, active, onPick }: { counts: Record<Status, number>; active?: Status | null; onPick?: (s: Status | null) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={active === s}
          onClick={() => onPick?.(active === s ? null : s)}
          style={{ color: `var(--tone-${TONE[s]})`, background: `var(--tone-${TONE[s]}-bg)` }}
          className={cn(
            "flex min-h-28 flex-col justify-between gap-3 rounded-3xl p-5 text-left transition-transform hover:-translate-y-0.5",
            active === s && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          )}
        >
          <CountUp value={counts[s]} className="font-serif text-5xl leading-none font-medium" />
          <span className="text-sm font-semibold">{s}</span>
        </button>
      ))}
    </div>
  );
}

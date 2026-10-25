import type { FactorScore, Light } from "@/lib/engine";
import { cn } from "@/lib/utils";

const DOT: Record<Light, string> = {
  green: "bg-[var(--light-green)]",
  amber: "bg-[var(--light-amber)]",
  red: "bg-[var(--light-red)]",
  none: "border-[1.5px] border-muted-foreground",
};

export function TrafficLight({ light, title }: { light: Light; title?: string }) {
  return <span title={title} aria-label={title} className={cn("inline-block size-2.5 shrink-0 rounded-full", DOT[light])} />;
}

/** One dot per factor, or the total when showTotal is on. */
export function FactorLights({ factors, total, showTotal }: { factors: FactorScore[]; total: number; showTotal: boolean }) {
  if (showTotal) return <span className="font-mono text-sm">{total}/100</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {factors.map((f) => (
        <TrafficLight key={f.key} light={f.light} title={f.provided ? `${f.label}: ${f.points}/${f.max} (${f.light})` : `${f.label}: not provided`} />
      ))}
    </span>
  );
}

/** A thin bar per factor, coloured by its traffic light. */
export function FactorBar({ f }: { f: FactorScore }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-semibold">{f.label}</span>
        <span className="text-muted-foreground">{f.provided ? `${f.points} / ${f.max}` : "not provided"}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        {f.provided && <div className={cn("h-1.5 rounded-full", DOT[f.light])} style={{ width: `${Math.round(f.share * 100)}%` }} />}
      </div>
    </div>
  );
}

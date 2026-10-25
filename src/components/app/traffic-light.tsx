import type { FactorScore, Light } from "@/lib/engine";
import { cn } from "@/lib/utils";

const DOT: Record<Light, string> = {
  green: "bg-green-500",
  amber: "bg-amber-400",
  red: "bg-red-500",
  none: "bg-zinc-200 border border-zinc-400",
};

export function TrafficLight({ light, title }: { light: Light; title?: string }) {
  return <span title={title} className={cn("inline-block size-3 rounded-full", DOT[light])} />;
}

/** One dot per factor, or the total when showTotal is on. */
export function FactorLights({ factors, total, showTotal }: { factors: FactorScore[]; total: number; showTotal: boolean }) {
  if (showTotal) return <span className="font-mono text-sm">{total}/100</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {factors.map((f) => (
        <TrafficLight
          key={f.key}
          light={f.light}
          title={f.provided ? `${f.label}: ${f.points}/${f.max} (${f.light})` : `${f.label}: not provided`}
        />
      ))}
    </span>
  );
}

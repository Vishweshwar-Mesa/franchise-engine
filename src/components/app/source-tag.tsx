import type { Source } from "@/lib/engine";
import { cn } from "@/lib/utils";

/** "Case rule" = from the case file. "Our choice" = our default, editable in Settings. */
export function SourceTag({ source }: { source: Source }) {
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap",
        source === "Case rule" ? "border-zinc-800 text-zinc-900" : "border-dashed border-zinc-400 text-zinc-600",
      )}
    >
      {source}
    </span>
  );
}

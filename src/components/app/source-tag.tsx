import type { Source } from "@/lib/engine";
import { cn } from "@/lib/utils";

/** "Case rule" = from the case file. "Our choice" = our default, editable in Settings. */
export function SourceTag({ source }: { source: Source }) {
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap",
        source === "Case rule" ? "border-foreground/70 text-foreground" : "border-dashed border-muted-foreground/60 text-muted-foreground",
      )}
    >
      {source}
    </span>
  );
}

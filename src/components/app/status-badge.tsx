import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Status -> CSS tone variables (defined in globals.css for dark and light). */
export const TONE: Record<Status, string> = {
  "Good to go": "good",
  "Needs your decision": "decide",
  "Hold: info needed": "info",
  "Hold: pin occupied": "pin",
  Waitlist: "wait",
  "Not proceeding": "stop",
};

export function toneStyle(status: Status): React.CSSProperties {
  const k = TONE[status];
  return { color: `var(--tone-${k})`, background: `var(--tone-${k}-bg)` };
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span style={toneStyle(status)} className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap", className)}>
      {status}
    </span>
  );
}

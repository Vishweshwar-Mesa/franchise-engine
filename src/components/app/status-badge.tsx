import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLE: Record<Status, string> = {
  "Good to go": "bg-green-100 text-green-900 border-green-300",
  "Needs your decision": "bg-purple-100 text-purple-900 border-purple-300",
  "Hold: info needed": "bg-amber-100 text-amber-900 border-amber-300",
  "Hold: pin occupied": "bg-orange-100 text-orange-900 border-orange-300",
  Waitlist: "bg-sky-100 text-sky-900 border-sky-300",
  "Not proceeding": "bg-zinc-200 text-zinc-800 border-zinc-300",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap", STYLE[status], className)}>
      {status}
    </span>
  );
}

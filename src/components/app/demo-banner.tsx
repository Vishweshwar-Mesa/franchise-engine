"use client";
import Link from "next/link";
import { useWorkspace } from "@/store/workspace";

/** Shown while the synthetic demo workspace is loaded. */
export function DemoBanner() {
  const demo = useWorkspace((s) => s.demo);
  if (!demo) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-note px-4 py-3 text-sm">
      <p>
        <b>Demo data.</b> 30 made-up applicants (not real people, not Go Colors data) with deliberate problems, so every check and status shows up. Upload the real file to replace it.
      </p>
      <Link href="/" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">Upload real data</Link>
    </div>
  );
}

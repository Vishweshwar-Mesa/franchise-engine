"use client";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/store/workspace";

/** A small flag while the pre-loaded synthetic demo data is shown. */
export function DemoBanner() {
  const demo = useWorkspace((s) => s.demo);
  const path = usePathname();
  if (!demo || path === "/") return null;
  return (
    <p className="mb-6 rounded-2xl bg-note px-4 py-2.5 text-sm">
      <b>Demo data:</b> 30 made-up applicants (not real people, not Go Colors data), plus 3 demo stores in onboarding whose timeline durations and due days are demo entries. Uploading a file replaces it.
    </p>
  );
}

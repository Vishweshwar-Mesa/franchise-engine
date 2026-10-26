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
      <b>Demo data.</b> These 30 applicants and the 3 stores in onboarding are made up so you can try things out. They are not real people or Go Colors data. Upload your own file and it replaces all of this.
    </p>
  );
}

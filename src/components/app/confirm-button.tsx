"use client";
import Link from "next/link";
import type { LedgerEntry } from "@/lib/engine";
import { useWorkspace } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { WhyButton } from "./why-button";

/** Confirming a Good to go applicant only moves them to "Awaiting paperwork". */
export function ConfirmButton({ entry }: { entry: LedgerEntry }) {
  const onboarding = useWorkspace((s) => s.onboarding[entry.id]);
  if (onboarding) {
    return (
      <div className="rounded-[20px] border bg-card p-5 text-sm">
        Stage: <b>{onboarding.stage}</b> (confirmed {new Date(onboarding.confirmedAt).toLocaleDateString()}).{" "}
        <Link href={`/onboarding/${encodeURIComponent(entry.id)}`} className="underline">Open onboarding →</Link>
      </div>
    );
  }
  if (entry.status !== "Good to go") return null;
  return (
    <div className="space-y-2 rounded-[20px] border bg-card p-5 text-sm">
      <h3 className="text-base font-semibold">Reviewer confirmation</h3>
      <p className="text-xs text-muted-foreground">
        &quot;Good to go&quot; is a recommendation. Confirming moves this applicant to the <b>Awaiting paperwork</b> stage. It does not start onboarding; the timeline starts only after the paperwork gate is complete.
      </p>
      <div className="flex items-center gap-3"><Button size="sm" onClick={() => useWorkspace.getState().confirmGoodToGo(entry.id)}>Confirm: move to Awaiting paperwork</Button><WhyButton entry={entry} label="Why is this Good to go?" /></div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useWorkspace } from "@/store/workspace";
import { useResults } from "@/hooks/use-results";
import { dayZero, gateComplete } from "@/lib/onboarding";
import { StatusBadge } from "@/components/app/status-badge";

export default function OnboardingListPage() {
  const onboarding = useWorkspace((s) => s.onboarding);
  const r = useResults();
  const ids = Object.keys(onboarding);
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-4xl font-medium tracking-tight">Onboarding</h1>
      <p className="text-sm text-muted-foreground">Applicants appear here after a reviewer confirms a Good to go recommendation (applicant page → Confirm).</p>
      {ids.length === 0 && <p className="text-sm">No one confirmed yet.</p>}
      <ul className="space-y-2">
        {ids.map((id) => {
          const o = onboarding[id];
          const e = r?.ledger[id];
          const g = o.gate;
          const done = [g.agreement, g.gst, g.other].filter((i) => i.done && i.date).length;
          return (
            <li key={id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 text-sm">
              <Link href={`/onboarding/${encodeURIComponent(id)}`} className="font-mono underline">{id}</Link>
              <span>{e?.name}</span>
              <b>{o.stage}</b>
              <span className="text-xs">Paperwork {done}/3{gateComplete(o) ? `, Day 0 = ${dayZero(o)}` : ""}</span>
              {e && e.status !== "Good to go" && <span className="flex items-center gap-1 text-xs text-[var(--tone-info)]">Engine status is now <StatusBadge status={e.status} /></span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

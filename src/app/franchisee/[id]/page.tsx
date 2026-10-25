"use client";
// Franchisee view, opened via "Preview as franchisee" with no login (demo).
import { useParams } from "next/navigation";
import { useWorkspace } from "@/store/workspace";
import { useResults } from "@/hooks/use-results";
import { DEAL_FIELDS } from "@/lib/onboarding";
import { templateTraining, entryKey } from "@/lib/explain";
import { OnboardingGantt } from "@/components/app/onboarding-gantt";

export default function FranchiseePage() {
  const id = decodeURIComponent(useParams<{ id: string }>().id);
  const o = useWorkspace((s) => s.onboarding[id]);
  const explanations = useWorkspace((s) => s.explanations[id]);
  const r = useResults();
  const e = r?.ledger[id];
  if (!o || !e) return <p className="text-sm">No franchisee view for {id} yet.</p>;
  const aiTraining = explanations?.data.by === "AI" && explanations.key === entryKey(e, explanations.data.language) ? explanations.data.training : null;
  const training = aiTraining ?? templateTraining(e);
  const terms = DEAL_FIELDS.filter(([k]) => o.deal[k].trim());
  return (
    <div className="space-y-4">
      <p className="rounded bg-[var(--tone-wait-bg)] p-2 text-xs text-[var(--tone-wait)]">Preview as franchisee: what {e.name} would see after signing in. No login is needed for this demo.</p>
      <h1 className="text-[26px] font-semibold tracking-tight md:text-3xl">Welcome, {e.name}</h1>
      <p className="text-sm">Application {id} · {e.city} · pin code of this store: {o.deal.storePin || e.pin}</p>
      <div className="rounded-[20px] border bg-card p-5 text-sm">
        <h3 className="text-base font-semibold">Paperwork</h3>
        <ul className="mt-1 space-y-1">
          <li>{o.gate.agreement.done ? "✓" : "○"} Franchise agreement signed</li>
          <li>{o.gate.gst.done ? "✓" : "○"} GST registration</li>
          <li>{o.gate.other.done ? "✓" : "○"} Other legal registrations{o.gate.other.list ? `: ${o.gate.other.list}` : ""}</li>
        </ul>
      </div>
      <div className="rounded-[20px] border bg-card p-5 text-sm">
        <h3 className="text-base font-semibold">Deal terms</h3>
        {terms.length === 0 ? <p className="text-muted-foreground">Not entered yet.</p> : <ul className="mt-1">{terms.map(([k, l]) => <li key={k}><b>{l}:</b> {o.deal[k]}</li>)}</ul>}
      </div>
      <div className="rounded-[20px] border bg-card p-5 text-sm">
        <h3 className="text-base font-semibold">Your training plan</h3>
        <ul className="ml-5 list-disc">{training.map((t, i) => <li key={i}><b>{t.module}</b>: {t.why}</li>)}</ul>
        <p className="text-xs text-muted-foreground">Durations are set by the brand.</p>
      </div>
      <OnboardingGantt id={id} o={o} readOnly />
    </div>
  );
}

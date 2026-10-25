"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useWorkspace } from "@/store/workspace";
import { useResults } from "@/hooks/use-results";
import { PaperworkGate } from "@/components/app/paperwork-gate";
import { DealTermsForm } from "@/components/app/deal-terms-form";
import { FranchiseeAccount } from "@/components/app/franchisee-account";
import { EmailDraft } from "@/components/app/email-draft";
import { OnboardingGantt } from "@/components/app/onboarding-gantt";
import { StatusBadge } from "@/components/app/status-badge";
import { WhyButton } from "@/components/app/why-button";

export default function OnboardingPage() {
  const id = decodeURIComponent(useParams<{ id: string }>().id);
  const o = useWorkspace((s) => s.onboarding[id]);
  const languages = useWorkspace((s) => s.dataset?.languages ?? []);
  const r = useResults();
  const e = r?.ledger[id];
  if (!o || !e) return <p className="text-sm">{id} is not in onboarding. <Link href="/onboarding" className="underline">Back</Link></p>;
  const language = languages.find((l) => l.toLowerCase() === e.language.toLowerCase()) ?? "English";
  return (
    <div className="space-y-4">
      <Link href="/onboarding" className="text-sm underline">← Onboarding</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[26px] font-semibold tracking-tight md:text-3xl">{id} · {e.name}</h1>
        <span className="rounded-md border px-2 py-0.5 text-xs font-medium">Stage: {o.stage}</span>
        <StatusBadge status={e.status} /><WhyButton entry={e} />
      </div>
      {e.status !== "Good to go" && <p className="rounded bg-[var(--tone-info-bg)] p-2 text-sm text-[var(--tone-info)]">Note: the engine status is now &quot;{e.status}&quot;. Review before continuing.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <PaperworkGate id={id} o={o} />
          <FranchiseeAccount id={id} name={e.name} o={o} />
          <EmailDraft id={id} name={e.name} language={language} o={o} />
        </div>
        <div className="space-y-4">
          <DealTermsForm id={id} o={o} />
        </div>
      </div>
      <OnboardingGantt id={id} o={o} />
    </div>
  );
}

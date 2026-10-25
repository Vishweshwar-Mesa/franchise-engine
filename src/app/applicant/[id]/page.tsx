"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useResults } from "@/hooks/use-results";
import { useWorkspace } from "@/store/workspace";
import { ExplanationCard } from "@/components/app/explanation-card";
import { LedgerView } from "@/components/app/ledger-view";
import { ManualStatusForm } from "@/components/app/manual-status-form";
import { AreaTypeSelect, FinancialProfileForm, QuestionsCard, RelevanceCard, SiteDetailsForm } from "@/components/app/reviewer-inputs";
import { StatusBadge } from "@/components/app/status-badge";
import { WhyButton } from "@/components/app/why-button";
import { FactorBar } from "@/components/app/traffic-light";
import { NoData } from "@/components/app/empty-state";
import { ConfirmButton } from "@/components/app/confirm-button";
import { AreaSnapshot } from "@/components/app/area-snapshot";
import { PeopleResearch } from "@/components/app/people-research";
import { columnLabel } from "@/lib/parse";

export default function ApplicantPage() {
  const { id: raw } = useParams<{ id: string }>();
  const id = decodeURIComponent(raw);
  const r = useResults();
  const dataset = useWorkspace((s) => s.dataset);
  const input = useWorkspace((s) => s.reviewer[id]) ?? {};
  if (!r || !dataset) return <NoData />;
  const e = r.ledger[id];
  const app = dataset.applications.find((a) => a.id === id);
  if (!e || !app) return <p className="text-sm">Applicant {id} isn&apos;t in the data. <Link href="/results" className="underline">Back to results</Link></p>;

  const fields: [string, unknown][] = [
    ["name", app.name], ["city", app.city], ["state", app.state], ["pin", app.pin], ["investment", app.investment ?? app.badNumbers.investment],
    ["experience", app.experience ?? app.badNumbers.experience], ["business", app.business], ["spaceAvailable", app.spaceAvailable],
    ["spaceSize", app.spaceSize ?? app.badNumbers.spaceSize], ["floor", app.floor], ["targetLaunch", app.targetLaunch ?? app.badNumbers.targetLaunch],
    ["language", app.language], ["notes", app.notes],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/results" className="text-sm text-muted-foreground hover:text-foreground">← Applicants</Link>
      <header className="flex flex-col gap-3">
        <span className="font-mono text-xs text-muted-foreground">{e.id} · {e.city || "city missing"} · pin {e.pin || "—"} · {e.territory?.id ?? "no territory"}</span>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{e.name || "Name missing"}</h1>
          <StatusBadge status={e.status} />
          <WhyButton entry={e} />
        </div>
        <p className="max-w-3xl text-[15px] text-muted-foreground">{e.reason}</p>
        <p className="max-w-3xl text-xs text-muted-foreground">
          Score {e.total}/100 from four factors. Bar colour is the traffic light: green = strong, amber = middle, red = weak. The score only orders applicants within a territory; the checks decide holds. <a href="/guide#scores" className="text-brand hover:underline">How scoring works</a>
        </p>
        <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
          {e.factors.map((f) => <FactorBar key={f.key} f={f} />)}
        </div>
        {e.rescaled && (
          <p className="max-w-3xl rounded-2xl bg-note px-4 py-2 text-xs">Score {e.total}/100, rescaled because financial profile was not provided ({e.factors.filter((f) => f.provided).map((f) => `${f.label} ${f.max}`).join(" / ")}).</p>
        )}
        {e.flags.filter((f) => f.kind === "liabilities").map((f, i) => (
          <p key={i} className="max-w-3xl rounded-2xl bg-[var(--tone-pin-bg)] px-4 py-2 text-xs text-[var(--tone-pin)]">{f.text}</p>
        ))}
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ExplanationCard entry={e} languages={dataset.languages} />
          <div className="rounded-[20px] border bg-card p-5"><h3 className="text-base font-semibold">Reason ledger</h3><p className="mb-3 text-xs text-muted-foreground">Everything the engine checked for this applicant, in order, with the result and whether it is a case rule (fixed) or our choice (editable in Settings). The status above comes only from this.</p><LedgerView entry={e} /></div>
        </div>
        <div className="space-y-4">
          <ConfirmButton entry={e} />
          <QuestionsCard entry={e} />
          <ManualStatusForm key={e.manual?.at ?? "none"} entry={e} />
          <FinancialProfileForm key={JSON.stringify([input.netWorth, input.portfolio, input.liabilities])} id={id} input={input} />
          {(app.spaceAvailable === "Owned" || app.spaceAvailable === "Rented") && (
            <SiteDetailsForm key={JSON.stringify(input.site ?? {})} id={id} input={input} rented={app.spaceAvailable === "Rented"} />
          )}
          <RelevanceCard entry={e} input={input} />
          <div className="rounded-[20px] border bg-card p-5"><AreaTypeSelect id={id} value={input.areaType} /></div>
          <AreaSnapshot pin={app.pin} city={app.city} />
          <PeopleResearch name={app.name} city={app.city} business={app.business} />
          <div className="rounded-[20px] border bg-card p-5 text-sm">
            <h3 className="mb-2 text-base font-semibold">Application (row {app.rowNumber})</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {fields.map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-muted-foreground">{columnLabel(k)}</dt><dd>{v === null || v === "" || v === undefined ? "—" : String(v)}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useResults } from "@/hooks/use-results";
import { useWorkspace } from "@/store/workspace";
import { ExplanationCard } from "@/components/app/explanation-card";
import { LedgerView } from "@/components/app/ledger-view";
import { ManualStatusForm } from "@/components/app/manual-status-form";
import { AreaTypeSelect, FinancialProfileForm, RelevanceCard } from "@/components/app/reviewer-inputs";
import { StatusBadge } from "@/components/app/status-badge";
import { WhyButton } from "@/components/app/why-button";
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
  const ai = useWorkspace((s) => s.ai[id]);
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
    <div className="space-y-4">
      <Link href="/results" className="text-sm underline">← Results</Link>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{e.id} · {e.name || "name missing"}</h1>
          <StatusBadge status={e.status} />
          <WhyButton entry={e} />
        </div>
        <p className="text-sm">{e.reason}</p>
        {e.rescaled && (
          <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">Score rescaled because financial profile was not provided (Space 50 / Money 25 / Experience 25).</p>
        )}
        {e.flags.filter((f) => f.kind === "liabilities").map((f, i) => (
          <p key={i} className="rounded bg-red-50 px-2 py-1 text-xs text-red-900">⚠ {f.text}</p>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ExplanationCard entry={e} languages={dataset.languages} />
          <div className="rounded-xl border p-4"><h3 className="mb-2 font-semibold">Reason ledger</h3><LedgerView entry={e} /></div>
        </div>
        <div className="space-y-4">
          <ConfirmButton entry={e} />
          <ManualStatusForm key={e.manual?.at ?? "none"} entry={e} />
          <FinancialProfileForm key={JSON.stringify([input.netWorth, input.portfolio, input.liabilities])} id={id} input={input} />
          <RelevanceCard entry={e} input={input} aiFlag={ai?.contradiction ?? null} />
          <div className="rounded-xl border p-4"><AreaTypeSelect id={id} value={input.areaType} /></div>
          <AreaSnapshot pin={app.pin} city={app.city} />
          <PeopleResearch name={app.name} city={app.city} business={app.business} />
          <div className="rounded-xl border p-4 text-sm">
            <h3 className="mb-2 font-semibold">Application (row {app.rowNumber})</h3>
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

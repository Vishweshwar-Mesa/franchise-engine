"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApplicantList } from "@/components/app/applicant-list";
import { ApplicantsTable } from "@/components/app/applicants-table";
import { NoData } from "@/components/app/empty-state";
import { NativeSelect } from "@/components/app/native-select";
import { PageHeader } from "@/components/app/page-header";
import { StatusCounts } from "@/components/app/status-counts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useResults } from "@/hooks/use-results";
import { downloadExport } from "@/lib/export";
import { cn } from "@/lib/utils";
import { STATUSES, type Status } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";

const CHIPS: { label: string; match: (s: Status) => boolean }[] = [
  { label: "All", match: () => true },
  { label: "Good to go", match: (s) => s === "Good to go" },
  { label: "Your decision", match: (s) => s === "Needs your decision" },
  { label: "Holds", match: (s) => s.startsWith("Hold") },
  { label: "Waitlist", match: (s) => s === "Waitlist" },
];

export default function ResultsPage() {
  return (
    <Suspense>
      <Results />
    </Suspense>
  );
}

function Results() {
  const r = useResults();
  const initial = useSearchParams().get("status");
  const fileName = useWorkspace((s) => s.dataset?.report.fileName ?? "");
  const [status, setStatus] = useState<Status | null>(STATUSES.find((x) => x === initial) ?? null);
  const [chip, setChip] = useState(0);
  const [territory, setTerritory] = useState("");
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [showTotal, setShowTotal] = useState(false);
  const [view, setView] = useState<"cards" | "table">("cards");

  const rows = useMemo(() => {
    if (!r) return [];
    const q = search.trim().toLowerCase();
    return r.order
      .map((id) => r.ledger[id])
      .filter((e) => (status ? e.status === status : CHIPS[chip].match(e.status)))
      .filter((e) => (!territory || e.territory?.id === territory) && (!city || e.city === city))
      .filter((e) => !q || [e.id, e.name, e.pin, e.city].some((v) => v.toLowerCase().includes(q)));
  }, [r, status, chip, territory, city, search]);

  if (!r) return <NoData />;
  const cities = [...new Set(r.order.map((id) => r.ledger[id].city).filter(Boolean))].sort();
  const pending = r.contests.filter((c) => !c.decision?.winnerId).length;
  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Applicants"
        sub={<>From {fileName} · {r.territories.length} territories{pending ? ` · ${pending} contested pin${pending > 1 ? "s" : ""} waiting on your call` : ""}</>}
        actions={
          <>
            <Button variant="outline" className="h-10 rounded-[10px] px-4" onClick={() => downloadExport(r, "csv")}>Export CSV</Button>
            <Button variant="outline" className="h-10 rounded-[10px] px-4" onClick={() => downloadExport(r, "xlsx")}>Export XLSX</Button>
          </>
        }
      />
      <StatusCounts counts={r.counts} active={status} onPick={(s) => { setStatus(s); setChip(0); }} />
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Showing {rows.length}</h2>
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((c, i) => (
              <button
                key={c.label}
                type="button"
                aria-pressed={!status && chip === i}
                onClick={() => { setChip(i); setStatus(null); }}
                className={cn("h-9 rounded-full border px-4 text-[13px] font-semibold transition-colors", !status && chip === i ? "border-transparent bg-foreground text-background" : "hover:bg-muted")}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="search" className="sr-only">Search</label>
          <Input id="search" className="h-10 w-64 rounded-full px-4" placeholder="Search ID, name, pin" value={search} onChange={(e) => setSearch(e.target.value)} />
          <label htmlFor="f-status" className="sr-only">Status</label>
          <NativeSelect id="f-status" className="h-10 rounded-full px-3" value={status ?? ""} onChange={(e) => setStatus((e.target.value || null) as Status | null)}>
            <option value="">Any status</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </NativeSelect>
          <label htmlFor="f-ter" className="sr-only">Territory</label>
          <NativeSelect id="f-ter" className="h-10 rounded-full px-3" value={territory} onChange={(e) => setTerritory(e.target.value)}>
            <option value="">All territories</option>
            {r.territories.map((t) => <option key={t.id}>{t.id}</option>)}
          </NativeSelect>
          <label htmlFor="f-city" className="sr-only">City</label>
          <NativeSelect id="f-city" className="h-10 rounded-full px-3" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </NativeSelect>
          <div className="ml-auto flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><Switch checked={showTotal} onCheckedChange={setShowTotal} /> Total /100</label>
            <div className="inline-flex rounded-full border p-1">
              {(["cards", "table"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn("h-8 rounded-full px-3 text-[13px] font-semibold capitalize", view === v ? "bg-foreground text-background" : "text-muted-foreground")}>{v}</button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          The four dots on each card are the score factors, in order Space · Money · Experience · Financial profile: green = strong, amber = middle, red = weak, hollow = not provided.
          Money, experience and finances are compared with the other applicants in this file. <a href="/guide#scores" className="text-brand hover:underline">More on scores</a>
        </p>
        {view === "cards" ? <ApplicantList rows={rows} showTotal={showTotal} /> : <div className="overflow-hidden rounded-[20px] border bg-card"><ApplicantsTable rows={rows} showTotal={showTotal} /></div>}
      </section>
    </div>
  );
}

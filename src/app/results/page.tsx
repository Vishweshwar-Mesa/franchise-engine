"use client";
import { useMemo, useState } from "react";
import { ApplicantsTable } from "@/components/app/applicants-table";
import { NoData } from "@/components/app/empty-state";
import { NativeSelect } from "@/components/app/native-select";
import { StatusCounts } from "@/components/app/status-counts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useResults } from "@/hooks/use-results";
import { downloadExport } from "@/lib/export";
import { STATUSES, type Status } from "@/lib/types";

export default function ResultsPage() {
  const r = useResults();
  const [status, setStatus] = useState<Status | null>(null);
  const [territory, setTerritory] = useState("");
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [showTotal, setShowTotal] = useState(false);

  const rows = useMemo(() => {
    if (!r) return [];
    const q = search.trim().toLowerCase();
    return r.order
      .map((id) => r.ledger[id])
      .filter((e) => (!status || e.status === status) && (!territory || e.territory?.id === territory) && (!city || e.city === city))
      .filter((e) => !q || [e.id, e.name, e.pin, e.city].some((v) => v.toLowerCase().includes(q)));
  }, [r, status, territory, city, search]);

  if (!r) return <NoData />;
  const cities = [...new Set(r.order.map((id) => r.ledger[id].city).filter(Boolean))].sort();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Results</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadExport(r, "csv")}>Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => downloadExport(r, "xlsx")}>Export XLSX</Button>
        </div>
      </div>
      <StatusCounts counts={r.counts} active={status} onPick={setStatus} />
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect value={status ?? ""} onChange={(e) => setStatus((e.target.value || null) as Status | null)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </NativeSelect>
        <NativeSelect value={territory} onChange={(e) => setTerritory(e.target.value)}>
          <option value="">All territories</option>
          {r.territories.map((t) => <option key={t.id}>{t.id}</option>)}
        </NativeSelect>
        <NativeSelect value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {cities.map((c) => <option key={c}>{c}</option>)}
        </NativeSelect>
        <Input className="w-56" placeholder="Search ID, name, pin" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="ml-auto flex items-center gap-2 text-sm">
          <Switch checked={showTotal} onCheckedChange={setShowTotal} /> Show total /100
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Dots: Space · Money · Experience · Financial profile. Green = top third, amber = middle, red = bottom third (relative factors compare with the other applicants in this file). Grey = not provided.
        Statuses are recommendations: a human confirms every one. Click a row for the full ledger.
      </p>
      <div className="rounded-xl border">
        <ApplicantsTable rows={rows} showTotal={showTotal} />
      </div>
    </div>
  );
}

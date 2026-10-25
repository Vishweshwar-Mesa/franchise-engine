"use client";
import Link from "next/link";
import type { EngineResult, TerritorySummary } from "@/lib/engine";
import { useWorkspace } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { SourceTag } from "./source-tag";
import { WhyButton } from "./why-button";

export function TerritoryCard({ t, r }: { t: TerritorySummary; r: EngineResult }) {
  const confirmed = useWorkspace((s) => s.waitlist[t.id]);
  const changed = confirmed && confirmed.order.join() !== t.waitlist.join();
  const row = (id: string) => {
    const e = r.ledger[id];
    return (
      <li key={id} className="flex flex-wrap items-center gap-2">
        <Link href={`/applicant/${encodeURIComponent(id)}`} className="font-mono text-xs underline">{id}</Link>
        <span>{e.name}</span><span className="font-mono text-xs">{e.pin}</span><span className="text-xs">score {e.total}</span>
        <StatusBadge status={e.status} /><WhyButton entry={e} />
      </li>
    );
  };
  return (
    <div className="space-y-2 rounded-3xl border bg-card p-5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-lg font-medium">{t.id} · {t.city} <span className="font-normal text-muted-foreground">({t.tier}, priority {t.priority || "not set"})</span></h3>
        <span className="flex items-center gap-1 text-xs">Capacity = min({t.openSlots} open slots, {t.freePins.length} free pins) = <b>{t.capacity}</b> <SourceTag source="Case rule" /></span>
      </div>
      <p className="text-xs">
        Free pins: {t.freePins.join(", ") || "none"}.{" "}
        {t.occupied.length > 0 && <>Pins with an existing store: {t.occupied.map((o) => `${o.pin} (${o.storeId})`).join(", ")}.</>}
      </p>
      {t.pendingContests.length > 0 && (
        <p className="text-xs text-[var(--tone-decide)]">Contested pin(s) {t.pendingContests.join(", ")} each hold one slot until you decide on the <Link href="/contested" className="underline">Contested pins</Link> board.</p>
      )}
      <div>
        <h4 className="font-medium">Assigned (Good to go): {t.goodToGo.length}</h4>
        <ul className="space-y-1">{t.goodToGo.map(row)}</ul>
      </div>
      <div>
        <h4 className="font-medium">Waitlist, recommended order: {t.waitlist.length}</h4>
        <ol className="list-decimal space-y-1 pl-5">{t.waitlist.map(row)}</ol>
        {t.waitlist.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Button size="xs" variant="outline" onClick={() => useWorkspace.getState().confirmWaitlist(t.id, t.waitlist)}>
              {confirmed ? "Re-confirm order" : "Confirm order"}
            </Button>
            {confirmed && !changed && <span className="text-[var(--tone-good)]">Confirmed {new Date(confirmed.at).toLocaleString()}</span>}
            {changed && <span className="text-[var(--tone-info)]">The recommended order changed since you confirmed ({confirmed.order.join(", ")}).</span>}
            <span className="text-muted-foreground">Order = score, highest first (ties by Application ID). Territory priority is not scored.</span>
          </div>
        )}
      </div>
      {t.holds.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer">On hold in this territory: {t.holds.length}</summary>
          <ul className="mt-1 space-y-1">{t.holds.map(row)}</ul>
        </details>
      )}
    </div>
  );
}

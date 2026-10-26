"use client";
import { useResults } from "@/hooks/use-results";
import { NoData } from "@/components/app/empty-state";
import { TerritoryCard } from "@/components/app/territory-card";

export default function TerritoriesPage() {
  const r = useResults();
  if (!r) return <NoData />;
  const unmatched = Object.values(r.ledger).filter((e) => !e.territory);
  return (
    <div className="space-y-4">
      <div className="flex max-w-3xl flex-col gap-1.5">
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight uppercase italic md:text-5xl">Territories</h1>
        <p className="text-sm text-muted-foreground">
          A territory is a group of pin codes where the brand wants new stores. Its capacity is the smaller of its open slots and its free pins (pins with no existing store), a rule from the case.
          The highest scorers get the slots; the rest wait in score order. Priority is shown for context only and is not scored.
        </p>
      </div>
      {r.territories.length === 0 && <p className="text-sm">No territories in this file.</p>}
      {r.territories.map((t) => <TerritoryCard key={t.id} t={t} r={r} />)}
      {unmatched.length > 0 && (
        <p className="text-sm text-muted-foreground">Not matched to any territory (by pin code): {unmatched.map((e) => e.id).join(", ")}.</p>
      )}
    </div>
  );
}

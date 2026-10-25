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
      <h1 className="text-xl font-semibold">Territories</h1>
      {r.territories.length === 0 && <p className="text-sm">No territories in this file.</p>}
      {r.territories.map((t) => <TerritoryCard key={t.id} t={t} r={r} />)}
      {unmatched.length > 0 && (
        <p className="text-sm text-muted-foreground">Not matched to any territory (by pin code): {unmatched.map((e) => e.id).join(", ")}.</p>
      )}
    </div>
  );
}

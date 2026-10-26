"use client";
import { useResults } from "@/hooks/use-results";
import { NoData } from "@/components/app/empty-state";
import { ContestCard } from "@/components/app/contest-card";

export default function ContestedPage() {
  const r = useResults();
  if (!r) return <NoData />;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight uppercase italic md:text-5xl">Contested pins</h1>
      <p className="text-sm text-muted-foreground">
        Case rule: the brand never opens two stores in the same pin code. When two or more qualified applicants want the same free pin, the tool does not pick. You do.
      </p>
      {r.contests.length === 0 && <p className="text-sm">No contested pins in this file.</p>}
      {r.contests.map((c) => <ContestCard key={c.pin} c={c} r={r} />)}
    </div>
  );
}

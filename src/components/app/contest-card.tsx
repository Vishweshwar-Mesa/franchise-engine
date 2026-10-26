"use client";
import Link from "next/link";
import type { ContestSummary, EngineResult, LedgerEntry } from "@/lib/engine";
import { useWorkspace } from "@/store/workspace";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "./native-select";
import { StatusBadge } from "./status-badge";
import { TrafficLight } from "./traffic-light";
import { WhyButton } from "./why-button";

function strengthsAndConcerns(e: LedgerEntry) {
  const strengths = e.factors.filter((f) => f.provided && f.light === "green").map((f) => `${f.label} ${f.points}/${f.max}`);
  const concerns = [
    ...e.factors.filter((f) => f.provided && f.light === "red").map((f) => `${f.label} ${f.points}/${f.max}`),
    ...e.checks.filter((c) => c.result === "warn").map((c) => c.detail),
    ...e.flags.map((f) => f.text),
  ];
  if (!e.financialProvided) concerns.push("Financial profile not provided (score rescaled).");
  return { strengths, concerns };
}

/** Side-by-side view of applicants wanting the same pin. The tool never picks. */
export function ContestCard({ c, r }: { c: ContestSummary; r: EngineResult }) {
  const setContest = useWorkspace((s) => s.setContest);
  const decision = useWorkspace((s) => s.contests[c.pin]);
  return (
    <div className="space-y-3 rounded-[20px] border bg-card p-5 text-sm">
      <h3 className="text-base font-semibold">Pin {c.pin} · {c.territoryId}: {c.applicantIds.length} qualified applicants</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {c.applicantIds.map((id) => {
          const e = r.ledger[id];
          const { strengths, concerns } = strengthsAndConcerns(e);
          return (
            <div key={id} className="space-y-2 rounded-2xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/applicant/${encodeURIComponent(id)}`} className="font-mono text-xs underline">{id}</Link>
                <span className="font-medium">{e.name}</span>
                <StatusBadge status={e.status} />
                <WhyButton entry={e} />
              </div>
              <p>Total {e.total}/100 · {e.rank ? `rank ${e.rank} of ${e.rankOf}` : "not ranked"} in {c.territoryId}</p>
              <ul className="space-y-0.5 text-xs">
                {e.factors.map((f) => (
                  <li key={f.key} className="flex items-center gap-2"><TrafficLight light={f.light} /> {f.label}: {f.provided ? `${f.points}/${f.max}` : "not provided"}</li>
                ))}
              </ul>
              <div className="text-xs"><b>Strengths:</b> {strengths.join("; ") || "none stand out"}</div>
              <div className="text-xs"><b>Concerns:</b> {concerns.join("; ") || "none recorded"}</div>
            </div>
          );
        })}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <div>
          <Label htmlFor={`notes-${c.pin}`}>Reviewer notes</Label>
          <Textarea id={`notes-${c.pin}`} rows={2} defaultValue={decision?.notes ?? ""} onBlur={(e) => setContest(c.pin, { notes: e.target.value })} />
        </div>
        <div>
          <Label htmlFor={`call-${c.pin}`}>Reviewer&apos;s call</Label>
          <NativeSelect id={`call-${c.pin}`} value={decision?.winnerId ?? ""} onChange={(e) => setContest(c.pin, { winnerId: e.target.value || null })}>
            <option value="">Undecided</option>
            {c.applicantIds.map((id) => <option key={id} value={id}>{id} · {r.ledger[id].name}</option>)}
          </NativeSelect>
          <p className="mt-1 max-w-56 text-xs text-muted-foreground">The chosen applicant then competes for a slot by score; the others move to Hold: pin occupied.</p>
        </div>
      </div>
    </div>
  );
}

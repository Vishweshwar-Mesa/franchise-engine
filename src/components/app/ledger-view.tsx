import type { LedgerEntry } from "@/lib/engine";
import { SourceTag } from "./source-tag";
import { StatusBadge } from "./status-badge";
import { TrafficLight } from "./traffic-light";

const RESULT: Record<string, string> = { pass: "✓ pass", fail: "✗ fix", warn: "! warn", info: "• note" };

/** The full reason ledger for one applicant. Everything shown comes from the entry. */
export function LedgerView({ entry: e, compact = false }: { entry: LedgerEntry; compact?: boolean }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={e.status} />
          {e.manual && <span className="text-xs text-muted-foreground">(engine said: {e.engineStatus})</span>}
        </div>
        <p>{e.reason}</p>
      </div>

      <section>
        <h4 className="mb-1 font-semibold">Checks</h4>
        <table className="w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr><th className="py-1 pr-2">Check</th><th className="pr-2">Input</th><th className="pr-2">Result</th><th>Source</th></tr>
          </thead>
          <tbody>
            {e.checks.map((c) => (
              <tr key={c.key} className="border-t align-top">
                <td className="py-1 pr-2">{c.label}{!compact && <div className="text-muted-foreground">{c.detail}</div>}</td>
                <td className="pr-2 break-all">{c.input}</td>
                <td className="pr-2 whitespace-nowrap">{RESULT[c.result]}</td>
                <td><SourceTag source={c.source} /></td>
              </tr>
            ))}
            <tr className="border-t align-top">
              <td className="py-1 pr-2">Territory capacity = min(open slots, free pins)</td>
              <td className="pr-2">{e.territory?.id ?? "no territory"}</td>
              <td className="pr-2">{e.slot ? `slot ${e.slot.position} of ${e.slot.capacity}` : e.waitlistPosition ? `waitlist #${e.waitlistPosition}` : "—"}</td>
              <td><SourceTag source="Case rule" /></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h4 className="mb-1 font-semibold">Score: {e.total}/100</h4>
        {e.rescaled && <p className="mb-1 text-xs text-amber-800">Score rescaled because financial profile was not provided.</p>}
        <div className="space-y-2">
          {e.factors.map((f) => (
            <div key={f.key}>
              <div className="flex items-center gap-2 font-medium">
                <TrafficLight light={f.light} /> {f.label}: {f.provided ? `${f.points}/${f.max}` : "not provided"}
                {f.relative && <span className="text-xs font-normal text-muted-foreground">(relative to other applicants)</span>}
                <SourceTag source="Our choice" />
              </div>
              {f.provided && (
                <ul className="ml-5 list-disc text-xs text-muted-foreground">
                  {f.parts.map((p) => (
                    <li key={p.label}>{p.label}: {p.value} → {p.points}/{p.max}{p.note ? ` (${p.note})` : ""}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Business relevance: {e.relevance.rating ?? "not rated"} ({e.relevance.by}). {e.relevance.reason}
        </p>
      </section>

      <section className="grid gap-1 text-xs">
        <div><b>Territory:</b> {e.territory ? `${e.territory.id}, ${e.territory.city} (priority ${e.territory.priority || "not set"}; shown for context, not scored)` : "none"}</div>
        <div><b>Rank in territory:</b> {e.rank ? `${e.rank} of ${e.rankOf}` : "not ranked"}</div>
        <div><b>Rubric profile used:</b> {e.profile.name}</div>
        {e.contest && <div><b>Contested pin:</b> {e.contest.pin} with {e.contest.with.join(", ")}{e.contest.decidedWinner ? `; reviewer's call: ${e.contest.decidedWinner}` : "; awaiting reviewer's call"}</div>}
      </section>

      {e.flags.length > 0 && (
        <section>
          <h4 className="mb-1 font-semibold">Flags (do not change score or status)</h4>
          <ul className="ml-5 list-disc text-xs">{e.flags.map((f, i) => <li key={i}>{f.text}</li>)}</ul>
        </section>
      )}
      {e.whatWouldChange.length > 0 && (
        <section>
          <h4 className="mb-1 font-semibold">What would change this</h4>
          <ul className="ml-5 list-disc text-xs">{e.whatWouldChange.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </section>
      )}
      {e.nextSteps.length > 0 && (
        <section>
          <h4 className="mb-1 font-semibold">Next steps</h4>
          <ul className="ml-5 list-disc text-xs">{e.nextSteps.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

"use client";
// The row-level half of the validation report: every applicant the checks put on hold, and why.
import Link from "next/link";
import type { EngineResult } from "@/lib/engine";
import { StatusBadge } from "./status-badge";

export function RowIssues({ r }: { r: EngineResult }) {
  const rows = r.order.map((id) => r.ledger[id]).filter((e) => e.engineStatus === "Hold: info needed" || e.engineStatus === "Hold: pin occupied");
  return (
    <section className="flex flex-col gap-2 rounded-[20px] border bg-card p-5 text-sm">
      <h3 className="text-base font-semibold">Rows with problems: {rows.length} of {r.order.length}</h3>
      <p className="text-xs text-muted-foreground">Applicants the checks put on hold, with exactly what to fix. Everyone else was read and scored normally.</p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">None.</p>
      ) : (
        <ul className="flex max-h-96 flex-col divide-y overflow-y-auto">
          {rows.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 py-2.5 md:flex-row md:items-start md:gap-4">
              <Link href={`/applicant/${encodeURIComponent(e.id)}`} className="w-40 shrink-0 font-mono text-xs hover:underline">{e.id} · {e.name || "no name"}</Link>
              <StatusBadge status={e.engineStatus} />
              <span className="text-muted-foreground">{e.fixes.length ? e.fixes.join(" ") : e.reason}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

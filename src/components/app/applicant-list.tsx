"use client";
import Link from "next/link";
import type { LedgerEntry } from "@/lib/engine";
import { StatusBadge } from "./status-badge";
import { FactorLights } from "./traffic-light";
import { WhyButton } from "./why-button";
import { useStaggerIn } from "./motion";

/** Applicants as cards with the one-line reason inline (V2 Warm Editorial). */
export function ApplicantList({ rows, showTotal }: { rows: LedgerEntry[]; showTotal: boolean }) {
  const ref = useStaggerIn<HTMLUListElement>(rows.map((r) => r.id).join());
  if (rows.length === 0) return <p className="rounded-[20px] border bg-card p-6 text-sm text-muted-foreground">No applicants match these filters.</p>;
  return (
    <ul ref={ref} className="flex flex-col gap-2.5">
      {rows.map((e) => (
        <li key={e.id} className="group flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border bg-card px-5 py-4 transition-colors lg:grid lg:grid-cols-[minmax(13rem,1.1fr)_11rem_minmax(0,2fr)_auto] hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))]">
          <Link href={`/applicant/${encodeURIComponent(e.id)}`} className="flex min-w-56 flex-1 flex-col gap-0.5 outline-none lg:min-w-0">
            <span className="text-base font-bold group-hover:underline">{e.name || "Name missing"}</span>
            <span className="text-[13px] text-muted-foreground">
              <span className="font-mono">{e.id}</span> · {e.city || "city missing"} · pin <span className="font-mono">{e.pin || "—"}</span> · <span className="whitespace-nowrap">{e.territory?.id ?? "no territory"}</span>
              {e.rank ? <span className="whitespace-nowrap"> · rank {e.rank}/{e.rankOf}</span> : null}
            </span>
          </Link>
          <div><StatusBadge status={e.status} /></div>
          <p className="min-w-64 flex-[1.4] text-[13px] leading-snug text-muted-foreground lg:min-w-0">{e.reason}</p>
          <div className="flex items-center gap-4">
            <FactorLights factors={e.factors} total={e.total} showTotal={showTotal} />
            {e.flags.some((f) => f.kind === "liabilities") && <span className="text-xs font-semibold text-[var(--tone-pin)]">Liabilities noted</span>}
            <WhyButton entry={e} />
          </div>
        </li>
      ))}
    </ul>
  );
}

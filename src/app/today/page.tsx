"use client";
// Today: the bento command center. Every number comes from the engine's ledger,
// the onboarding records and the action log; nothing here is computed separately.
import Link from "next/link";
import { useResults } from "@/hooks/use-results";
import { useWorkspace } from "@/store/workspace";
import { Tile } from "@/components/app/bento";
import { CountUp, useStaggerIn } from "@/components/app/motion";
import { NoData } from "@/components/app/empty-state";
import { StatusBadge, TONE, toneStyle } from "@/components/app/status-badge";
import { WhyButton } from "@/components/app/why-button";
import { gateComplete } from "@/lib/onboarding";
import { STATUSES, type Status } from "@/lib/types";

const SHORT: Record<Status, string> = {
  "Good to go": "Good to go",
  "Needs your decision": "Your decision",
  "Hold: info needed": "Info needed",
  "Hold: pin occupied": "Pin occupied",
  Waitlist: "Waitlist",
  "Not proceeding": "Not proceeding",
};
/** Failed check key prefix -> the problem in plain words (for the holds tile). */
const PROBLEM: [string, string][] = [
  ["required", "missing required fields"], ["number-", "text in a number column"], ["pin-format", "pin not 6 digits"],
  ["city-allowed", "city not in the allowed list"], ["pin-prefix", "pin doesn't match the city"], ["territory", "no territory covers the pin"],
  ["space-identified", "no space yet"], ["space-value", "unknown space value"], ["state-city", "state doesn't match the city"],
  ["contradiction", "contradictory details"], ["investment", "investment not above 0"], ["experience", "negative experience"],
];
const bar = (s: Status) => `var(--bar-${TONE[s]})`;
const statusHref = (s: Status) => `/results?status=${encodeURIComponent(s)}`;

export default function TodayPage() {
  const r = useResults();
  const fileName = useWorkspace((s) => s.dataset?.report.fileName ?? "");
  const onboarding = useWorkspace((s) => s.onboarding);
  const log = useWorkspace((s) => s.log);
  const waitlistConf = useWorkspace((s) => s.waitlist);
  const gridRef = useStaggerIn<HTMLDivElement>(fileName);
  if (!r) return <NoData />;

  const entries = r.order.map((id) => r.ledger[id]);
  const total = entries.length;
  const pending = r.contests.filter((c) => !c.decision?.winnerId);
  const holds = entries.filter((e) => e.status === "Hold: info needed");
  const fixCounts = new Map<string, number>();
  for (const e of holds) {
    const first = e.checks.find((c) => c.result === "fail");
    if (first) {
      const problem = PROBLEM.find(([prefix]) => first.key.startsWith(prefix))?.[1] ?? first.label.toLowerCase();
      fixCounts.set(problem, (fixCounts.get(problem) ?? 0) + 1);
    }
  }
  const topFix = [...fixCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const onb = Object.entries(onboarding);
  const awaiting = onb.filter(([, o]) => o.stage === "Awaiting paperwork");
  const running = onb.filter(([, o]) => o.stage === "Onboarding");
  const waitlisted = entries.filter((e) => e.status === "Waitlist");
  const unconfirmedWaitlists = r.territories.filter((t) => t.waitlist.length > 0 && waitlistConf[t.id]?.order.join() !== t.waitlist.join()).length;
  const recent = log.filter((l) => l.applicantId && r.ledger[l.applicantId]).slice(0, 5);
  const attention = [...pending.flatMap((c) => c.applicantIds), ...holds.map((e) => e.id)].slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 pt-2">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight uppercase italic md:text-5xl">Today</h1>
          <p className="text-sm text-muted-foreground">Here is what needs your attention. Click a tile to see more. First time here? <Link href="/guide" className="text-brand hover:underline">Read the Guide</Link>.</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {fileName} · {total} applicants · {r.territories.length} territories
        </span>
      </div>

      <div ref={gridRef} className="grid grid-cols-1 gap-3.5 md:grid-cols-6 lg:grid-cols-12 lg:auto-rows-[minmax(150px,auto)]">
        <Tile title="Ready for your confirmation" className="justify-between md:col-span-6 lg:col-span-5 lg:row-span-2">
          <div className="flex flex-col gap-1.5">
            <CountUp value={r.counts["Good to go"]} className="text-8xl leading-[0.9] font-bold tracking-tighter" />
            <p className="text-[15px]">applicants are Good to go. Confirming moves them to paperwork.</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Status mix">
              {STATUSES.filter((s) => r.counts[s] > 0).map((s) => (
                <span key={s} style={{ flex: `${r.counts[s]} 1 0`, background: bar(s) }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground">
              {STATUSES.filter((s) => r.counts[s] > 0).map((s) => (
                <Link key={s} href={statusHref(s)} className="flex items-center gap-1.5 hover:text-foreground">
                  <span className="size-2 rounded-full" style={{ background: bar(s) }} />
                  {SHORT[s]} {r.counts[s]}
                </Link>
              ))}
            </div>
            <Link href={statusHref("Good to go")} className="mt-1.5 self-start rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Review the {r.counts["Good to go"]} →
            </Link>
          </div>
        </Tile>

        <Tile title="Contested pins" href="/contested" className="md:col-span-3 lg:col-span-4" aside={pending.length > 0 && <span style={toneStyle("Needs your decision")} className="rounded-full px-2.5 py-0.5 text-xs font-semibold">{pending.length} need you</span>}>
          {pending.length === 0 ? (
            <p className="text-muted-foreground">None waiting. The case rule: one store per pin.</p>
          ) : (
            pending.slice(0, 3).map((c) => (
              <div key={c.pin} className="flex items-center justify-between gap-2.5 rounded-xl bg-inset px-3 py-2.5">
                <span className="font-mono text-[13px]">{c.pin}</span>
                <span className="truncate text-[13px]">
                  {c.applicantIds.map((id) => r.ledger[id].name || id).join(" vs ")}
                </span>
              </div>
            ))
          )}
        </Tile>

        <Tile title="Holds: info needed" href={statusHref("Hold: info needed")} className="justify-between md:col-span-3 lg:col-span-3">
          <CountUp value={holds.length} className="text-5xl leading-none font-bold tracking-tight" />
          <span className="text-xs text-muted-foreground">{topFix ? `Most common: ${topFix[0]} (${topFix[1]})` : "Nothing to fix."}</span>
        </Tile>

        <Tile title="Territory capacity · assigned / capacity" href="/territories" aside={<span className="hidden text-xs text-muted-foreground sm:inline">capacity = min(open slots, free pins)</span>} className="md:col-span-6 lg:col-span-7">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {r.territories.map((t) => {
              const pct = t.capacity ? Math.round((t.goodToGo.length / t.capacity) * 100) : 0;
              return (
                <div key={t.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-2 text-xs">
                    <span><span className="font-mono">{t.id}</span> {t.city}</span>
                    <span className="text-muted-foreground">
                      {t.goodToGo.length} / {t.capacity}
                      {t.waitlist.length ? ` · ${t.waitlist.length} waiting` : ""}
                      {t.pendingContests.length ? ` · ${t.pendingContests.length} contested` : ""}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-inset">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Tile>

        <Tile title="Onboarding" href="/onboarding" className="md:col-span-2 lg:col-span-4">
          <div className="flex gap-6">
            <div className="flex flex-col"><CountUp value={awaiting.length} className="text-4xl font-bold" /><span className="text-xs text-muted-foreground">awaiting paperwork</span></div>
            <div className="flex flex-col"><CountUp value={running.length} className="text-4xl font-bold" /><span className="text-xs text-muted-foreground">timeline running</span></div>
          </div>
          <span className="text-xs text-muted-foreground">
            {onb.length === 0 ? "Confirm a Good to go applicant to start." : `${onb.filter(([, o]) => gateComplete(o)).length} of ${onb.length} with paperwork complete.`}
          </span>
        </Tile>

        <Tile title="Waitlist" href={statusHref("Waitlist")} className="md:col-span-2 lg:col-span-4">
          <CountUp value={waitlisted.length} className="text-4xl font-bold" />
          <span className="text-xs text-muted-foreground">{unconfirmedWaitlists ? `${unconfirmedWaitlists} territor${unconfirmedWaitlists === 1 ? "y has" : "ies have"} a waitlist order to confirm.` : waitlisted.length ? "All waitlist orders confirmed." : "No waitlists."}</span>
        </Tile>

        <Tile title="Hold: pin occupied" href={statusHref("Hold: pin occupied")} className="md:col-span-2 lg:col-span-4">
          <CountUp value={r.counts["Hold: pin occupied"]} className="text-4xl font-bold" />
          <span className="text-xs text-muted-foreground">An existing store is on their pin. Not a rejection.</span>
        </Tile>
      </div>

      <section className="overflow-hidden rounded-[20px] border bg-card">
        <div className="flex justify-between border-b px-5 py-3.5">
          <span className="font-semibold">{recent.length ? "Recently changed" : "Needs your attention"}</span>
          <Link href="/results" className="text-[13px] text-brand hover:underline">All {total} →</Link>
        </div>
        {(recent.length ? recent.map((l) => ({ id: l.applicantId!, note: l.detail })) : attention.map((id) => ({ id, note: r.ledger[id].reason }))).map(({ id, note }, i) => {
          const e = r.ledger[id];
          return (
            <div key={`${id}-${i}`} className="grid grid-cols-[90px_1fr] items-center gap-3 border-t px-5 py-3 text-[13px] first:border-t-0 hover:bg-inset md:grid-cols-[110px_minmax(0,1.2fr)_220px_minmax(0,2fr)]">
              <Link href={`/applicant/${encodeURIComponent(id)}`} className="font-mono text-muted-foreground hover:text-foreground">{id}</Link>
              <Link href={`/applicant/${encodeURIComponent(id)}`} className="font-semibold hover:underline">{e.name || "Name missing"}</Link>
              <span className="hidden items-center gap-2 md:flex"><StatusBadge status={e.status} /><WhyButton entry={e} /></span>
              <span className="col-span-2 truncate text-muted-foreground md:col-span-1">{note}</span>
            </div>
          );
        })}
        {recent.length === 0 && attention.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">Nothing needs you right now.</p>}
      </section>
    </div>
  );
}

"use client";
// Onboarding across all franchisees: a combined Gantt (one row each) and a task list of
// what is due next. Built from the same timeline rules as the per-person page.
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { addDays, buildTimeline, daysBetween, gateComplete, GATE_LABELS, taskDonePatch, type Onboarding, type TimelineTask } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

export interface OnbRow {
  id: string;
  name: string;
  o: Onboarding;
}

const SEG: Record<string, string> = {
  paperwork: "bg-[var(--bar-info)]",
  stock: "bg-[var(--bar-good)]",
  pos: "bg-[var(--bar-wait)]",
  training: "bg-[var(--bar-decide)]",
  softLaunch: "bg-primary",
};
const LEGEND: [string, string][] = [["paperwork", "Paperwork"], ["stock", "Stock arrival"], ["pos", "POS set-up"], ["training", "Training"], ["softLaunch", "Soft launch"]];

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** One row per franchisee: paperwork, then each phase, payments (diamonds), check-ins (dots), and a today line. */
export function PortfolioGantt({ rows, checkinBase }: { rows: OnbRow[]; checkinBase: "softLaunch" | "day0" }) {
  const now = today();
  const items = rows.map(({ id, name, o }) => {
    const start = o.confirmedAt.slice(0, 10);
    const { day0, tasks } = buildTimeline(o, checkinBase);
    return { id, name, o, start, day0, tasks };
  });
  const from = addDays(items.reduce((m, i) => (i.start < m ? i.start : m), now), -3);
  const to = addDays(now, 45);
  const span = Math.max(1, daysBetween(from, to));
  const pos = (iso: string) => Math.min(100, Math.max(0, (daysBetween(from, iso) / span) * 100));
  const weeks = Array.from({ length: Math.floor(span / 7) + 1 }, (_, i) => addDays(from, i * 7));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {LEGEND.map(([k, l]) => <span key={k} className="flex items-center gap-1.5"><span className={cn("h-2 w-4 rounded-sm", SEG[k])} />{l}</span>)}
        <span className="flex items-center gap-1.5"><span className="size-2 rotate-45 bg-foreground" />Payment due</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border-2 border-primary" />Check-in</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-primary" />Today</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="relative ml-48 h-6 border-b text-[11px] text-muted-foreground">
            {weeks.map((w) => <span key={w} className="absolute top-0 -translate-x-1/2" style={{ left: `${pos(w)}%` }}>{fmt(w)}</span>)}
          </div>
          {items.map(({ id, name, o, start, day0, tasks }) => {
            const gateEnd = day0 ?? now;
            return (
              <div key={id} className="flex items-center border-b last:border-b-0">
                <Link href={`/onboarding/${encodeURIComponent(id)}`} className="flex w-48 shrink-0 flex-col py-3 pr-3 hover:text-brand">
                  <span className="truncate text-sm font-semibold">{name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{id} · {o.stage}</span>
                </Link>
                <div className="relative h-10 flex-1">
                  {weeks.map((w) => <span key={w} className="absolute inset-y-0 w-px bg-border/60" style={{ left: `${pos(w)}%` }} />)}
                  <span
                    title={`Paperwork: ${fmt(start)} → ${day0 ? fmt(day0) : "in progress"}`}
                    className={cn("absolute top-3 h-4 rounded", SEG.paperwork, !day0 && "opacity-50 [background-image:repeating-linear-gradient(45deg,transparent_0_4px,rgba(0,0,0,.25)_4px_8px)]")}
                    style={{ left: `${pos(start)}%`, width: `${Math.max(0.6, pos(gateEnd) - pos(start))}%` }}
                  />
                  {day0 && tasks.map((t) => {
                    if (t.start === null || t.length === null) return null;
                    const s = addDays(day0, t.start);
                    if (t.kind === "phase") {
                      return <span key={t.id} title={`${t.label}: ${fmt(s)} → ${fmt(addDays(s, t.length))}${t.done ? " (done)" : ""}`} className={cn("absolute top-3 h-4 rounded", SEG[t.id], t.done && "opacity-45")} style={{ left: `${pos(s)}%`, width: `${Math.max(0.6, pos(addDays(s, t.length)) - pos(s))}%` }} />;
                    }
                    if (t.kind === "payment") return <span key={t.id} title={`${t.label}: due ${fmt(s)}`} className={cn("absolute top-[17px] size-2 -translate-x-1/2 rotate-45 bg-foreground", t.done && "opacity-40")} style={{ left: `${pos(s)}%` }} />;
                    return <span key={t.id} title={`${t.label}: ${fmt(s)}`} className={cn("absolute top-[15px] size-2.5 -translate-x-1/2 rounded-full border-2 border-primary bg-card", t.done && "bg-primary")} style={{ left: `${pos(s)}%` }} />;
                  })}
                  <span className="absolute inset-y-0 w-px bg-primary" style={{ left: `${pos(now)}%` }} aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Hatched yellow = paperwork still in progress (the timeline only starts once it is complete). Faded bars are done. The view shows 45 days ahead; later check-ins are in the task list.
      </p>
    </div>
  );
}

interface DueTask {
  key: string;
  id: string;
  name: string;
  label: string;
  why: string;
  date: string | null;
  missing: string | null;
  done: boolean;
  toggle: (v: boolean) => void;
}

/** Everything still to do across all franchisees, soonest first, with overdue and missing-date groups. */
export function TaskList({ rows, checkinBase }: { rows: OnbRow[]; checkinBase: "softLaunch" | "day0" }) {
  const set = useWorkspace((s) => s.setOnboarding);
  const now = today();
  const tasks: DueTask[] = [];
  for (const { id, name, o } of rows) {
    if (!gateComplete(o)) {
      for (const k of Object.keys(GATE_LABELS) as (keyof Onboarding["gate"])[]) {
        const g = o.gate[k];
        if (g.done && g.date) continue;
        tasks.push({
          key: `${id}-gate-${k}`, id, name, label: GATE_LABELS[k], why: "Paperwork gate: the timeline starts when all three are done.",
          date: null, missing: "paperwork", done: false,
          toggle: (v) => set(id, { gate: { ...o.gate, [k]: { ...g, done: v, date: v ? g.date ?? now : g.date } } }, `${GATE_LABELS[k]}: ${v ? "ticked" : "unticked"}.`),
        });
      }
      continue;
    }
    const { day0, tasks: tl } = buildTimeline(o, checkinBase);
    for (const t of tl as TimelineTask[]) {
      if (t.done) continue;
      tasks.push({
        key: `${id}-${t.id}`, id, name, label: t.label, why: t.why,
        date: t.start !== null && day0 ? addDays(day0, t.start) : null, missing: t.missing, done: false,
        toggle: (v) => set(id, taskDonePatch(o, t, v), `${t.label}: ${v ? "done" : "not done"}.`),
      });
    }
  }
  const dated = tasks.filter((t) => t.date).sort((a, b) => a.date!.localeCompare(b.date!));
  const groups: [string, DueTask[]][] = [
    ["Overdue", dated.filter((t) => t.date! < now)],
    ["Next 14 days", dated.filter((t) => t.date! >= now && t.date! <= addDays(now, 14))],
    ["Later", dated.filter((t) => t.date! > addDays(now, 14))],
    ["Paperwork to finish", tasks.filter((t) => t.missing === "paperwork")],
    ["Needs a date or duration", tasks.filter((t) => !t.date && t.missing !== "paperwork")],
  ];
  return (
    <div className="flex flex-col gap-5">
      {groups.filter(([, list]) => list.length).map(([title, list]) => (
        <div key={title} className="flex flex-col gap-1">
          <h3 className={cn("text-xs font-semibold tracking-wide uppercase", title === "Overdue" ? "text-[var(--tone-pin)]" : "text-muted-foreground")}>{title} · {list.length}</h3>
          <ul className="flex flex-col">
            {list.map((t) => (
              <li key={t.key} className="flex items-start gap-3 border-b py-2.5 last:border-b-0">
                <Checkbox aria-label={`${t.label} for ${t.name}`} className="mt-0.5" checked={false} onCheckedChange={(v) => t.toggle(!!v)} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm"><b>{t.label}</b> · <Link href={`/onboarding/${encodeURIComponent(t.id)}`} className="hover:underline">{t.name}</Link></span>
                  <span className="text-xs text-muted-foreground">{t.why}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{t.date ? fmt(t.date) : t.missing === "paperwork" ? "pending" : t.missing}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {tasks.length === 0 && <p className="text-sm text-muted-foreground">Nothing left to do.</p>}
    </div>
  );
}

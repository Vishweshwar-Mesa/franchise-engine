"use client";
// Onboarding across all stores, two views of the same tasks:
//  - Gantt: one group per store, one row per task, bars on a shared calendar.
//  - Board: a task manager with a column per due-state and a card per task.
// Tasks come from the same timeline rules as the per-store page (lib/onboarding.ts).
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { addDays, buildTimeline, daysBetween, gateComplete, GATE_LABELS, localDate, taskDonePatch, type Onboarding } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

export interface StoreRow {
  id: string;
  store: string;
  franchisee: string;
  o: Onboarding;
  /** Each store's own colour, so its tasks are recognisable everywhere. */
  color: string;
}

/** Store colours: distinct from each other and from the status colours. */
export const STORE_COLORS = ["#F04898", "#1878B8", "#E0A100", "#5FA22F", "#8B5CF6", "#0E9F9A", "#E8590C", "#64748B"];

type Kind = "paperwork" | "stock" | "pos" | "training" | "softLaunch" | "payment" | "checkin";

export interface Task {
  key: string;
  appId: string;
  store: string;
  color: string;
  franchisee: string;
  label: string;
  why: string;
  kind: Kind;
  /** Start and end dates (YYYY-MM-DD). Null when not placeable yet. */
  start: string | null;
  end: string | null;
  missing: string | null;
  done: boolean;
  toggle: (v: boolean) => void;
}

const COLOR: Record<Kind, string> = {
  paperwork: "bg-[var(--bar-info)]",
  stock: "bg-[var(--bar-good)]",
  pos: "bg-[var(--bar-wait)]",
  training: "bg-[var(--bar-decide)]",
  softLaunch: "bg-primary",
  payment: "bg-foreground",
  checkin: "bg-primary",
};
const KIND_LABEL: Record<Kind, string> = {
  paperwork: "Paperwork", stock: "Stock arrival", pos: "POS set-up", training: "Training", softLaunch: "Soft launch", payment: "Payment", checkin: "Check-in",
};

/** Today's date in the viewer's own timezone (not UTC), as YYYY-MM-DD. */
export const localToday = () => localDate();
const fmt = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** Every onboarding task for every store, with dates where they can be placed. */
export function useTasks(rows: StoreRow[]): Task[] {
  const set = useWorkspace((s) => s.setOnboarding);
  const checkinBase = useWorkspace((s) => s.settings.checkinBase);
  const today = localToday();
  const tasks: Task[] = [];
  for (const { id, store, franchisee, o, color } of rows) {
    const base = { appId: id, store, franchisee, color };
    for (const k of Object.keys(GATE_LABELS) as (keyof Onboarding["gate"])[]) {
      const g = o.gate[k];
      const done = g.done && !!g.date;
      tasks.push({
        ...base, key: `${id}-gate-${k}`, label: GATE_LABELS[k], kind: "paperwork",
        why: "Paperwork gate: the timeline starts when all three are done. Confirm with the brand's legal/CA team.",
        start: o.confirmedAt.slice(0, 10), end: done ? g.date : null, missing: done ? null : "pending", done,
        toggle: (v) => set(id, { gate: { ...o.gate, [k]: { ...g, done: v, date: v ? g.date ?? today : g.date } } }, `${GATE_LABELS[k]}: ${v ? "ticked" : "unticked"}.`),
      });
    }
    if (!gateComplete(o)) continue;
    const { day0, tasks: tl } = buildTimeline(o, checkinBase);
    for (const t of tl) {
      const start = t.start !== null && day0 ? addDays(day0, t.start) : null;
      tasks.push({
        ...base, key: `${id}-${t.id}`, label: t.label, why: t.why,
        kind: t.kind === "phase" ? (t.id as Kind) : t.kind,
        start, end: start && t.length !== null ? addDays(start, Math.max(1, t.length)) : null,
        missing: t.missing, done: t.done,
        toggle: (v) => set(id, taskDonePatch(o, t, v), `${t.label}: ${v ? "done" : "not done"}.`),
      });
    }
  }
  return tasks;
}

/** Gantt: one group per store, one row per task, a shared calendar and a today line. */
export function GanttView({ rows, tasks }: { rows: StoreRow[]; tasks: Task[] }) {
  const today = localToday();
  const dated = tasks.filter((t) => t.start);
  const first = dated.reduce((m, t) => (t.start! < m ? t.start! : m), today);
  const from = addDays(first, -3);
  const to = addDays(today, 60);
  const span = Math.max(1, daysBetween(from, to));
  const pos = (iso: string) => Math.min(100, Math.max(0, (daysBetween(from, iso) / span) * 100));
  const weeks = Array.from({ length: Math.floor(span / 7) + 1 }, (_, i) => addDays(from, i * 7));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {(["paperwork", "stock", "pos", "training", "softLaunch"] as Kind[]).map((k) => <span key={k} className="flex items-center gap-1.5"><span className={cn("h-2 w-4 rounded-sm", COLOR[k])} />{KIND_LABEL[k]}</span>)}
        <span className="flex items-center gap-1.5"><span className="size-2 rotate-45 bg-foreground" />Payment due</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-primary" />Check-in</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-primary" />Today</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border">
        <div className="min-w-[820px]">
          <div className="flex border-b bg-inset text-[11px] text-muted-foreground">
            <div className="w-64 shrink-0 px-3 py-2 font-medium">Store / task</div>
            <div className="relative flex-1">
              {weeks.map((w) => <span key={w} className="absolute top-2 -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos(w)}%` }}>{fmt(w)}</span>)}
            </div>
          </div>
          {rows.map((r) => {
            const mine = tasks.filter((t) => t.appId === r.id);
            const done = mine.filter((t) => t.done).length;
            return (
              <div key={r.id} className="border-b last:border-b-0">
                <Link href={`/onboarding/${encodeURIComponent(r.id)}`} className="flex items-center gap-3 border-l-4 bg-card px-3 py-2.5 hover:bg-inset" style={{ borderLeftColor: r.color }}>
                  <span className="size-3 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden="true" />
                  <span className="text-sm font-semibold">{r.store}</span>
                  <span className="text-xs text-muted-foreground">{r.franchisee} · {r.o.stage} · {done}/{mine.length} tasks done</span>
                </Link>
                {mine.map((t) => (
                  <div key={t.key} className="flex items-center border-l-4 text-[13px]" style={{ borderLeftColor: `${r.color}80` }}>
                    <label className="flex w-64 shrink-0 items-center gap-2 py-1.5 pr-2 pl-6">
                      <Checkbox aria-label={`${t.label} (${r.store})`} checked={t.done} onCheckedChange={(v) => t.toggle(!!v)} />
                      <span className={cn("truncate", t.done && "text-muted-foreground line-through")} title={t.why}>{t.label}</span>
                    </label>
                    <div className="relative h-7 flex-1">
                      {weeks.map((w) => <span key={w} className="absolute inset-y-0 w-px bg-border/50" style={{ left: `${pos(w)}%` }} />)}
                      <span className="absolute inset-y-0 w-px bg-primary" style={{ left: `${pos(today)}%` }} aria-hidden="true" />
                      {!t.start ? (
                        <span className="absolute inset-y-0 left-2 text-[11px] leading-7 text-[var(--tone-info)]">{t.missing === "pending" ? "waiting for paperwork" : t.missing}</span>
                      ) : t.kind === "payment" ? (
                        <span title={`${t.label}: due ${fmt(t.start)}`} className={cn("absolute top-2.5 size-2.5 -translate-x-1/2 rotate-45 bg-foreground", t.done && "opacity-40")} style={{ left: `${pos(t.start)}%` }} />
                      ) : t.kind === "checkin" ? (
                        <span title={`${t.label}: ${fmt(t.start)}`} className={cn("absolute top-2 size-3 -translate-x-1/2 rounded-full border-2 border-primary bg-card", t.done && "bg-primary")} style={{ left: `${pos(t.start)}%` }} />
                      ) : (
                        <span
                          title={`${t.label}: ${fmt(t.start)}${t.end ? ` → ${fmt(t.end)}` : " → in progress"}`}
                          className={cn("absolute top-1.5 h-4 rounded", COLOR[t.kind], t.done && "opacity-40", !t.end && "opacity-60 [background-image:repeating-linear-gradient(45deg,transparent_0_4px,rgba(0,0,0,.25)_4px_8px)]")}
                          style={{ left: `${pos(t.start)}%`, width: `${Math.max(0.8, pos(t.end ?? today) - pos(t.start))}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Hover a task for why it exists. Hatched bars are still in progress (paperwork runs until the last item is ticked). Faded bars are done. The calendar shows 60 days ahead; later check-ins are on the board.
      </p>
    </div>
  );
}

const COLUMNS: { id: string; title: string; hint: string; match: (t: Task, today: string) => boolean }[] = [
  { id: "paperwork", title: "Paperwork", hint: "Must be done before the timeline starts", match: (t) => !t.done && t.kind === "paperwork" },
  { id: "overdue", title: "Overdue", hint: "Should have started already", match: (t, d) => !t.done && t.kind !== "paperwork" && !!t.start && t.start < d },
  { id: "soon", title: "Next 14 days", hint: "Starting soon", match: (t, d) => !t.done && t.kind !== "paperwork" && !!t.start && t.start >= d && t.start <= addDays(d, 14) },
  { id: "later", title: "Later", hint: "More than 14 days away", match: (t, d) => !t.done && t.kind !== "paperwork" && !!t.start && t.start > addDays(d, 14) },
  { id: "nodate", title: "Needs a date", hint: "Set a duration or soft-launch date", match: (t) => !t.done && t.kind !== "paperwork" && !t.start },
  { id: "done", title: "Done", hint: "Ticked off", match: (t) => t.done },
];

/** The date shown on a board card: completion date when done, "pending since" for open paperwork. */
function cardDate(t: Task): string {
  if (t.kind === "paperwork") return t.done && t.end ? `done ${fmt(t.end)}` : t.start ? `pending since ${fmt(t.start)}` : "pending";
  if (!t.start) return t.missing ?? "";
  return fmt(t.start);
}

/** Task manager: one column per due-state, a card per task, tick to move it to Done. */
export function BoardView({ tasks }: { tasks: Task[] }) {
  const today = localToday();
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[1100px] grid-cols-6 gap-3">
        {COLUMNS.map((c) => {
          const list = tasks.filter((t) => c.match(t, today)).sort((a, b) => (a.start ?? "9").localeCompare(b.start ?? "9"));
          return (
            <section key={c.id} className="flex flex-col gap-2 rounded-2xl bg-inset p-2.5">
              <header className="flex items-baseline justify-between px-1 pt-1">
                <h3 className={cn("text-sm font-semibold", c.id === "overdue" && list.length > 0 && "text-[var(--tone-pin)]")}>{c.title}</h3>
                <span className="text-xs text-muted-foreground">{list.length}</span>
              </header>
              <p className="px-1 text-[11px] text-muted-foreground">{c.hint}</p>
              {list.map((t) => (
                <article key={t.key} className={cn("tile flex flex-col gap-1.5 rounded-xl border border-l-[6px] bg-card p-3", t.done && "opacity-60")} style={{ borderLeftColor: t.color }}>
                  <div className="flex items-start gap-2">
                    <Checkbox aria-label={`${t.label} (${t.store})`} className="mt-0.5" checked={t.done} onCheckedChange={(v) => t.toggle(!!v)} />
                    <span className={cn("text-[13px] leading-snug font-semibold", t.done && "line-through")}>{t.label}</span>
                  </div>
                  <Link href={`/onboarding/${encodeURIComponent(t.appId)}`} className="self-start rounded-md px-2 py-0.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: t.color }}>{t.store}</Link>
                  <span className="text-[11px] text-muted-foreground">{t.franchisee}</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className={cn("size-2 rounded-full", COLOR[t.kind])} />{KIND_LABEL[t.kind]}</span>
                    <span className="text-[11px] font-medium">{cardDate(t)}</span>
                  </div>
                  <details className="text-[11px] text-muted-foreground">
                    <summary className="cursor-pointer select-none hover:text-foreground">Why this task?</summary>
                    <p className="mt-1 leading-snug">{t.why}</p>
                  </details>
                </article>
              ))}
              {list.length === 0 && <p className="px-1 py-3 text-xs text-muted-foreground">Nothing here.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

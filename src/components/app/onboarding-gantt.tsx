"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { addDays, buildTimeline, computedSoftLaunch, PHASES, type Onboarding, type TimelineTask } from "@/lib/onboarding";
import { useWorkspace } from "@/store/workspace";
import { SourceTag } from "./source-tag";
import { cn } from "@/lib/utils";

const BAR: Record<TimelineTask["kind"], string> = { payment: "bg-[var(--tone-wait)]", phase: "bg-[var(--light-green)]", checkin: "bg-primary" };

/** Gantt + checklist from Day 0. Durations are blank fields the brand fills in. */
export function OnboardingGantt({ id, o, readOnly = false }: { id: string; o: Onboarding; readOnly?: boolean }) {
  const checkinBase = useWorkspace((s) => s.settings.checkinBase);
  const { day0, tasks } = buildTimeline(o, checkinBase);
  const set = (patch: Partial<Onboarding>, log?: string) => useWorkspace.getState().setOnboarding(id, patch, log);
  if (!day0 || o.stage !== "Onboarding") {
    return (
      <div className="rounded-[20px] border bg-card p-5 text-sm">
        <h3 className="text-base font-semibold">Onboarding timeline</h3>
        <p className="mt-2 text-muted-foreground">Timeline starts after paperwork is complete{day0 && !readOnly ? " (press Start onboarding)" : ""}.</p>
      </div>
    );
  }
  const placed = tasks.filter((t) => t.start !== null);
  const span = Math.max(30, ...placed.map((t) => (t.start ?? 0) + (t.length ?? 1)));
  const suggested = computedSoftLaunch(o);
  const toggle = (t: TimelineTask, v: boolean) => {
    if (t.kind === "phase") set({ phases: { ...o.phases, [t.id]: { ...o.phases[t.id as keyof Onboarding["phases"]], done: v } } }, `${t.label}: ${v ? "done" : "not done"}.`);
    else if (t.kind === "checkin") set({ checkins: { ...o.checkins, [t.id.replace("checkin-", "")]: v } }, `${t.label}: ${v ? "done" : "not done"}.`);
    else {
      const i = Number(t.id.replace("pay-", ""));
      set({ payments: o.payments.map((p, j) => (j === i ? { ...p, done: v } : p)) }, `${t.label}: ${v ? "paid" : "not paid"}.`);
    }
  };

  return (
    <div className="space-y-3 rounded-[20px] border bg-card p-5 text-sm">
      <h3 className="text-base font-semibold">Onboarding timeline (Day 0 = {day0})</h3>
      {!readOnly && (
        <div className="grid gap-2 md:grid-cols-5">
          {PHASES.map((ph) => (
            <div key={ph.key}>
              <Label htmlFor={`dur-${ph.key}`} className="text-xs">{ph.label} (days)</Label>
              <Input id={`dur-${ph.key}`} placeholder="set duration" value={o.phases[ph.key].duration} onChange={(e) => set({ phases: { ...o.phases, [ph.key]: { ...o.phases[ph.key], duration: e.target.value } } })} />
            </div>
          ))}
          <div>
            <Label htmlFor="soft-launch" className="text-xs">Soft-launch date</Label>
            <Input id="soft-launch" type="date" value={o.softLaunchDate} onChange={(e) => set({ softLaunchDate: e.target.value }, `Soft-launch date set to ${e.target.value || "blank"}.`)} />
            {suggested && suggested !== o.softLaunchDate && <Button size="xs" variant="link" className="px-0" onClick={() => set({ softLaunchDate: suggested }, `Soft-launch date set to ${suggested} (from durations).`)}>Use {suggested} (from durations)</Button>}
          </div>
        </div>
      )}
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <SourceTag source="Our choice" /> Check-ins count from {checkinBase === "softLaunch" ? "the soft-launch date" : "Day 0"} (change in Settings). Check-ins review how the open store is doing, so they count from opening, not from paperwork.
      </p>
      <div className="space-y-1">
        {tasks.map((t) => (
          <div key={t.id} className="grid grid-cols-[minmax(0,16rem)_1fr] items-center gap-2">
            <div>
              <label className="flex items-center gap-2">
                <Checkbox aria-label={t.label} disabled={readOnly} checked={t.done} onCheckedChange={(v) => toggle(t, !!v)} />
                <span className={cn(t.done && "line-through")}>{t.label}</span>
              </label>
              <p className="ml-6 text-[11px] text-muted-foreground">Why this task? {t.why}</p>
            </div>
            <div className="relative h-5 rounded bg-muted">
              {t.start !== null && t.length !== null ? (
                <div
                  title={`Day ${t.start}${t.length > 1 ? `–${t.start + t.length}` : ""}: ${addDays(day0, t.start)}`}
                  className={cn("absolute top-0 h-5 rounded", BAR[t.kind], t.done && "opacity-40")}
                  style={{ left: `${(t.start / span) * 100}%`, width: `${Math.max(0.8, ((t.length || 1) / span) * 100)}%` }}
                />
              ) : (
                <span className="absolute inset-0 px-2 text-[11px] leading-5 text-[var(--tone-info)]">{t.missing ?? (t.start !== null ? `starts day ${t.start}: set duration` : "set duration")}</span>
              )}
              {t.start !== null && t.length !== null && <span className="absolute right-1 text-[10px] leading-5 text-muted-foreground">{addDays(day0, t.start)}</span>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Registrations, signing and tax are not in the timeline: they are the paperwork gate. Phases run in order; a blank duration stops placement of the phases after it.</p>
    </div>
  );
}

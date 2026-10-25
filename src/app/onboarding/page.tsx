"use client";
import Link from "next/link";
import { useState } from "react";
import { useWorkspace } from "@/store/workspace";
import { useResults } from "@/hooks/use-results";
import { gateComplete, localDate, storeLabel } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/app/page-header";
import { BoardView, GanttView, useTasks, type StoreRow } from "@/components/app/onboarding-overview";
import { CountUp } from "@/components/app/motion";

export default function OnboardingPage() {
  const onboarding = useWorkspace((s) => s.onboarding);
  const r = useResults();
  const [view, setView] = useState<"gantt" | "board">("gantt");
  const rows: StoreRow[] = Object.entries(onboarding).map(([id, o]) => {
    const e = r?.ledger[id];
    return { id, o, store: storeLabel(o, e?.city ?? "", e?.pin ?? ""), franchisee: `${e?.name || id} (${id})` };
  });
  const tasks = useTasks(rows);
  const stats: [number, string][] = [
    [rows.filter((x) => !gateComplete(x.o)).length, "Stores awaiting paperwork"],
    [rows.filter((x) => x.o.stage === "Onboarding" && !x.o.phases.softLaunch.done).length, "Stores being set up"],
    [rows.filter((x) => x.o.phases.softLaunch.done).length, "Stores soft-launched"],
    [tasks.filter((t) => !t.done && t.start && t.start < localDate() && t.kind !== "paperwork").length, "Tasks overdue"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Onboarding"
        sub="Every new store from confirmation to opening. A store waits for its paperwork (agreement, GST, other registrations); once all three are done its timeline starts: stock arrival, POS set-up, training, soft launch, then check-ins at day 30, 60, 90 and 180."
        actions={
          rows.length > 0 && (
            <div className="inline-flex rounded-[10px] border p-1" role="group" aria-label="View">
              {(["gantt", "board"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn("h-8 rounded-lg px-3 text-[13px] font-semibold", view === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                  {v === "gantt" ? "Gantt chart" : "Task board"}
                </button>
              ))}
            </div>
          )
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([n, l]) => (
          <div key={l} className="tile rounded-2xl border bg-card p-4">
            <CountUp value={n} className="text-3xl font-bold" />
            <p className="text-[13px] text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <Panel title="No stores in onboarding yet">
          <p>Open a Good to go applicant from <Link href="/results?status=Good%20to%20go" className="text-brand hover:underline">Applicants</Link> and press Confirm.</p>
        </Panel>
      ) : view === "gantt" ? (
        <Panel title="Gantt chart: all stores" aside={<span className="text-xs text-muted-foreground">Tick a task to mark it done. Click a store for its paperwork, deal terms and details.</span>}>
          <GanttView rows={rows} tasks={tasks} />
        </Panel>
      ) : (
        <Panel title="Task board: all stores" aside={<span className="text-xs text-muted-foreground">Tick a card to move it to Done.</span>}>
          <BoardView tasks={tasks} />
        </Panel>
      )}
    </div>
  );
}

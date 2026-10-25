"use client";
import Link from "next/link";
import { useWorkspace } from "@/store/workspace";
import { useResults } from "@/hooks/use-results";
import { gateComplete } from "@/lib/onboarding";
import { PageHeader, Panel } from "@/components/app/page-header";
import { PortfolioGantt, TaskList, type OnbRow } from "@/components/app/onboarding-overview";
import { CountUp } from "@/components/app/motion";

export default function OnboardingPage() {
  const onboarding = useWorkspace((s) => s.onboarding);
  const checkinBase = useWorkspace((s) => s.settings.checkinBase);
  const r = useResults();
  const rows: OnbRow[] = Object.entries(onboarding).map(([id, o]) => ({ id, name: r?.ledger[id]?.name || id, o }));
  const awaiting = rows.filter((x) => !gateComplete(x.o)).length;
  const running = rows.filter((x) => x.o.stage === "Onboarding").length;
  const opened = rows.filter((x) => x.o.phases.softLaunch.done).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Onboarding"
        sub="After you confirm a Good to go applicant, they wait here for paperwork (agreement, GST, other registrations). Once all three are ticked, their timeline starts: stock arrival, POS set-up, training, soft launch, then check-ins at day 30, 60, 90 and 180."
      />
      <div className="grid grid-cols-3 gap-3">
        {[[awaiting, "Awaiting paperwork"], [running, "Timeline running"], [opened, "Soft-launched"]].map(([n, l]) => (
          <div key={l as string} className="tile rounded-2xl border bg-card p-4">
            <CountUp value={n as number} className="text-3xl font-bold" />
            <p className="text-[13px] text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <Panel title="No one in onboarding yet">
          <p>Open a Good to go applicant from <Link href="/results?status=Good%20to%20go" className="text-brand hover:underline">Applicants</Link> and press Confirm.</p>
        </Panel>
      ) : (
        <>
          <Panel title="Timeline (all franchisees)">
            <PortfolioGantt rows={rows} checkinBase={checkinBase} />
          </Panel>
          <Panel title="Tasks" aside={<span className="text-xs text-muted-foreground">Tick to mark done. Each task says why it exists.</span>}>
            <TaskList rows={rows} checkinBase={checkinBase} />
          </Panel>
        </>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/store/workspace";
import { fetchServices } from "@/hooks/use-services";
import { pullFromServer, startSync } from "@/lib/sync";
import { AiAssessRunner } from "./ai-assess-runner";
import { loadDemoWorkspace } from "@/lib/load-demo";
import { demoOnboarding } from "@/lib/demo-onboarding";

/** Waits for the browser copy to load, then mirrors to the database (Neon) if it is configured. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const finish = () => setReady(true);
    if (useWorkspace.persist.hasHydrated()) finish();
    const unsub = useWorkspace.persist.onFinishHydration(finish);
    let stopSync: (() => void) | undefined;
    fetchServices().then(async (s) => {
      if (s.database) await pullFromServer();
      // First visit with nothing saved: show the pre-filled demo workspace instead of a blank app.
      // The retired 10-applicant demo (demo-showcase.xlsx) is swapped for the current demo data.
      const name = useWorkspace.getState().dataset?.report.fileName ?? "";
      if (!useWorkspace.getState().dataset || name.startsWith("demo-showcase")) await loadDemoWorkspace(true);
      // Demo data loaded before the onboarding demo cases existed: add them (only when none exist).
      const st = useWorkspace.getState();
      if (st.demo && Object.keys(st.onboarding).length === 0) {
        const extra = demoOnboarding();
        useWorkspace.setState({ onboarding: extra.onboarding, log: [...st.log, ...extra.log] });
      }
      if (s.database) stopSync = startSync();
    });
    return () => {
      unsub();
      stopSync?.();
    };
  }, []);
  if (!ready) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  return (
    <>
      <AiAssessRunner />
      {children}
    </>
  );
}

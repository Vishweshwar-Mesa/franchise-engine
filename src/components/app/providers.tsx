"use client";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/store/workspace";
import { fetchServices } from "@/hooks/use-services";
import { pullFromServer, startSync } from "@/lib/sync";
import { AiAssessRunner } from "./ai-assess-runner";
import { loadDemoWorkspace } from "@/lib/load-demo";

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
      if (!useWorkspace.getState().dataset || name.startsWith("demo-showcase")) await loadDemoWorkspace();
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

"use client";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/store/workspace";
import { fetchServices } from "@/hooks/use-services";
import { pullFromServer, startSync } from "@/lib/sync";
import { AiAssessRunner } from "./ai-assess-runner";

/** Waits for the browser copy to load, then mirrors to Supabase if it is configured. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const finish = () => setReady(true);
    if (useWorkspace.persist.hasHydrated()) finish();
    const unsub = useWorkspace.persist.onFinishHydration(finish);
    let stopSync: (() => void) | undefined;
    fetchServices().then(async (s) => {
      if (!s.supabase) return;
      await pullFromServer();
      stopSync = startSync();
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

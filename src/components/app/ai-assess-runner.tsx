"use client";
// Asks the AI once per loaded file to rate business relevance and flag note contradictions.
// Runs in the background: the results table never waits for it.
import { useEffect, useRef } from "react";
import { useWorkspace } from "@/store/workspace";
import { fetchServices } from "@/hooks/use-services";
import type { AiAssessment } from "@/lib/types";

export function AiAssessRunner() {
  const dataset = useWorkspace((s) => s.dataset);
  const done = useRef<object | null>(null);
  useEffect(() => {
    if (!dataset) return;
    // Keyed on the dataset object itself: any new load (even same name and size) is assessed again.
    if (done.current === dataset) return;
    done.current = dataset;
    (async () => {
      const services = await fetchServices();
      if (!services.ai) return;
      const have = useWorkspace.getState().ai;
      const items = dataset.applications
        .filter((a) => !have[a.id] && (a.business || a.notes))
        .slice(0, 100)
        .map((a) => ({
          id: a.id.slice(0, 40), business: a.business.slice(0, 500), notes: a.notes.slice(0, 1000), spaceAvailable: a.spaceAvailable.slice(0, 40),
          spaceSize: a.spaceSize, floor: a.floor.slice(0, 40), experienceYears: a.experience,
        }));
      if (!items.length) return;
      try {
        const res = await fetch("/api/ai/assess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
        const body = await res.json();
        const results: Record<string, AiAssessment> = {};
        for (const r of body.results ?? []) results[r.id] = { relevance: r.relevance, reason: r.reason, contradiction: r.contradiction, source: "ai" };
        // Drop the answer if another file was loaded while the AI was working.
        if (useWorkspace.getState().dataset !== dataset) return;
        if (Object.keys(results).length) useWorkspace.getState().setAi(results);
      } catch {
        /* AI is optional */
      }
    })();
  }, [dataset]);
  return null;
}

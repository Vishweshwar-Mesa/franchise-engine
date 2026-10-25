"use client";
import { useMemo } from "react";
import { runEngine, type EngineResult } from "@/lib/engine";
import { useWorkspace } from "@/store/workspace";

/** Runs the engine over the current workspace. Null until a file is loaded. */
export function useResults(): EngineResult | null {
  const dataset = useWorkspace((s) => s.dataset);
  const settings = useWorkspace((s) => s.settings);
  const reviewer = useWorkspace((s) => s.reviewer);
  const ai = useWorkspace((s) => s.ai);
  const contests = useWorkspace((s) => s.contests);
  return useMemo(
    () => (dataset ? runEngine({ dataset, settings, reviewer, ai, contests }) : null),
    [dataset, settings, reviewer, ai, contests],
  );
}

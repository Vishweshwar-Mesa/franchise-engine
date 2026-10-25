"use client";
// Mirrors the browser workspace to the database (Neon) (via /api/state) when the database (Neon) is configured.
// Failures are silent: the browser copy always works on its own.
import { runEngine } from "./engine";
import { snapshot, useWorkspace, type WorkspaceData } from "@/store/workspace";

export async function pullFromServer(): Promise<boolean> {
  const s = useWorkspace.getState();
  if (s.dataset) return false;
  try {
    const res = await fetch(`/api/state?session=${encodeURIComponent(s.sessionId)}`);
    const body = await res.json();
    if (body.found && body.data?.dataset) {
      useWorkspace.getState().replaceAll({ ...snapshot(), ...(body.data as Partial<WorkspaceData>) } as WorkspaceData);
      return true;
    }
  } catch {
    /* offline or not configured */
  }
  return false;
}

let timer: ReturnType<typeof setTimeout> | null = null;
export function startSync(): () => void {
  return useWorkspace.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(push, 2500);
  });
}

async function push() {
  const data = snapshot();
  let ledger: { app_id: string; status: string; entry: unknown }[] = [];
  if (data.dataset) {
    const r = runEngine({ dataset: data.dataset, settings: data.settings, reviewer: data.reviewer, ai: data.ai, contests: data.contests });
    ledger = Object.values(r.ledger).map((e) => ({ app_id: e.id, status: e.status, entry: e }));
  }
  try {
    await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data, ledger }) });
  } catch {
    /* ignore */
  }
}

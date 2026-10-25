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

/**
 * Pushes once now (so a reload never leaves the database behind), then 1 s after each change,
 * and flushes when the page is hidden or closed.
 */
export function startSync(): () => void {
  if (useWorkspace.getState().dataset) push();
  const unsub = useWorkspace.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      push();
    }, 1000);
  });
  const flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    push(true);
  };
  const onHide = () => document.visibilityState === "hidden" && flush();
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", flush);
  return () => {
    unsub();
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", flush);
  };
}

async function push(keepalive = false) {
  const data = snapshot();
  let ledger: { app_id: string; status: string; entry: unknown }[] = [];
  if (data.dataset) {
    const r = runEngine({ dataset: data.dataset, settings: data.settings, reviewer: data.reviewer, ai: data.ai, contests: data.contests });
    ledger = Object.values(r.ledger).map((e) => ({ app_id: e.id, status: e.status, entry: e }));
  }
  const body = JSON.stringify({ data, ledger });
  try {
    // keepalive requests are capped at 64 KB by browsers; larger flushes go as normal requests.
    await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: keepalive && body.length < 60000 });
  } catch {
    /* ignore */
  }
}

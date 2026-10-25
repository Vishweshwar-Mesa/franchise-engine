// What-if: re-run the engine on a copy with one applicant changed. Real data is untouched
// unless the reviewer confirms.
import { runEngine, type EngineInput, type EngineResult } from "./engine";
import { toNumber, toPin } from "./parse";
import type { Application } from "./types";

const NUMBER_FIELDS = ["investment", "experience", "spaceSize", "targetLaunch"] as const;
const TEXT_FIELDS = ["name", "city", "state", "business", "spaceAvailable", "floor", "language", "notes"] as const;

/** Keeps only known fields and coerces types (used for AI-proposed what-ifs). */
export function sanitizeChanges(raw: Record<string, unknown>): Partial<Application> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if ((NUMBER_FIELDS as readonly string[]).includes(k)) {
      const n = toNumber(v);
      if (!n.bad) out[k] = n.value;
    } else if ((TEXT_FIELDS as readonly string[]).includes(k)) out[k] = String(v ?? "");
    else if (k === "pin") out.pin = toPin(v);
  }
  return out as Partial<Application>;
}

export interface WhatIfOutcome {
  id: string;
  changes: Partial<Application>;
  before: EngineResult;
  after: EngineResult;
  /** Other applicants whose status changed as a knock-on effect. */
  knockOn: { id: string; from: string; to: string }[];
}

export function runWhatIf(input: EngineInput, id: string, changes: Partial<Application>): WhatIfOutcome {
  const before = runEngine(input);
  const apps = input.dataset.applications.map((a) =>
    a.id === id ? { ...a, ...changes, badNumbers: Object.fromEntries(Object.entries(a.badNumbers).filter(([k]) => !(k in changes))) } : a,
  );
  const after = runEngine({ ...input, dataset: { ...input.dataset, applications: apps } });
  const knockOn = Object.keys(after.ledger)
    .filter((k) => k !== id && before.ledger[k] && before.ledger[k].status !== after.ledger[k].status)
    .map((k) => ({ id: k, from: before.ledger[k].status, to: after.ledger[k].status }));
  return { id, changes, before, after, knockOn };
}

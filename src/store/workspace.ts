"use client";
// One workspace per browser (session id in localStorage), so judges don't overwrite each
// other. Saved locally always; mirrored to the database (Neon) when it is configured (see lib/sync.ts).
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import type {
  ActionLogEntry, AiAssessment, ContestDecision, Dataset, ReviewerInput, Status, WaitlistConfirmation,
} from "@/lib/types";
import type { Onboarding } from "@/lib/onboarding";
import { newOnboarding } from "@/lib/onboarding";

export interface Explanation {
  summary: string;
  nextSteps: string[];
  training: { module: string; why: string }[];
  language: string;
  by: "AI" | "Template";
}

export interface WorkspaceData {
  sessionId: string;
  dataset: Dataset | null;
  settings: Settings;
  reviewer: Record<string, ReviewerInput>;
  ai: Record<string, AiAssessment>;
  /** Cached AI explanations, keyed by applicant id; `key` is a hash of the ledger entry used. */
  explanations: Record<string, { key: string; data: Explanation }>;
  contests: Record<string, ContestDecision>;
  waitlist: Record<string, WaitlistConfirmation>;
  onboarding: Record<string, Onboarding>;
  log: ActionLogEntry[];
  updatedAt: string;
}

interface WorkspaceActions {
  loadDataset: (d: Dataset) => void;
  setReviewer: (id: string, patch: Partial<ReviewerInput>, logDetail?: string) => void;
  setManualStatus: (id: string, status: Status | null, reason: string) => void;
  setAi: (results: Record<string, AiAssessment>) => void;
  setExplanation: (id: string, key: string, data: Explanation) => void;
  setContest: (pin: string, patch: Partial<ContestDecision>) => void;
  confirmWaitlist: (territoryId: string, order: string[]) => void;
  setSettings: (s: Settings, logDetail: string) => void;
  updateApplication: (id: string, patch: Record<string, unknown>, detail: string) => void;
  confirmGoodToGo: (id: string) => void;
  setOnboarding: (id: string, patch: Partial<Onboarding>, logDetail?: string) => void;
  replaceAll: (data: WorkspaceData) => void;
  reset: () => void;
  addLog: (kind: string, detail: string, applicantId?: string) => void;
}

const now = () => new Date().toISOString();
const newSessionId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const blank = (sessionId: string): WorkspaceData => ({
  sessionId, dataset: null, settings: DEFAULT_SETTINGS, reviewer: {}, ai: {}, explanations: {}, contests: {},
  waitlist: {}, onboarding: {}, log: [], updatedAt: now(),
});

export const useWorkspace = create<WorkspaceData & WorkspaceActions>()(
  persist(
    (set, get) => {
      const log = (kind: string, detail: string, applicantId?: string): ActionLogEntry[] => [
        { at: now(), kind, detail, applicantId }, ...get().log,
      ].slice(0, 500);
      return {
        ...blank(newSessionId()),
        addLog: (kind, detail, applicantId) => set({ log: log(kind, detail, applicantId), updatedAt: now() }),
        loadDataset: (d) =>
          set({
            ...blank(get().sessionId), settings: get().settings, dataset: d,
            log: log("upload", `Loaded ${d.report.fileName}: ${d.applications.length} applicants, ${d.territories.length} territories.`),
          }),
        setReviewer: (id, patch, logDetail) =>
          set({
            reviewer: { ...get().reviewer, [id]: { ...get().reviewer[id], ...patch } },
            log: logDetail ? log("reviewer-input", logDetail, id) : get().log, updatedAt: now(),
          }),
        setManualStatus: (id, status, reason) =>
          set({
            reviewer: { ...get().reviewer, [id]: { ...get().reviewer[id], manualStatus: status ? { status, reason, at: now() } : null } },
            log: log("status-change", status ? `Status set to '${status}'. Reason: ${reason}` : `Manual status removed. Reason: ${reason}`, id),
            updatedAt: now(),
          }),
        setAi: (results) => set({ ai: { ...get().ai, ...results }, updatedAt: now() }),
        setExplanation: (id, key, data) => set({ explanations: { ...get().explanations, [id]: { key, data } }, updatedAt: now() }),
        setContest: (pin, patch) => {
          const prev = get().contests[pin] ?? { winnerId: null, notes: "", at: null };
          const next = { ...prev, ...patch, at: now() };
          set({
            contests: { ...get().contests, [pin]: next },
            log: "winnerId" in patch ? log("reviewers-call", `Reviewer's call on pin ${pin}: ${patch.winnerId ?? "cleared"}.`) : get().log,
            updatedAt: now(),
          });
        },
        confirmWaitlist: (territoryId, order) =>
          set({
            waitlist: { ...get().waitlist, [territoryId]: { order, at: now() } },
            log: log("waitlist-confirmed", `Waitlist order for ${territoryId} confirmed: ${order.join(", ")}.`), updatedAt: now(),
          }),
        setSettings: (s, logDetail) => set({ settings: s, log: log("settings", logDetail), updatedAt: now() }),
        updateApplication: (id, patch, detail) => {
          const d = get().dataset;
          if (!d) return;
          set({
            dataset: { ...d, applications: d.applications.map((a) => (a.id === id ? { ...a, ...patch, badNumbers: Object.fromEntries(Object.entries(a.badNumbers).filter(([k]) => !(k in patch))) } : a)) },
            log: log("data-edit", detail, id), updatedAt: now(),
          });
        },
        confirmGoodToGo: (id) =>
          set({
            onboarding: { ...get().onboarding, [id]: get().onboarding[id] ?? newOnboarding(now()) },
            log: log("confirmed", "Reviewer confirmed Good to go. Stage: Awaiting paperwork.", id), updatedAt: now(),
          }),
        setOnboarding: (id, patch, logDetail) =>
          set({
            onboarding: { ...get().onboarding, [id]: { ...(get().onboarding[id] ?? newOnboarding(now())), ...patch } },
            log: logDetail ? log("onboarding", logDetail, id) : get().log, updatedAt: now(),
          }),
        replaceAll: (data) => set({ ...data }),
        reset: () => set({ ...blank(get().sessionId), log: log("reset", "Workspace cleared.") }),
      };
    },
    {
      name: "franchise-engine-workspace-v1",
      partialize: (s) => dataOnly(s),
    },
  ),
);

function dataOnly(s: object): WorkspaceData {
  return Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function")) as unknown as WorkspaceData;
}

export const snapshot = (): WorkspaceData => dataOnly(useWorkspace.getState());

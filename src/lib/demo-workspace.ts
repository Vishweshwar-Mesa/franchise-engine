// A pre-filled DEMO workspace on top of public/samples/demo-showcase.xlsx, so the app is not
// empty on a first visit. Everything here is made-up test input "as if a reviewer typed it".
// Fees, royalty and deposit stay blank even in the demo (no invented terms); phase durations
// are demo entries so the timeline has something to show.
import { addDays, newOnboarding, templateEmail, type Onboarding } from "./onboarding";
import { DEFAULT_SETTINGS } from "./settings";
import type { ActionLogEntry, ContestDecision, Dataset, ReviewerInput, WaitlistConfirmation } from "./types";

export interface DemoWorkspace {
  dataset: Dataset;
  settings: typeof DEFAULT_SETTINGS;
  reviewer: Record<string, ReviewerInput>;
  contests: Record<string, ContestDecision>;
  waitlist: Record<string, WaitlistConfirmation>;
  onboarding: Record<string, Onboarding>;
  log: ActionLogEntry[];
}

const day = (today: string, n: number) => addDays(today, n);
const at = (today: string, n: number, hh = "10:00") => `${day(today, n)}T${hh}:00.000Z`;

export function buildDemoWorkspace(dataset: Dataset, now = new Date()): DemoWorkspace {
  const today = now.toISOString().slice(0, 10);
  const reviewer: Record<string, ReviewerInput> = {
    "APP-101": { netWorth: 140, portfolio: 35, relevanceOverride: "High", areaType: "Commercial" },
    "APP-102": { netWorth: 320, portfolio: 90, relevanceOverride: "High", areaType: "Commercial" },
    "APP-103": { netWorth: 110, portfolio: 20, relevanceOverride: "High" },
    "APP-104": { netWorth: 85, portfolio: 10, relevanceOverride: "High" },
    "APP-105": { netWorth: 125, portfolio: 30, relevanceOverride: "High" },
    "APP-106": { relevanceOverride: "Medium", liabilities: "Existing business loan, repayments on schedule (declared by the applicant)." },
    "APP-107": { relevanceOverride: "Medium" },
    "APP-108": { netWorth: 95, portfolio: 15, relevanceOverride: "Medium" },
    "APP-109": { relevanceOverride: "Medium" },
    "APP-110": { relevanceOverride: "High" },
  };

  const contests: Record<string, ContestDecision> = {
    "590006": { winnerId: null, notes: "Both look strong. Shabana has the larger owned ground-floor unit; Basavaraj has menswear experience. Visit both sites before deciding.", at: at(today, -2) },
  };
  const waitlist: Record<string, WaitlistConfirmation> = { "TER-04": { order: ["APP-107"], at: at(today, -3) } };

  // Onboarding 1: paperwork done 18 days ago, timeline running.
  const o1 = newOnboarding(at(today, -30));
  o1.stage = "Onboarding";
  o1.startedAt = at(today, -18, "11:00");
  o1.gate = {
    agreement: { done: true, date: day(today, -24), file: { name: "APP-101-franchise-agreement-signed.pdf", path: null, stored: false } },
    gst: { done: true, date: day(today, -20), file: null },
    other: { done: true, date: day(today, -18), file: null, list: "Shop and establishment registration (demo entry; the real list comes from the brand's legal/CA team)" },
  };
  o1.deal = { ...o1.deal, storePin: "570002", trainingProvided: "Store operations, POS software, visual merchandising (demo entry)", term: "Demo entry: to be set by the brand" };
  o1.payments = [
    { label: "First payment (per agreement)", amount: "", dueDay: "0", done: true },
    { label: "Second payment (per agreement)", amount: "", dueDay: "21", done: false },
  ];
  o1.phases = {
    stock: { duration: "10", done: true },
    pos: { duration: "4", done: true },
    training: { duration: "6", done: false },
    softLaunch: { duration: "1", done: false },
  };
  o1.softLaunchDate = day(today, 2);
  o1.account = { email: "priya.sharma@example.com", status: "not-created", message: "Demo entry: press Create account to save it." };
  const e1 = templateEmail("Priya Sharma", "APP-101", o1);
  o1.email = { subject: e1.subject, draft: e1.body, language: "English", by: "Template" };

  // Onboarding 2: confirmed 4 days ago, still awaiting paperwork.
  const o2 = newOnboarding(at(today, -4));
  o2.gate.agreement = { done: true, date: day(today, -1), file: { name: "APP-102-agreement-signed.pdf", path: null, stored: false } };
  o2.deal = { ...o2.deal, storePin: "560095" };

  const log: ActionLogEntry[] = [
    { at: at(today, -1, "15:20"), kind: "onboarding", applicantId: "APP-102", detail: "Franchise agreement signed: ticked." },
    { at: at(today, -2, "12:05"), kind: "reviewer-input", detail: "Contest notes added for pin 590006." },
    { at: at(today, -3, "09:40"), kind: "waitlist-confirmed", detail: "Waitlist order for TER-04 confirmed: APP-107." },
    { at: at(today, -4, "17:10"), kind: "confirmed", applicantId: "APP-102", detail: "Reviewer confirmed Good to go. Stage: Awaiting paperwork." },
    { at: at(today, -10, "10:30"), kind: "onboarding", applicantId: "APP-101", detail: "Stock arrival and POS set-up marked done." },
    { at: at(today, -18, "11:00"), kind: "onboarding", applicantId: "APP-101", detail: `Onboarding started. Day 0 = ${day(today, -18)}.` },
    { at: at(today, -30, "16:00"), kind: "confirmed", applicantId: "APP-101", detail: "Reviewer confirmed Good to go. Stage: Awaiting paperwork." },
    { at: at(today, -31, "10:00"), kind: "upload", detail: "Loaded demo-showcase.xlsx (synthetic demo workspace): 10 applicants, 6 territories." },
  ];

  return { dataset, settings: DEFAULT_SETTINGS, reviewer, contests, waitlist, onboarding: { "APP-101": o1, "APP-102": o2 }, log };
}

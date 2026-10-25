// Demo onboarding records layered on the 30-applicant demo file, so the Onboarding pages are
// not empty. Made-up entries "as if a reviewer typed them". Fees, royalty, deposit and payment
// amounts stay blank (no invented money terms); phase durations are demo entries.
import { addDays, newOnboarding, templateEmail, type Onboarding } from "./onboarding";
import type { ActionLogEntry } from "./types";

export function demoOnboarding(now = new Date()): { onboarding: Record<string, Onboarding>; log: ActionLogEntry[] } {
  const today = now.toISOString().slice(0, 10);
  const d = (n: number) => addDays(today, n);
  const at = (n: number, hh = "10:00") => `${d(n)}T${hh}:00.000Z`;
  const demoList = "Shop and establishment registration (demo entry; the real list comes from the brand's legal/CA team)";

  // 1. Rahul Menon: paperwork done 24 days ago, store about to soft-launch.
  const a = newOnboarding(at(-34));
  a.stage = "Onboarding";
  a.startedAt = at(-24, "11:00");
  a.gate = {
    agreement: { done: true, date: d(-30), file: { name: "APP-025-agreement-signed.pdf", path: null, stored: false } },
    gst: { done: true, date: d(-27), file: null },
    other: { done: true, date: d(-24), file: null, list: demoList },
  };
  a.deal = { ...a.deal, storePin: "560095", trainingProvided: "Store operations, POS software, visual merchandising (demo entry)" };
  a.payments = [
    { label: "First payment (per agreement)", amount: "", dueDay: "0", done: true },
    { label: "Second payment (per agreement)", amount: "", dueDay: "30", done: false },
  ];
  a.phases = { stock: { duration: "12", done: true }, pos: { duration: "5", done: true }, training: { duration: "7", done: false }, softLaunch: { duration: "1", done: false } };
  a.softLaunchDate = d(1);
  const ea = templateEmail("Rahul Menon", "APP-025", a);
  a.email = { subject: ea.subject, draft: ea.body, language: "English", by: "Template" };

  // 2. Priya Sharma: paperwork done 8 days ago, stock arriving.
  const b = newOnboarding(at(-15));
  b.stage = "Onboarding";
  b.startedAt = at(-8, "16:00");
  b.gate = {
    agreement: { done: true, date: d(-12), file: { name: "APP-030-agreement-signed.pdf", path: null, stored: false } },
    gst: { done: true, date: d(-10), file: null },
    other: { done: true, date: d(-8), file: null, list: demoList },
  };
  b.deal = { ...b.deal, storePin: "570002" };
  b.payments = [{ label: "First payment (per agreement)", amount: "", dueDay: "0", done: true }];
  b.phases = { stock: { duration: "14", done: false }, pos: { duration: "5", done: false }, training: { duration: "7", done: false }, softLaunch: { duration: "", done: false } };

  // 3. Farhan Ali: confirmed 5 days ago, still awaiting paperwork (agreement signed only).
  const c = newOnboarding(at(-5));
  c.gate.agreement = { done: true, date: d(-2), file: { name: "APP-005-agreement-signed.pdf", path: null, stored: false } };
  c.deal = { ...c.deal, storePin: "560025" };

  const log: ActionLogEntry[] = [
    { at: at(-2, "15:20"), kind: "onboarding", applicantId: "APP-005", detail: "Franchise agreement signed: ticked." },
    { at: at(-5, "17:10"), kind: "confirmed", applicantId: "APP-005", detail: "Reviewer confirmed Good to go. Stage: Awaiting paperwork." },
    { at: at(-8, "16:00"), kind: "onboarding", applicantId: "APP-030", detail: `Onboarding started. Day 0 = ${d(-8)}.` },
    { at: at(-10, "12:00"), kind: "onboarding", applicantId: "APP-025", detail: "Stock arrival and POS set-up marked done." },
    { at: at(-15, "09:30"), kind: "confirmed", applicantId: "APP-030", detail: "Reviewer confirmed Good to go. Stage: Awaiting paperwork." },
    { at: at(-24, "11:00"), kind: "onboarding", applicantId: "APP-025", detail: `Onboarding started. Day 0 = ${d(-24)}.` },
    { at: at(-34, "16:00"), kind: "confirmed", applicantId: "APP-025", detail: "Reviewer confirmed Good to go. Stage: Awaiting paperwork." },
  ];
  return { onboarding: { "APP-025": a, "APP-030": b, "APP-005": c }, log };
}

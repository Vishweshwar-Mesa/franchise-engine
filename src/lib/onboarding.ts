// Group 2: onboarding model. Confirming a Good to go applicant only moves them to the
// "Awaiting paperwork" stage. The timeline starts (Day 0) when the last gate item is done.
// No durations, fees or legal facts are prefilled: the brand enters them.

export interface GateItem {
  done: boolean;
  date: string | null;
  file: { name: string; path: string | null; stored: boolean } | null;
}

export const DEAL_FIELDS = [
  ["storeName", "Store name"],
  ["franchiseFee", "Franchise fee"],
  ["securityDeposit", "Security deposit"],
  ["royalty", "Royalty % and its basis"],
  ["term", "Term and renewal"],
  ["storePin", "Pin code of this store"],
  ["inventoryValue", "Inventory value supplied by the company"],
  ["franchiseeInvestment", "Franchisee investment"],
  ["companyInvestment", "Company investment"],
  ["marketingFund", "Marketing fund"],
  ["trainingProvided", "Training provided"],
  ["exitTerms", "Exit / transfer terms"],
] as const;
export type DealKey = (typeof DEAL_FIELDS)[number][0];

export const PHASES = [
  { key: "stock", label: "Stock arrival", why: "The store needs the inventory the company supplies before it can open." },
  { key: "pos", label: "Inventory / POS software set-up", why: "Billing and stock tracking must work before the first sale." },
  { key: "training", label: "Training", why: "The franchisee and staff learn the brand's range, display and systems before opening." },
  { key: "softLaunch", label: "Soft launch", why: "A quiet first opening to fix problems before full operation." },
] as const;
export type PhaseKey = (typeof PHASES)[number]["key"];
export const CHECKINS = [30, 60, 90, 180] as const;

export interface PaymentRow {
  label: string;
  amount: string;
  /** Days after Day 0, as typed by the reviewer. Blank = not set. */
  dueDay: string;
  done: boolean;
}

export interface Onboarding {
  stage: "Awaiting paperwork" | "Onboarding";
  confirmedAt: string;
  gate: { agreement: GateItem; gst: GateItem; other: GateItem & { list: string } };
  deal: Record<DealKey, string>;
  payments: PaymentRow[];
  phases: Record<PhaseKey, { duration: string; done: boolean }>;
  softLaunchDate: string;
  checkins: Record<string, boolean>;
  account: { email: string; status: "created" | "not-created" | "error"; message: string } | null;
  email: { draft: string; subject: string; language: string; by: "AI" | "Template"; sentTo?: string; sentAt?: string } | null;
  startedAt: string | null;
}

const gateItem = (): GateItem => ({ done: false, date: null, file: null });

export function newOnboarding(confirmedAt: string): Onboarding {
  return {
    stage: "Awaiting paperwork",
    confirmedAt,
    gate: { agreement: gateItem(), gst: gateItem(), other: { ...gateItem(), list: "" } },
    deal: Object.fromEntries(DEAL_FIELDS.map(([k]) => [k, ""])) as Record<DealKey, string>,
    payments: [],
    phases: Object.fromEntries(PHASES.map((p) => [p.key, { duration: "", done: false }])) as Onboarding["phases"],
    softLaunchDate: "",
    checkins: {},
    account: null,
    email: null,
    startedAt: null,
  };
}

export function gateComplete(o: Onboarding): boolean {
  const g = o.gate;
  return [g.agreement, g.gst, g.other].every((i) => i.done && !!i.date);
}

/** Day 0 = the date the last gate item was completed. */
export function dayZero(o: Onboarding): string | null {
  if (!gateComplete(o)) return null;
  const g = o.gate;
  return [g.agreement.date!, g.gst.date!, g.other.date!].sort().at(-1)!;
}

/** Today in the viewer's own timezone as YYYY-MM-DD (toISOString would give the UTC date). */
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000);
}

export interface TimelineTask {
  id: string;
  label: string;
  why: string;
  kind: "payment" | "phase" | "checkin";
  /** Days from Day 0; null when it cannot be placed yet. */
  start: number | null;
  length: number | null;
  missing: string | null;
  done: boolean;
}

const posInt = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);

/** Builds the Gantt rows. Phases run in order; a blank duration stops placement of later phases. */
export function buildTimeline(o: Onboarding, checkinBase: "softLaunch" | "day0"): { day0: string | null; tasks: TimelineTask[] } {
  const day0 = dayZero(o);
  const tasks: TimelineTask[] = [];
  if (!day0) return { day0, tasks };

  o.payments.forEach((p, i) => {
    const due = posInt(p.dueDay);
    tasks.push({
      id: `pay-${i}`, kind: "payment", label: `Payment: ${p.label || "unnamed"}${p.amount ? ` (${p.amount})` : ""}`,
      why: "Listed in the payment schedule entered in the deal terms.", start: due, length: due === null ? null : 1,
      missing: due === null ? "set due day" : null, done: p.done,
    });
  });

  let cursor: number | null = 0;
  for (const ph of PHASES) {
    const dur = posInt(o.phases[ph.key].duration);
    const start = cursor;
    tasks.push({
      id: ph.key, kind: "phase", label: ph.label, why: ph.why, start, length: dur,
      missing: dur === null ? "set duration" : null, done: o.phases[ph.key].done,
    });
    cursor = cursor !== null && dur !== null ? cursor + dur : null;
  }

  const base = checkinBase === "day0" ? 0 : o.softLaunchDate ? daysBetween(day0, o.softLaunchDate) : null;
  for (const c of CHECKINS) {
    tasks.push({
      id: `checkin-${c}`, kind: "checkin", label: `Day ${c} check-in`,
      why: checkinBase === "softLaunch"
        ? "Check-ins review how the open store is doing, so they count from opening (the soft-launch date), not from paperwork."
        : "Check-ins review how the store is doing; Settings has them counting from Day 0 (paperwork complete).",
      start: base === null ? null : base + c, length: base === null ? null : 1,
      missing: base === null ? "set soft-launch date" : null, done: !!o.checkins[String(c)],
    });
  }
  return { day0, tasks };
}

/** The soft-launch date implied by the phase durations, if every phase before it is set. */
export function computedSoftLaunch(o: Onboarding): string | null {
  const day0 = dayZero(o);
  if (!day0) return null;
  let days = 0;
  for (const ph of PHASES) {
    if (ph.key === "softLaunch") return addDays(day0, days);
    const d = posInt(o.phases[ph.key].duration);
    if (d === null) return null;
    days += d;
  }
  return null;
}

/** English template for the confirmation email (used when AI is not available). */
export function templateEmail(name: string, appId: string, o: Onboarding): { subject: string; body: string } {
  const terms = DEAL_FIELDS.filter(([k]) => dealValue(o, k)).map(([k, label]) => `- ${label}: ${dealValue(o, k)}`);
  const other = o.gate.other.list.trim();
  return {
    subject: `Your franchise application ${appId}: next steps`,
    body: [
      `Dear ${name || "applicant"},`,
      "",
      `Thank you for your franchise application (${appId}). Our reviewer has confirmed it for the next stage: paperwork.`,
      "",
      "Paperwork to complete:",
      "- Franchise agreement (signed)",
      "- GST registration",
      `- Other legal registrations${other ? `: ${other}` : " (our legal/CA team will confirm the list)"}`,
      ...(terms.length ? ["", "Deal terms recorded so far:", ...terms] : []),
      "",
      "Nothing is final until the paperwork is complete. Our team will be in touch about the next steps.",
      "",
      "The franchise team",
    ].join("\n"),
  };
}

/** The change to an onboarding record when a timeline task is ticked or unticked. */
export function taskDonePatch(o: Onboarding, task: TimelineTask, done: boolean): Partial<Onboarding> {
  if (task.kind === "phase") return { phases: { ...o.phases, [task.id]: { ...o.phases[task.id as PhaseKey], done } } };
  if (task.kind === "checkin") return { checkins: { ...o.checkins, [task.id.replace("checkin-", "")]: done } };
  const i = Number(task.id.replace("pay-", ""));
  return { payments: o.payments.map((p, j) => (j === i ? { ...p, done } : p)) };
}

export const GATE_LABELS: Record<keyof Onboarding["gate"], string> = {
  agreement: "Franchise agreement signed",
  gst: "GST registration done",
  other: "Other legal registrations done",
};

/** A deal field's value; records saved before a field existed read as blank. */
export function dealValue(o: Onboarding, k: DealKey): string {
  return (o.deal[k] ?? "").trim();
}

/** How a store is named everywhere: the reviewer's store name, else "<City> <pin>". */
export function storeLabel(o: Onboarding, city: string, pin: string): string {
  return dealValue(o, "storeName") || [city, dealValue(o, "storePin") || pin].filter(Boolean).join(" ") || "Store";
}

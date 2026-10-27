// Template explanations, training plans, chat answers and what-if parsing, all read from
// the ledger. These are what the app shows when AI is off or fails, so it always works.
import type { EngineResult, LedgerEntry } from "./engine";
import type { Application } from "./types";
import { PHASES, type Onboarding } from "./onboarding";
import type { Explanation } from "@/store/workspace";

export function templateExplanation(e: LedgerEntry): Explanation {
  const lights = e.factors.filter((f) => f.provided).map((f) => `${f.label} ${f.light}`).join(", ");
  const parts = [
    `${e.id} (${e.name || "name missing"}) is '${e.status}'. ${e.reason}`,
    e.territory ? `Territory ${e.territory.id} (${e.territory.city}, priority ${e.territory.priority || "not set"}).` : "No territory matched.",
    `Score ${e.total}/100${e.rescaled ? " (rescaled because financial profile was not provided)" : ""}: ${lights}. Profile used: ${e.profile.name}.`,
  ];
  return { summary: parts.join(" "), nextSteps: e.nextSteps, training: templateTraining(e), language: "English", by: "Template" };
}

export function templateTraining(e: LedgerEntry): Explanation["training"] {
  const exp = e.factors.find((f) => f.key === "experience");
  const space = e.factors.find((f) => f.key === "space");
  const plan: Explanation["training"] = [
    { module: "Brand product range and store display (suggested; brand to confirm)", why: "Every new franchisee needs to know the range and how it is displayed." },
    { module: "Inventory and POS software (suggested; brand to confirm)", why: "Billing and stock tracking are used from day one." },
    { module: "Customer service (suggested; brand to confirm)", why: "Part of everyday store operation." },
  ];
  if (exp && exp.light === "red") plan.unshift({ module: "Retail store operations basics", why: `Experience scored in the lower band (${exp.points}/${exp.max}) compared with other applicants.` });
  if (space && space.parts.some((p) => /small-space/.test(p.value))) plan.push({ module: "Display planning for a small store", why: "The space is in the small-space band, so the full range may not fit." });
  return plan;
}

const APP_ID = /\b([A-Z]{2,5}-\d{1,5}|ROW-\d+)\b/i;

export interface ParsedUpdate {
  id: string;
  changes: Partial<Application>;
  /** "What if ..." questions are previewed on a copy; statements of fact are applied. */
  hypothetical: boolean;
  /** Anything the parser had to assume, shown to the reviewer. */
  assumptions: string[];
}

const HYPOTHETICAL = /\b(what if|if|suppose|supposing|would|imagine|hypothetically)\b/i;
const CITY_ALIASES: [RegExp, string][] = [
  [/\b(bengaluru|bangalore)\b/i, "Bengaluru"], [/\b(mysuru|mysore)\b/i, "Mysuru"], [/\b(mangaluru|mangalore)\b/i, "Mangaluru"],
  [/\b(hubballi|hubli|dharwad)\b/i, "Hubballi-Dharwad"], [/\b(belagavi|belgaum)\b/i, "Belagavi"], [/\b(tumakuru|tumkur)\b/i, "Tumakuru"],
  [/\b(davanagere|davangere)\b/i, "Davanagere"],
];

/**
 * Reads new information or a what-if about one applicant, without AI. Examples:
 * "APP-009 is now renting a 600 sq ft shop on the ground floor", "APP-004 now has 700 sq ft",
 * "APP-013 can invest 30 lakh", "What if APP-004 had a 700 sq ft space?".
 */
export function parseUpdate(q: string, apps: Application[]): ParsedUpdate | null {
  // Questions ("Why is APP-015 not in 570002?") are answered, never read as updates.
  if (!HYPOTHETICAL.test(q) && /^\s*(why|how|who|which|explain|tell me|what(?!\s+if)|is|are|does|did|can you|should)\b/i.test(q)) return null;
  const m = q.match(APP_ID);
  if (!m) return null;
  const app = apps.find((a) => a.id.toLowerCase() === m[1].toLowerCase());
  if (!app) return null;
  const rest = q.replace(m[0], " ");
  const changes: Partial<Application> = {};
  const assumptions: string[] = [];

  const size = rest.match(/(\d[\d,]*(?:\.\d+)?)\s*(sq\.?\s*ft\.?|sqft|sft|square\s*feet)/i);
  if (size) changes.spaceSize = Number(size[1].replace(/,/g, ""));
  const inv = rest.match(/(?:₹\s*)?(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|l)\b/i) ?? rest.match(/invest\w*\D{0,20}(\d+(?:\.\d+)?)/i);
  if (inv) changes.investment = Number(inv[1]);
  const yrs = rest.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i);
  if (yrs) changes.experience = Number(yrs[1]);
  const months = rest.match(/(\d+)\s*months?/i);
  if (months) changes.targetLaunch = Number(months[1]);
  // "moved from 560011 to 560025": the last pin mentioned is the new one.
  const pin = [...rest.matchAll(/\b(\d{6})\b/g)].at(-1);
  if (pin) changes.pin = pin[1];
  for (const [re, city] of CITY_ALIASES) if (re.test(rest)) { changes.city = city; break; }
  const lang = rest.match(/\b(kannada|english|hindi)\b/i);
  if (lang) changes.language = lang[1][0].toUpperCase() + lang[1].slice(1).toLowerCase();

  if (/not yet identified|no space|no shop|lost (the|their|his|her) (shop|space)/i.test(rest)) changes.spaceAvailable = "Not yet identified";
  else if (/\b(own|owns|owned|bought|purchased)\b/i.test(rest)) changes.spaceAvailable = "Owned";
  else if (/\b(rent|rents|rented|lease|leased|renting)\b/i.test(rest)) changes.spaceAvailable = "Rented";

  if (/\bmall\b/i.test(rest)) changes.floor = "Mall unit";
  else if (/ground|downstairs|street level/i.test(rest)) changes.floor = "Ground";
  else if (/\b(upper|first|1st|second|2nd|third|3rd)[\s-]*floor\b|\bupper\b|\bupstairs\b/i.test(rest)) changes.floor = "Upper";

  const foundSpace = /\b(found|identified|got|secured|located|finali[sz]ed|has|have|bagged|booked|signed|took|taken|picked|locked|landed|shortlisted|zeroed in)\b[^.]*\b(space|shop|unit|store|premises|location|spot|place|outlet|showroom|property|site|frontage)\b/i.test(rest);
  const spaceNow = changes.spaceAvailable ?? app.spaceAvailable;
  if ((foundSpace || changes.spaceSize || changes.floor) && spaceNow === "Not yet identified" && changes.spaceAvailable !== "Not yet identified") {
    changes.spaceAvailable = "Rented";
    assumptions.push("Owned or rented was not stated, so it is treated as rented. Ask the applicant to confirm.");
    // Keep the assumption on the record itself, not only in the chat.
    changes.notes = `${app.notes ? `${app.notes} ` : ""}[Rented assumed in chat; owned or rented not stated. Confirm with the applicant.]`;
  }
  if (changes.spaceAvailable && changes.spaceAvailable !== "Not yet identified" && !changes.floor && app.floor === "") changes.floor = "Not known";

  if (!Object.keys(changes).length) return null;
  return { id: app.id, changes, hypothetical: HYPOTHETICAL.test(q), assumptions };
}

const fmt = (e: LedgerEntry) => `${e.id} ${e.name || "(no name)"}`;

/**
 * Questions with an exact answer in the ledger are answered here, before any AI: what would change
 * an applicant, unknown IDs, summaries, rankings, money questions and onboarding progress.
 */
export function quickAnswer(q: string, r: EngineResult, apps: Application[] = [], onboarding: Record<string, Onboarding> = {}): string | null {
  const all = Object.values(r.ledger);
  const m = q.match(APP_ID);
  const entry = m ? r.ledger[Object.keys(r.ledger).find((k) => k.toLowerCase() === m[1].toLowerCase()) ?? ""] : undefined;
  if (m && !entry) return `There is no ${m[1].toUpperCase()} in this file. IDs run like ${r.order.slice(0, 3).join(", ")}.`;
  if (entry && /what would change|how (can|could|do|does) .* (pass|clear|qualify|move)|what (does|do) .* need/i.test(q)) {
    const lines = [`${entry.id} is '${entry.status}'. ${entry.reason}`];
    lines.push(entry.whatWouldChange.length ? `What would change it:\n${entry.whatWouldChange.map((w) => `• ${w}`).join("\n")}` : "Nothing needs to change: it already meets every check.");
    if (entry.nextSteps.length) lines.push(`Next steps: ${entry.nextSteps.join(" ")}`);
    return lines.join("\n");
  }
  if (/onboard|paperwork|soft launch|gst|agreement/i.test(q)) {
    const rows = onboardingSummary(onboarding, r);
    if (entry) {
      const o = rows.find((x) => x.id === entry.id);
      return o ? `${entry.id} ${entry.name}: ${o.stage}. Paperwork: ${o.paperwork}. Tasks: ${o.phases}. Soft launch: ${o.softLaunch}.` : `${entry.id} is not in onboarding. It is '${entry.status}'.${entry.status === "Good to go" ? " Press Confirm on its page to move it to 'Awaiting paperwork'." : ""}`;
    }
    if (/\b(who|which|list|stores?|status|progress|how many)\b/i.test(q)) {
      return rows.length ? `Stores in onboarding (${rows.length}):\n${rows.map((o) => `• ${o.id} ${o.name}: ${o.stage}. Paperwork: ${o.paperwork}.`).join("\n")}` : "No store is in onboarding yet. Confirm a Good to go applicant to start its paperwork.";
    }
  }
  if (!m && /\b(summar|overview|results|how (are|is) (it|things) going|status of everything)/i.test(q)) {
    const c = r.counts;
    const lines = [`${all.length} applicants: ${c["Good to go"]} Good to go, ${c["Needs your decision"]} need your decision, ${c["Hold: info needed"]} on hold for information, ${c["Hold: pin occupied"]} on an occupied pin, ${c["Waitlist"]} on the waitlist, ${c["Not proceeding"]} not proceeding.`];
    if (r.contests.length) lines.push(`Contested pins waiting on you: ${r.contests.filter((x) => !x.decision?.winnerId).map((x) => `${x.pin} (${x.applicantIds.join(", ")})`).join("; ") || "none"}.`);
    lines.push(`By territory: ${r.territories.map((t) => `${t.id} ${t.city} ${t.goodToGo.length}/${t.capacity} filled${t.waitlist.length ? `, ${t.waitlist.length} waiting` : ""}`).join("; ")}.`);
    return lines.join("\n");
  }
  const input = new Map(apps.map((a) => [a.id, a]));
  const top = (rows: LedgerEntry[], val: (e: LedgerEntry) => number | null, dir: 1 | -1, label: string, unit: string) => {
    const xs = rows.map((e) => ({ e, v: val(e) })).filter((x): x is { e: LedgerEntry; v: number } => x.v !== null).sort((a, b) => dir * (a.v - b.v) || a.e.id.localeCompare(b.e.id)).slice(0, 5);
    return xs.length ? `${label}:\n${xs.map(({ e, v }) => `• ${fmt(e)}: ${unit === "₹" ? `₹${v} lakh` : `${v}${unit}`} (${e.status})`).join("\n")}` : null;
  };
  if (/cheap|cheaper|cheapest|lowest (investment|budget)|least (money|investment)|smallest budget/i.test(q)) {
    const t = top(all, (e) => input.get(e.id)?.investment ?? null, 1, "Nobody in the file has a price. The closest is investment capacity; lowest first", "₹");
    const rents = all.map((e) => ({ e, c: e.checks.find((c) => c.key === "site-details")?.input ?? "" })).filter((x) => /rent ₹/.test(x.c));
    return [t, rents.length ? `Monthly rent recorded: ${rents.map((x) => `${x.e.id} ${x.c.match(/rent ₹[\d,]+\/month/)?.[0]}`).join(", ")}.` : "No monthly rent has been recorded yet (it is asked on each applicant's page)."].filter(Boolean).join("\n");
  }
  if (/(most|highest|biggest|largest|richest|more) (money|investment|budget|capital)|invest(s)? the most|richest/i.test(q)) {
    return top(all, (e) => input.get(e.id)?.investment ?? null, -1, "Highest investment capacity", "₹");
  }
  if (/(most|highest|more) (experience|experienced)|most experienced/i.test(q)) {
    return top(all, (e) => input.get(e.id)?.experience ?? null, -1, "Most retail experience", " yrs");
  }
  if (/\b(best|top|strongest|highest(-| )scor\w*|ranking|rank them|leaderboard)\b/i.test(q) && !m) {
    return top(all, (e) => e.total, -1, "Highest scores (the score only orders applicants within a territory; checks decide holds)", "/100");
  }
  if (/\b(worst|weakest|lowest(-| )scor\w*)\b/i.test(q) && !m) {
    return top(all, (e) => e.total, 1, "Lowest scores", "/100");
  }
  return null;
}

/** Answers chat questions from the ledger without AI. */
const NOT_IN_DATA = /\b(e-?mail|phone|mobile|contact|address|age|gender|salary|income|aadhaar|pan|bank account|caste|religion|family|married)\b/i;

export function localAnswer(q: string, r: EngineResult): string {
  if (NOT_IN_DATA.test(q)) return "That isn't in the data.";
  const t = q.match(/\bTER-[\w-]+\b/i);
  if (t) {
    const ter = r.territories.find((x) => x.id.toLowerCase() === t[0].toLowerCase());
    if (!ter) return `${t[0]} isn't in the data.`;
    return `${ter.id} (${ter.city}): ${ter.openSlots} open slots, ${ter.freePins.length} free pins, capacity ${ter.capacity}. Good to go: ${ter.goodToGo.join(", ") || "none"}. Waitlist: ${ter.waitlist.join(", ") || "none"}.`;
  }
  const m = q.match(APP_ID);
  if (m) {
    const e = r.ledger[Object.keys(r.ledger).find((k) => k.toLowerCase() === m[1].toLowerCase()) ?? ""];
    if (!e) return `${m[1]} isn't in the data.`;
    const lines = [`${e.id} is '${e.status}'. ${e.reason}`];
    if (e.fixes.length) lines.push(`Fixes needed: ${e.fixes.join(" ")}`);
    if (e.whatWouldChange.length) lines.push(`What would change this: ${e.whatWouldChange.join(" ")}`);
    if (e.nextSteps.length) lines.push(`Next steps: ${e.nextSteps.join(" ")}`);
    lines.push(`Score ${e.total}/100 (${e.factors.filter((f) => f.provided).map((f) => `${f.label} ${f.points}/${f.max}`).join(", ")}).`);
    return lines.join("\n");
  }
  const all = Object.values(r.ledger);
  if (/territor/i.test(q) && /\b(most|least|busiest|which)\b/i.test(q)) {
    const rows = r.territories.map((t) => ({ t, n: all.filter((e) => e.territory?.id === t.id).length })).sort((a, b) => b.n - a.n);
    return rows.map(({ t, n }) => `${t.id} (${t.city}): ${n} applicants, capacity ${t.capacity}, ${t.goodToGo.length} Good to go, ${t.waitlist.length} waiting`).join("\n");
  }
  const listFor: [RegExp, string][] = [[/waitlist/i, "Waitlist"], [/contested|decision|decide/i, "Needs your decision"], [/occupied|existing store/i, "Hold: pin occupied"], [/\bhold|info needed|missing/i, "Hold: info needed"], [/good to go|ready|qualified|approved/i, "Good to go"], [/not proceeding|rejected/i, "Not proceeding"]];
  if (/\b(who|which|list|show|all)\b/i.test(q)) {
    const hit = listFor.find(([re]) => re.test(q));
    if (hit) {
      const list = all.filter((e) => e.status === hit[1]);
      return list.length ? `${hit[1]} (${list.length}):\n${list.map((e) => `${e.id} ${e.name}: ${e.reason}`).join("\n")}` : `Nobody is '${hit[1]}'.`;
    }
  }
  if (/how many|count|summary|overview/i.test(q)) {
    return Object.entries(r.counts).map(([s, n]) => `${s}: ${n}`).join("\n");
  }
  return "I couldn't find that in the data. Try 'Summarise the results', 'Why is APP-004 on hold?', 'Who is on the waitlist?', 'Who has the highest score?', a territory like 'TER-02', or a what-if like 'What if APP-004 had a 700 sq ft space?'";
}

/** A compact view of the whole ledger for the chat AI (bounded size). */
/** What the AI sees: every applicant in brief (with their inputs), the full ledger entry for any
 * applicant named in the question or open on screen, territories, and onboarding progress. */
export function chatContext(r: EngineResult, focusId?: string, question = "", apps: Application[] = [], onboarding: Record<string, Onboarding> = {}) {
  const input = new Map(apps.map((a) => [a.id, a]));
  const brief = Object.values(r.ledger).map((e) => {
    const a = input.get(e.id);
    return {
      id: e.id, name: e.name, city: e.city, pin: e.pin, status: e.status, reason: e.reason, total: e.total,
      territory: e.territory?.id ?? null, rank: e.rank, waitlist: e.waitlistPosition,
      ...(a ? { investmentLakh: a.investment, experienceYears: a.experience, business: a.business, space: a.spaceAvailable, sizeSqFt: a.spaceSize, floor: a.floor } : {}),
    };
  });
  const named = [...new Set([...(question.match(/\b[A-Z]{2,5}-\d{1,5}\b/gi) ?? []).map((x) => x.toUpperCase()), ...(focusId ? [focusId] : [])])];
  const details = named.map((id) => r.ledger[Object.keys(r.ledger).find((k) => k.toUpperCase() === id) ?? ""]).filter(Boolean).slice(0, 5).map(compactEntry);
  return {
    counts: r.counts,
    territories: r.territories.map((t) => ({ id: t.id, city: t.city, priority: t.priority, openSlots: t.openSlots, freePins: t.freePins, capacity: t.capacity, goodToGo: t.goodToGo, waitlist: t.waitlist, pendingContests: t.pendingContests })),
    applicants: brief,
    details,
    onboarding: onboardingSummary(onboarding, r),
  };
}

/** One line of plain facts per store in onboarding. */
export function onboardingSummary(onboarding: Record<string, Onboarding>, r: EngineResult) {
  return Object.entries(onboarding).map(([id, o]) => {
    const gate = (["agreement", "gst", "other"] as const).map((k) => `${{ agreement: "agreement signed", gst: "GST registration", other: "other registrations" }[k]}: ${o.gate[k].done ? `done${o.gate[k].date ? ` ${o.gate[k].date}` : ""}` : "not yet"}`);
    const phases = Object.entries(o.phases).map(([k, v]) => `${PHASES.find((p) => p.key === k)?.label ?? k}: ${v.done ? "done" : v.duration ? `${v.duration} days, not done` : "duration not set"}`);
    return { id, name: r.ledger[id]?.name ?? "", stage: o.stage, paperwork: gate.join(", "), phases: phases.join(", "), softLaunch: o.softLaunchDate || "not set", startedAt: o.startedAt };
  });
}

export function compactEntry(e: LedgerEntry) {
  return {
    id: e.id, name: e.name, city: e.city, pin: e.pin, status: e.status, reason: e.reason,
    checks: e.checks.map((c) => ({ check: c.label, input: c.input, result: c.result, source: c.source, detail: c.detail })),
    factors: e.factors.map((f) => ({ factor: f.label, points: f.points, max: f.max, light: f.light, parts: f.parts.map((p) => `${p.label}: ${p.value} = ${p.points}/${p.max}`) })),
    total: e.total, rescaled: e.rescaled, relevance: e.relevance, profile: e.profile.name, territory: e.territory,
    rank: e.rank, rankOf: e.rankOf, slot: e.slot, waitlistPosition: e.waitlistPosition, contest: e.contest,
    flags: e.flags.map((f) => f.text), whatWouldChange: e.whatWouldChange, nextSteps: e.nextSteps, questions: e.questions,
  };
}

/** Stable short hash of a ledger entry, so cached AI text is refreshed when the entry changes. */
export function entryKey(e: LedgerEntry, language: string): string {
  const s = JSON.stringify([compactEntry(e), language]);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

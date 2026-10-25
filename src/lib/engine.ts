// The decision engine: plain, deterministic TypeScript. AI never changes a check, a
// score or a status here. Everything the UI shows is read from the ledger this builds.
import { pickProfile, type ScoringProfile, type Settings } from "./settings";
import type {
  AiAssessment, Application, ContestDecision, Dataset, Relevance, ReviewerInput, Status, Territory,
} from "./types";
import { STATUSES } from "./types";
import { columnLabel } from "./parse";

export type Source = "Case rule" | "Our choice";
export type Light = "green" | "amber" | "red" | "none";

export interface Check {
  key: string;
  label: string;
  input: string;
  result: "pass" | "fail" | "warn" | "info";
  source: Source;
  detail: string;
}

export interface ScorePart {
  label: string;
  value: string;
  points: number;
  max: number;
  note?: string;
}

export interface FactorScore {
  key: "space" | "money" | "experience" | "financial";
  label: string;
  /** Points as shown (already rescaled when the financial profile is missing). */
  points: number;
  max: number;
  /** points / max, 0..1 */
  share: number;
  light: Light;
  provided: boolean;
  relative: boolean;
  parts: ScorePart[];
}

export interface LedgerEntry {
  id: string;
  name: string;
  city: string;
  pin: string;
  language: string;
  status: Status;
  /** What the engine decided before any manual change. */
  engineStatus: Status;
  reason: string;
  manual: { status: Status; reason: string; at: string } | null;
  checks: Check[];
  fixes: string[];
  factors: FactorScore[];
  total: number;
  rescaled: boolean;
  financialProvided: boolean;
  relevance: { rating: Relevance | null; reason: string; by: "AI" | "Reviewer" | "Not rated" };
  profile: { id: string; name: string };
  territory: { id: string; city: string; priority: string; tier: string } | null;
  rank: number | null;
  rankOf: number | null;
  slot: { position: number; capacity: number } | null;
  waitlistPosition: number | null;
  contest: { pin: string; with: string[]; decidedWinner: string | null } | null;
  flags: { kind: "liabilities" | "ai-contradiction" | "launch" | "territory" | "language"; text: string }[];
  whatWouldChange: string[];
  nextSteps: string[];
  /** Questions to ask the applicant: missing data first, then site details not yet known. */
  questions: string[];
}

export interface TerritorySummary {
  id: string;
  city: string;
  tier: string;
  priority: string;
  openSlots: number;
  pins: string[];
  freePins: string[];
  occupied: { pin: string; storeId: string }[];
  capacity: number;
  pendingContests: string[];
  goodToGo: string[];
  waitlist: string[];
  holds: string[];
}

export interface ContestSummary {
  pin: string;
  territoryId: string;
  applicantIds: string[];
  decision: ContestDecision | null;
}

export interface EngineResult {
  ledger: Record<string, LedgerEntry>;
  order: string[];
  territories: TerritorySummary[];
  contests: ContestSummary[];
  counts: Record<Status, number>;
}

export interface EngineInput {
  dataset: Dataset;
  settings: Settings;
  reviewer: Record<string, ReviewerInput>;
  ai: Record<string, AiAssessment>;
  contests: Record<string, ContestDecision>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Percent rank among a population: 0 = lowest, 1 = highest, 0.5 when alone. */
export function percentRank(value: number, population: number[]): number {
  if (population.length <= 1) return 0.5;
  const below = population.filter((p) => p < value).length;
  const equal = population.filter((p) => p === value).length;
  return (below + (equal - 1) / 2) / (population.length - 1);
}

export function lightFor(share: number, lights: Settings["lights"]): Light {
  if (share >= lights.green) return "green";
  if (share >= lights.amber) return "amber";
  return "red";
}

function sizeBand(size: number, p: ScoringProfile): "small" | "medium" | "preferred" {
  if (size < p.sizeBands.smallBelow) return "small";
  if (size >= p.sizeBands.preferredFrom) return "preferred";
  return "medium";
}

function scoreApplicant(
  app: Application,
  p: ScoringProfile,
  settings: Settings,
  pops: { investment: number[]; experience: number[]; netWorth: number[]; portfolio: number[] },
  reviewer: ReviewerInput,
  relevance: Relevance | null,
): { factors: FactorScore[]; total: number; rescaled: boolean; financialProvided: boolean } {
  const w = p.weights;
  // Space
  const tenure = app.spaceAvailable === "Owned" || app.spaceAvailable === "Rented" ? app.spaceAvailable : null;
  const tenurePts = tenure ? p.spaceSplit.tenure * p.tenureRank[tenure] : 0;
  const band = app.spaceSize !== null && app.spaceSize > 0 ? sizeBand(app.spaceSize, p) : null;
  const sizePts = band ? p.spaceSplit.size * p.sizeRank[band] : 0;
  const floorKey = (["Ground", "Mall unit", "Upper", "Not known"] as const).find((f) => f === app.floor) ?? "Not known";
  const floorPts = tenure ? p.spaceSplit.floor * p.floorRank[floorKey] : 0;
  const bandLabel = { small: `under ${p.sizeBands.smallBelow} sq ft: small-space risk`, medium: `${p.sizeBands.smallBelow}-${p.sizeBands.preferredFrom - 1} sq ft: medium`, preferred: `${p.sizeBands.preferredFrom}+ sq ft: preferred` };
  const spaceParts: ScorePart[] = [
    { label: "Tenure", value: tenure ?? (app.spaceAvailable || "blank"), points: tenurePts, max: p.spaceSplit.tenure, note: tenure ? undefined : "No space yet" },
    { label: "Size", value: band ? `${app.spaceSize} sq ft (${bandLabel[band]})` : "not given", points: sizePts, max: p.spaceSplit.size },
    { label: "Floor", value: tenure ? `${app.floor || "blank"}${app.floor === floorKey ? "" : " (treated as Not known)"}` : "n/a (no space)", points: floorPts, max: p.spaceSplit.floor },
  ];

  // Money (relative to the other applicants in the file)
  const moneyShare = app.investment !== null ? percentRank(app.investment, pops.investment) : 0;
  const moneyParts: ScorePart[] = [
    { label: "Investment capacity", value: app.investment !== null ? `₹${app.investment} lakh (percent rank ${Math.round(moneyShare * 100)} among ${pops.investment.length})` : "missing", points: w.money * moneyShare, max: w.money },
  ];

  // Experience: years (relative) + relevance of current/past business
  const yearsShare = app.experience !== null ? percentRank(app.experience, pops.experience) : 0;
  const relShare = relevance ? p.relevanceRank[relevance] : 0;
  const expParts: ScorePart[] = [
    { label: "Retail experience", value: app.experience !== null ? `${app.experience} yrs (percent rank ${Math.round(yearsShare * 100)} among ${pops.experience.length})` : "missing", points: p.experienceSplit.years * yearsShare, max: p.experienceSplit.years },
    { label: "Business relevance", value: relevance ?? "not rated yet", points: p.experienceSplit.relevance * relShare, max: p.experienceSplit.relevance, note: relevance ? undefined : "Counts as 0 until rated by AI or the reviewer" },
  ];

  // Financial profile: typed by the reviewer
  // Each part counts only when this applicant has it AND at least 2 applicants have it to compare;
  // a part that does not count gives its points to the other part (so entering data never lowers a score).
  const nw = reviewer.netWorth ?? null;
  const pf = reviewer.portfolio ?? null;
  const nwOn = nw !== null && pops.netWorth.length >= 2;
  const pfOn = pf !== null && pops.portfolio.length >= 2;
  const financialProvided = nwOn || pfOn;
  const finW = { nw: nwOn ? p.financialSplit.netWorth : 0, pf: pfOn ? p.financialSplit.portfolio : 0 };
  const finScale = finW.nw + finW.pf > 0 ? w.financial / (finW.nw + finW.pf) : 0;
  const nwShare = nwOn ? percentRank(nw!, pops.netWorth) : 0;
  const pfShare = pfOn ? percentRank(pf!, pops.portfolio) : 0;
  const finValue = (v: number | null, on: boolean, share: number, pop: number[]) =>
    v === null ? "not provided" : on ? `₹${v} lakh (percent rank ${Math.round(share * 100)} among ${pop.length})` : `₹${v} lakh (not scored: needs at least 2 applicants with this to compare)`;
  const finParts: ScorePart[] = [
    { label: "Net worth", value: finValue(nw, nwOn, nwShare, pops.netWorth), points: finW.nw * finScale * nwShare, max: finW.nw * finScale },
    { label: "Portfolio", value: finValue(pf, pfOn, pfShare, pops.portfolio), points: finW.pf * finScale * pfShare, max: finW.pf * finScale },
  ];

  const sum = (parts: ScorePart[]) => parts.reduce((a, b) => a + b.points, 0);
  const rescaled = !financialProvided;
  const scale = rescaled ? 100 / (100 - w.financial) : 1;
  const make = (key: FactorScore["key"], label: string, parts: ScorePart[], max: number, relative: boolean, provided = true): FactorScore => {
    const pts = sum(parts);
    const share = max > 0 ? pts / max : 0;
    return {
      key, label, relative, provided,
      points: provided ? round1(pts * scale) : 0,
      max: provided ? round1(max * scale) : 0,
      share,
      light: provided ? lightFor(share, settings.lights) : "none",
      parts: parts.map((x) => ({ ...x, points: round1(x.points * (provided ? scale : 1)), max: round1(x.max * (provided ? scale : 1)) })),
    };
  };
  const factors = [
    make("space", "Space", spaceParts, w.space, false),
    make("money", "Money", moneyParts, w.money, true),
    make("experience", "Experience", expParts, w.experience, true),
    make("financial", "Financial profile", finParts, w.financial, true, financialProvided),
  ];
  const total = round1(factors.reduce((a, f) => a + f.points, 0));
  return { factors, total, rescaled, financialProvided };
}

/** What to ask the applicant: fixes for held applications, then site details not yet recorded. */
export function siteQuestions(app: Application, site: ReviewerInput["site"], fixes: string[]): string[] {
  const q = fixes.map((f) => `To fix: ${f}`);
  const s = site ?? {};
  if (app.spaceAvailable === "Not yet identified") {
    q.push("Have you found a shop space yet? If so: is it owned or rented, its size (sq ft) and its floor?");
    return q;
  }
  if (app.spaceAvailable !== "Owned" && app.spaceAvailable !== "Rented") return q;
  if (s.frontageFt == null) q.push("How wide is the shop front facing the street (frontage, in feet)?");
  if (!s.visibility) q.push("How visible is the shop: does it face a main road, sit on a side street, or is it inside a mall?");
  if (app.spaceAvailable === "Rented" && s.monthlyRent == null) q.push("What is the monthly rent for the space (₹)?");
  return q;
}

/** Phrases in the notes that say there is no shop yet, while the fields say Owned/Rented. */
const NO_SHOP = /\b(no (shop|space|store)|(don'?t|do not|dont) (yet )?have (a |any )?(shop|space|store)|still (searching|looking)|looking for (a )?(shop|space|store)|yet to (find|identify))/i;
export function notesContradiction(app: Application): { by: string; detail: string } | null {
  if (!(app.spaceAvailable === "Owned" || app.spaceAvailable === "Rented") || !app.notes) return null;
  const m = app.notes.match(NO_SHOP);
  return m ? { by: "phrase check", detail: `notes say "${m[0]}" but Space available is ${app.spaceAvailable}.` } : null;
}

export function runEngine(input: EngineInput): EngineResult {
  const { dataset, settings, reviewer, ai, contests } = input;
  const apps = dataset.applications;
  const storeByPin = new Map(dataset.stores.map((s) => [s.pin, s]));
  const nums = (xs: (number | null | undefined)[]) => xs.filter((x): x is number => typeof x === "number");
  const pops = {
    investment: nums(apps.map((a) => a.investment)),
    experience: nums(apps.map((a) => a.experience)),
    netWorth: nums(apps.map((a) => reviewer[a.id]?.netWorth)),
    portfolio: nums(apps.map((a) => reviewer[a.id]?.portfolio)),
  };

  const ledger: Record<string, LedgerEntry> = {};
  const territoryOf = new Map<string, Territory>();

  for (const app of apps) {
    const r = reviewer[app.id] ?? {};
    const checks: Check[] = [];
    const fixes: string[] = [];
    const flags: LedgerEntry["flags"] = [];
    const add = (c: Check) => {
      checks.push(c);
      if (c.result === "fail") fixes.push(c.detail);
    };

    // Required fields (Our choice: taken from the template's Field guide)
    const required: [string, unknown][] = [
      ["id", app.idMissing ? "" : app.id], ["name", app.name], ["city", app.city], ["state", app.state], ["pin", app.pin],
      ["investment", app.investment], ["experience", app.experience], ["spaceAvailable", app.spaceAvailable],
    ];
    const missing = required.filter(([f, v]) => (v === null || v === "") && !app.badNumbers[f]).map(([f]) => columnLabel(f));
    add({
      key: "required", label: "Required fields present", input: missing.length ? `missing: ${missing.join(", ")}` : "all present",
      result: missing.length ? "fail" : "pass", source: "Our choice",
      detail: missing.length ? `Fill in: ${missing.join(", ")}.` : "All required columns have a value.",
    });
    for (const [f, raw] of Object.entries(app.badNumbers)) {
      add({ key: `number-${f}`, label: `${columnLabel(f)} is a number`, input: raw, result: "fail", source: "Our choice", detail: `'${columnLabel(f)}' should be a number but reads '${raw}'. Correct it.` });
    }
    if (app.investment !== null && app.investment <= 0) add({ key: "investment-positive", label: "Investment is above 0", input: String(app.investment), result: "fail", source: "Our choice", detail: "Investment capacity must be more than 0." });
    if (app.experience !== null && app.experience < 0) add({ key: "experience-nonneg", label: "Experience is 0 or more", input: String(app.experience), result: "fail", source: "Our choice", detail: "Retail experience cannot be negative." });
    if (app.spaceAvailable && !["Owned", "Rented", "Not yet identified"].includes(app.spaceAvailable)) {
      add({ key: "space-value", label: "Space available is a listed value", input: app.spaceAvailable, result: "fail", source: "Our choice", detail: `Space available must be Owned, Rented or Not yet identified (reads '${app.spaceAvailable}').` });
    }

    // Pin and city
    const pinValid = /^\d{6}$/.test(app.pin);
    if (app.pin) add({ key: "pin-format", label: "Pin code has 6 digits", input: app.pin, result: pinValid ? "pass" : "fail", source: "Our choice", detail: pinValid ? "Valid 6-digit pin." : `Pin code '${app.pin}' is not 6 digits.` });
    const allowed = dataset.allowedCities.find((c) => c.city.toLowerCase() === app.city.toLowerCase());
    if (app.city) {
      if (!allowed) add({ key: "city-allowed", label: "City is in Allowed values", input: app.city, result: "fail", source: "Our choice", detail: `City '${app.city}' is not in the Allowed values list.` });
      else if (settings.checks.checkPinPrefix && pinValid) {
        const ok = app.pin.startsWith(allowed.prefix);
        add({ key: "pin-prefix", label: "Pin matches the city's prefix", input: `${app.pin} vs ${allowed.city} (${allowed.prefix}…)`, result: ok ? "pass" : "fail", source: "Our choice", detail: ok ? `Pin starts with ${allowed.prefix}, as expected for ${allowed.city}.` : `Pin ${app.pin} does not start with ${allowed.prefix}, the prefix for ${allowed.city}. Check the city or the pin.` });
      }
      if (allowed && app.state && allowed.state.toLowerCase() !== app.state.toLowerCase() && settings.checks.checkContradictions) {
        add({ key: "state-city", label: "State matches the city", input: `${app.city}, ${app.state}`, result: "fail", source: "Our choice", detail: `${allowed.city} is in ${allowed.state}, but the row says '${app.state}'.` });
      }
    }

    // Territory (applications link to territories by pin code only)
    const covering = dataset.territories.filter((t) => t.pins.includes(app.pin));
    const territory = covering[0] ?? null;
    if (pinValid) {
      add({ key: "territory", label: "A territory covers this pin", input: app.pin, result: territory ? "pass" : "fail", source: "Our choice", detail: territory ? `Pin ${app.pin} is in ${territory.id} (${territory.city}).` : `No territory lists pin ${app.pin}, so there is no slot to fill. Confirm the pin, or ask whether the brand wants to open this area.` });
    }
    if (covering.length > 1) flags.push({ kind: "territory", text: `Pin is listed in ${covering.map((t) => t.id).join(", ")}; using ${territory!.id} (first in the file).` });
    if (territory) territoryOf.set(app.id, territory);

    // Space
    if (app.spaceAvailable === "Not yet identified" && settings.checks.holdWhenNoSpace) {
      add({ key: "space-identified", label: "A space is identified", input: app.spaceAvailable, result: "fail", source: "Our choice", detail: "No space yet. Ask the applicant to identify a space (tenure, size, floor) before this can move forward." });
    } else if (app.spaceAvailable === "Owned" || app.spaceAvailable === "Rented") {
      add({ key: "space-identified", label: "A space is identified", input: app.spaceAvailable, result: "pass", source: "Our choice", detail: `Space is ${app.spaceAvailable.toLowerCase()}.` });
      if (app.spaceSize === null) add({ key: "space-size", label: "Space size given", input: "blank", result: "warn", source: "Our choice", detail: "Space size is blank, so size scores 0. Ask for the carpet area." });
    }

    // Contradictions in the fields themselves
    if (settings.checks.checkContradictions && app.spaceAvailable === "Not yet identified") {
      if (app.spaceSize !== null) add({ key: "contradiction-size", label: "No contradiction: space vs size", input: `Not yet identified, ${app.spaceSize} sq ft`, result: "fail", source: "Our choice", detail: `Space is 'Not yet identified' but a size of ${app.spaceSize} sq ft is given. Confirm which is right.` });
      if (["Ground", "Upper", "Mall unit"].includes(app.floor)) add({ key: "contradiction-floor", label: "No contradiction: space vs floor", input: `Not yet identified, ${app.floor}`, result: "fail", source: "Our choice", detail: `Space is 'Not yet identified' but the floor is given as '${app.floor}'. Confirm which is right.` });
    }

    // Notes vs fields: flagged by the AI or by a simple phrase check. A flag only; it becomes a
    // hold only if the reviewer confirms it.
    const a = ai[app.id];
    const noteIssue = a?.contradiction.found ? { by: "AI", detail: a.contradiction.detail } : notesContradiction(app);
    if (noteIssue && settings.checks.checkContradictions) {
      if (r.aiContradiction === "confirmed") {
        add({ key: "contradiction-notes", label: "Notes agree with the fields", input: app.notes, result: "fail", source: "Our choice", detail: `Notes contradict the fields (flagged by ${noteIssue.by}, confirmed by reviewer): ${noteIssue.detail}` });
      } else if (r.aiContradiction !== "dismissed") {
        flags.push({ kind: "ai-contradiction", text: `${noteIssue.by === "AI" ? "AI" : "A phrase check"} flagged a possible contradiction in the notes (not applied until you confirm): ${noteIssue.detail}` });
      }
    }

    if (app.language && !dataset.languages.some((l) => l.toLowerCase() === app.language.toLowerCase())) {
      flags.push({ kind: "language", text: `Preferred language '${app.language}' is not in the allowed list (${dataset.languages.join(", ")}). English is used.` });
    }
    if (r.liabilities?.trim()) flags.push({ kind: "liabilities", text: `Liabilities / previous issues noted by reviewer: ${r.liabilities.trim()}` });
    if (settings.launchLimitMonths !== null && app.targetLaunch !== null && app.targetLaunch < settings.launchLimitMonths) {
      flags.push({ kind: "launch", text: `Feasibility note: target launch of ${app.targetLaunch} months is shorter than the ${settings.launchLimitMonths}-month limit set in Settings. Not scored.` });
    }

    // Site details asked of the applicant: shown for context, never scored.
    const site = r.site ?? {};
    const siteBits = [
      site.frontageFt != null ? `frontage ${site.frontageFt} ft` : null,
      site.visibility ? `visibility: ${site.visibility.toLowerCase()}` : null,
      site.monthlyRent != null ? `rent ₹${site.monthlyRent.toLocaleString("en-IN")}/month` : null,
    ].filter(Boolean);
    if (app.spaceAvailable === "Owned" || app.spaceAvailable === "Rented") {
      add({ key: "site-details", label: "Site details (asked; not scored)", input: siteBits.join(", ") || "not asked yet", result: "info", source: "Our choice", detail: siteBits.length ? `Reviewer recorded: ${siteBits.join(", ")}. Context only; not part of the score.` : "Frontage, visibility and rent have not been recorded yet. See 'Questions to ask'." });
    }

    // Same-pin rule (Case rule)
    const store = pinValid ? storeByPin.get(app.pin) : undefined;
    if (pinValid) {
      add({
        key: "same-pin-store", label: "No existing store on this pin", input: app.pin, result: store ? "info" : "pass", source: "Case rule",
        detail: store ? `Existing store ${store.id} (opened ${store.opened ?? "year not given"}) is already on pin ${app.pin}. The brand never opens two stores in the same pin code.` : "No existing store on this pin.",
      });
    }

    const relevance: LedgerEntry["relevance"] = r.relevanceOverride
      ? { rating: r.relevanceOverride, reason: "Set by the reviewer.", by: "Reviewer" }
      : a
        ? { rating: a.relevance, reason: a.reason, by: "AI" }
        : { rating: null, reason: app.business ? "Not rated yet." : "No business described.", by: "Not rated" };

    const profile = pickProfile(settings.profiles, { state: app.state, city: app.city, areaType: r.areaType ?? null });
    const score = scoreApplicant(app, profile, settings, pops, r, relevance.rating);

    const infoHold = fixes.length > 0;
    const status: Status = store ? "Hold: pin occupied" : infoHold ? "Hold: info needed" : "Good to go";
    const reason = store
      ? `Pin ${app.pin} already has store ${store.id}. The profile may be good, but this pin is not recommended.`
      : infoHold
        ? `Information needed: ${fixes[0]}${fixes.length > 1 ? ` (+${fixes.length - 1} more)` : ""}`
        : "Meets every check.";

    ledger[app.id] = {
      id: app.id, name: app.name, city: app.city, pin: app.pin, language: app.language || "English",
      status, engineStatus: status, reason, manual: r.manualStatus ?? null,
      checks, fixes, ...score, relevance,
      profile: { id: profile.id, name: profile.name },
      territory: territory ? { id: territory.id, city: territory.city, priority: territory.priority, tier: territory.tier } : null,
      rank: null, rankOf: null, slot: null, waitlistPosition: null, contest: null,
      flags, whatWouldChange: [], nextSteps: [], questions: siteQuestions(app, r.site, fixes),
    };
  }

  // Traffic lights. Space is absolute (share of its points). Money, Experience and Financial are
  // relative, so their light is the applicant's rank among everyone who has that factor (thirds by default).
  for (const key of ["money", "experience", "financial"] as const) {
    const pop = Object.values(ledger).map((e) => e.factors.find((f) => f.key === key)!).filter((f) => f.provided).map((f) => f.points);
    for (const e of Object.values(ledger)) {
      const f = e.factors.find((x) => x.key === key)!;
      if (f.provided) f.light = lightFor(percentRank(f.points, pop), settings.lights);
    }
  }

  // Manual changes take applicants out of the automatic pool. A manual "Good to go" takes a slot
  // first AND reserves its pin, so the same-pin case rule still holds.
  const manualOf = (id: string) => ledger[id].manual?.status ?? null;
  const manualPins = new Map<string, string>();
  for (const a of apps) if (manualOf(a.id) === "Good to go" && !manualPins.has(a.pin)) manualPins.set(a.pin, a.id);
  const pinTakenBy = new Map<string, string>();
  const qualified = apps.filter((a) => {
    if (ledger[a.id].engineStatus !== "Good to go" || manualOf(a.id) !== null) return false;
    const holder = manualPins.get(a.pin);
    if (holder) pinTakenBy.set(a.id, holder);
    return !holder;
  });

  // Contested pins: two or more qualified applicants on the same free pin. The tool never picks.
  const byPin = new Map<string, string[]>();
  for (const a of qualified) byPin.set(a.pin, [...(byPin.get(a.pin) ?? []), a.id]);
  const contestList: ContestSummary[] = [];
  const losers = new Map<string, string>();
  const winners = new Set<string>();
  const pendingContest = new Set<string>();
  for (const [pin, ids] of byPin) {
    if (ids.length < 2) continue;
    const decision = contests[pin] ?? null;
    const territoryId = territoryOf.get(ids[0])?.id ?? "";
    contestList.push({ pin, territoryId, applicantIds: ids, decision });
    const winner = decision?.winnerId && ids.includes(decision.winnerId) ? decision.winnerId : null;
    for (const id of ids) {
      ledger[id].contest = { pin, with: ids.filter((x) => x !== id), decidedWinner: winner };
      if (!winner) pendingContest.add(id);
      else if (id === winner) winners.add(id);
      else losers.set(id, winner);
    }
  }

  // Capacity per territory = min(open slots, free pins). Case rule.
  const claimedPins = new Set<string>();
  const territories: TerritorySummary[] = dataset.territories.map((t) => {
    const occupied = t.pins.filter((p) => storeByPin.has(p)).map((p) => ({ pin: p, storeId: storeByPin.get(p)!.id }));
    const freePins = t.pins.filter((p) => !storeByPin.has(p) && !claimedPins.has(p));
    freePins.forEach((p) => claimedPins.add(p));
    const openSlots = Math.max(0, t.openSlots ?? 0);
    return {
      id: t.id, city: t.city, tier: t.tier, priority: t.priority, openSlots, pins: t.pins, freePins, occupied,
      capacity: Math.min(openSlots, freePins.length), pendingContests: [], goodToGo: [], waitlist: [], holds: [],
    };
  });
  const terById = new Map(territories.map((t) => [t.id, t]));

  for (const t of territories) {
    const members = apps.filter((a) => territoryOf.get(a.id)?.id === t.id).map((a) => a.id);
    const forced = members.filter((id) => manualOf(id) === "Good to go");
    const pending = [...new Set(members.filter((id) => pendingContest.has(id)).map((id) => ledger[id].pin))];
    t.pendingContests = pending;
    const pool = members.filter((id) => qualified.some((q) => q.id === id) && !pendingContest.has(id) && !losers.has(id));
    const byScore = (x: string, y: string) => ledger[y].total - ledger[x].total || x.localeCompare(y, undefined, { numeric: true });
    const rankable = members.filter((id) => pool.includes(id) || pendingContest.has(id)).sort(byScore);
    rankable.forEach((id, i) => {
      ledger[id].rank = i + 1;
      ledger[id].rankOf = rankable.length;
    });
    const available = Math.max(0, t.capacity - forced.length - pending.length);
    pool.sort(byScore);
    pool.forEach((id, i) => {
      const e = ledger[id];
      if (i < available) {
        e.status = e.engineStatus = "Good to go";
        e.slot = { position: forced.length + i + 1, capacity: t.capacity };
        e.reason = `Meets every check; ranked ${e.rank} of ${e.rankOf} in ${t.id}, slot ${e.slot.position} of ${t.capacity}.`;
        t.goodToGo.push(id);
      } else {
        e.status = e.engineStatus = "Waitlist";
        e.waitlistPosition = i - available + 1;
        e.reason = `Qualified, but ${t.id} has no slot left (capacity ${t.capacity}${pending.length ? `, ${pending.length} held for a contested pin` : ""}). Waitlist position ${e.waitlistPosition}.`;
        t.waitlist.push(id);
      }
    });
    for (const id of members) {
      if (pendingContest.has(id)) {
        const e = ledger[id];
        e.status = e.engineStatus = "Needs your decision";
        e.reason = `Pin ${e.pin} is wanted by ${e.contest!.with.length + 1} qualified applicants (${[id, ...e.contest!.with].sort().join(", ")}). Only one store per pin: you decide.`;
      }
      if (losers.has(id)) {
        const e = ledger[id];
        const winner = losers.get(id)!;
        e.status = e.engineStatus = "Hold: pin occupied";
        e.reason = `Reviewer's call gave pin ${e.pin} to ${winner}${ledger[winner].status === "Waitlist" ? ` (who is on the waitlist, so no store is assigned on this pin yet)` : ""}. This profile may still be good; another pin is an option.`;
      }
      if (pinTakenBy.has(id)) {
        const e = ledger[id];
        e.status = e.engineStatus = "Hold: pin occupied";
        e.reason = `Pin ${e.pin} is taken by ${pinTakenBy.get(id)}, whom the reviewer set to Good to go. This profile may still be good; another pin is an option.`;
      }
      if (ledger[id].status.startsWith("Hold")) t.holds.push(id);
    }
    for (const id of forced) t.goodToGo.unshift(id);
    if (forced.length > t.capacity) {
      for (const id of forced) ledger[id].flags.push({ kind: "territory", text: `Warning: ${forced.length} applicants were set to Good to go by hand in ${t.id}, more than its capacity of ${t.capacity}.` });
    }
  }

  // Manual status changes are applied last; the engine's own answer stays in engineStatus.
  for (const e of Object.values(ledger)) {
    if (e.manual) {
      e.status = e.manual.status;
      const engineSaid = e.engineStatus === "Good to go" ? "engine checks: all passed; not allocated a slot automatically" : `engine said: ${e.engineStatus}`;
      e.reason = `Set manually by reviewer: ${e.manual.reason} (${engineSaid}).`;
      if (e.manual.status === "Good to go") {
        const store = storeByPin.get(e.pin);
        if (store) e.flags.push({ kind: "territory", text: `Warning: existing store ${store.id} is on pin ${e.pin}. The case rule is one store per pin.` });
        if (manualPins.get(e.pin) !== e.id) e.flags.push({ kind: "territory", text: `Warning: ${manualPins.get(e.pin)} was also set to Good to go on pin ${e.pin}. Only one store per pin; ${manualPins.get(e.pin)} keeps it.` });
      }
    }
  }

  // What would change the outcome, and next steps (templates read from the ledger only)
  for (const e of Object.values(ledger)) {
    const t = e.territory ? terById.get(e.territory.id) : undefined;
    const w: string[] = [];
    const n: string[] = [];
    switch (e.engineStatus) {
      case "Hold: info needed":
        w.push(...e.fixes.map((f) => `Fix: ${f}`));
        n.push("Contact the applicant for the missing or corrected details.", "Update the file (or use What-if in chat) and re-run.");
        break;
      case "Hold: pin occupied": {
        const others = t ? t.freePins.filter((p) => p !== e.pin) : [];
        if (e.contest?.decidedWinner) w.push(`The reviewer's call on pin ${e.pin} changing.`);
        w.push(others.length ? `A different pin with no store. Free pins in ${t!.id}: ${others.join(", ")}.` : "A different pin with no existing store.");
        if (!e.contest) w.push("A takeover of the existing store on this pin (an option for a human to consider).");
        n.push("Discuss another pin or a possible takeover with the applicant. This is not a rejection.");
        break;
      }
      case "Needs your decision":
        w.push(`Your call on pin ${e.pin} on the Contested pins board.`);
        n.push("Compare the applicants side by side and record a Reviewer's call with notes.");
        break;
      case "Waitlist": {
        const last = t?.goodToGo.map((id) => ledger[id]).filter((x) => !x.manual).at(-1);
        w.push(`A slot opening in ${e.territory?.id} (someone ahead does not proceed) or more open slots.`);
        if (last) w.push(`A total above ${last.total} (the lowest Good to go in ${e.territory?.id}) would move this applicant up.`);
        n.push("Confirm the waitlist order on the Territories page.", "Tell the applicant they are on the waitlist.");
        break;
      }
      case "Good to go":
        w.push("A higher-scoring applicant in the same territory, or fewer open slots, would move this to Waitlist.");
        if (!e.financialProvided) w.push("Entering the financial profile re-scores everyone who has one.");
        n.push("Review the ledger and confirm. Confirming moves the applicant to 'Awaiting paperwork'.");
        if (e.questions.length) n.push("Ask the applicant the open site questions (frontage, visibility, rent) before confirming.");
        break;
      default:
        break;
    }
    if (e.flags.some((f) => f.kind === "liabilities")) n.push("Review the liabilities note before confirming.");
    if (e.flags.some((f) => f.kind === "ai-contradiction")) n.push("Confirm or dismiss the AI-flagged contradiction in the notes.");
    if (e.relevance.by === "Not rated" && e.relevance.reason !== "No business described.") n.push("Rate the relevance of the applicant's business (or wait for the AI rating).");
    if (e.manual) n.unshift(`Status was set manually to '${e.manual.status}'.`);
    e.whatWouldChange = w;
    e.nextSteps = n;
  }

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const e of Object.values(ledger)) counts[e.status]++;
  return { ledger, order: apps.map((a) => a.id), territories, contests: contestList, counts };
}

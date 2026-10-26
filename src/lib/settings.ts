// Scoring settings and regional rubric profiles. Every number here is "Our choice"
// (a placeholder the reviewer can edit in Settings) unless marked "Case rule".

export interface ProfileMatch {
  country: string | null;
  zone: string | null;
  state: string | null;
  city: string | null;
}

export interface ScoringProfile {
  id: string;
  name: string;
  match: ProfileMatch;
  /** Factor maximums; must total 100. */
  weights: { space: number; money: number; experience: number; financial: number };
  /** How the Space points are split; must total weights.space. */
  spaceSplit: { tenure: number; size: number; floor: number };
  /** Share (0-1) of tenure points for each tenure value. */
  tenureRank: { Owned: number; Rented: number };
  /** Size bands in sq ft: below smallBelow = small; from preferredFrom up = preferred. */
  sizeBands: { smallBelow: number; preferredFrom: number };
  sizeRank: { small: number; medium: number; preferred: number };
  floorRank: { Ground: number; "Mall unit": number; Upper: number; "Not known": number };
  /** How the Experience points are split; must total weights.experience. */
  experienceSplit: { years: number; relevance: number };
  relevanceRank: { High: number; Medium: number; Low: number };
  /** How the Financial profile points are split; must total weights.financial. */
  financialSplit: { netWorth: number; portfolio: number };
}

export interface Settings {
  profiles: ScoringProfile[];
  /** Traffic lights: share >= green is green, >= amber is amber, else red. */
  lights: { green: number; amber: number };
  /** Optional launch-feasibility limit in months. Blank by default (no limit). */
  launchLimitMonths: number | null;
  /** Our-choice checks that can be switched off. */
  checks: {
    holdWhenNoSpace: boolean;
    checkPinPrefix: boolean;
    checkContradictions: boolean;
  };
  /** Group 2: what the day 30/60/90/180 check-ins count from. */
  checkinBase: "softLaunch" | "day0";
}

export const DEFAULT_PROFILE: ScoringProfile = {
  id: "default-karnataka",
  name: "Default (Karnataka)",
  match: { country: "India", zone: "Southern", state: "Karnataka", city: null },
  weights: { space: 40, money: 20, experience: 20, financial: 20 },
  spaceSplit: { tenure: 10, size: 20, floor: 10 },
  tenureRank: { Owned: 1, Rented: 0.75 },
  sizeBands: { smallBelow: 400, preferredFrom: 700 },
  sizeRank: { small: 0.25, medium: 0.6, preferred: 1 },
  floorRank: { Ground: 1, "Mall unit": 1, Upper: 0.5, "Not known": 0.2 },
  experienceSplit: { years: 14, relevance: 6 },
  relevanceRank: { High: 1, Medium: 0.5, Low: 0 },
  financialSplit: { netWorth: 10, portfolio: 10 },
};

export const DEFAULT_SETTINGS: Settings = {
  profiles: [DEFAULT_PROFILE],
  lights: { green: 2 / 3, amber: 1 / 3 },
  launchLimitMonths: null,
  checks: { holdWhenNoSpace: true, checkPinPrefix: true, checkContradictions: true },
  checkinBase: "softLaunch",
};

/**
 * Zones follow the Ministry of Home Affairs Zonal Councils (Northern, Central,
 * Eastern, Western, Southern, North Eastern). Used only to match rubric profiles.
 */
export const STATE_ZONE: Record<string, string> = {
  Haryana: "Northern", "Himachal Pradesh": "Northern", Punjab: "Northern", Rajasthan: "Northern",
  Delhi: "Northern", Chandigarh: "Northern", "Jammu and Kashmir": "Northern", Ladakh: "Northern",
  Chhattisgarh: "Central", Uttarakhand: "Central", "Uttar Pradesh": "Central", "Madhya Pradesh": "Central",
  Bihar: "Eastern", Jharkhand: "Eastern", Odisha: "Eastern", "West Bengal": "Eastern",
  Goa: "Western", Gujarat: "Western", Maharashtra: "Western",
  "Dadra and Nagar Haveli and Daman and Diu": "Western",
  "Andhra Pradesh": "Southern", Karnataka: "Southern", Kerala: "Southern", "Tamil Nadu": "Southern",
  Telangana: "Southern", Puducherry: "Southern",
  Assam: "North Eastern", "Arunachal Pradesh": "North Eastern", Manipur: "North Eastern",
  Meghalaya: "North Eastern", Mizoram: "North Eastern", Nagaland: "North Eastern",
  Tripura: "North Eastern", Sikkim: "North Eastern",
};

export function zoneOf(state: string): string | null {
  const key = Object.keys(STATE_ZONE).find((s) => s.toLowerCase() === state.trim().toLowerCase());
  return key ? STATE_ZONE[key] : null;
}

/** Most specific matching profile wins; ties go to the earlier profile in the list. */
export function pickProfile(
  profiles: ScoringProfile[],
  where: { state: string; city: string },
): ScoringProfile {
  const eq = (a: string | null, b: string | null) =>
    a === null || (b !== null && a.toLowerCase() === b.toLowerCase());
  const zone = zoneOf(where.state);
  let best: ScoringProfile | null = null;
  let bestScore = -1;
  for (const p of profiles) {
    const m = p.match;
    const ok =
      eq(m.country, "India") &&
      eq(m.zone, zone) &&
      eq(m.state, where.state) &&
      eq(m.city, where.city);
    if (!ok) continue;
    const score =
      (m.country ? 1 : 0) + (m.zone ? 2 : 0) + (m.state ? 4 : 0) + (m.city ? 8 : 0);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best ?? profiles[0] ?? DEFAULT_PROFILE;
}

/** Returns a list of problems with a profile's numbers (empty when valid). */
export function profileProblems(p: ScoringProfile): string[] {
  const out: string[] = [];
  const w = p.weights;
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  const blanks: string[] = [];
  const walk = (o: unknown, path: string) => {
    if (typeof o === "number") { if (!Number.isFinite(o)) blanks.push(path); return; }
    if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k);
  };
  walk({ weights: p.weights, spaceSplit: p.spaceSplit, tenureRank: p.tenureRank, sizeBands: p.sizeBands, sizeRank: p.sizeRank, floorRank: p.floorRank, experienceSplit: p.experienceSplit, relevanceRank: p.relevanceRank, financialSplit: p.financialSplit }, "");
  if (blanks.length) out.push(`These need a number: ${blanks.join(", ")}.`);
  if (sum(w) !== 100) out.push(`Factor weights add up to ${sum(w)}, not 100.`);
  if (sum(p.spaceSplit) !== w.space) out.push(`Space split adds up to ${sum(p.spaceSplit)}, not ${w.space}.`);
  if (sum(p.experienceSplit) !== w.experience)
    out.push(`Experience split adds up to ${sum(p.experienceSplit)}, not ${w.experience}.`);
  if (sum(p.financialSplit) !== w.financial)
    out.push(`Financial split adds up to ${sum(p.financialSplit)}, not ${w.financial}.`);
  if (p.sizeBands.smallBelow >= p.sizeBands.preferredFrom)
    out.push("Small-space limit must be below the preferred size.");
  return out;
}

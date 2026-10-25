// Shared data types. Raw input types mirror the judges' Excel format (data/template.xlsx).

export const STATUSES = [
  "Good to go",
  "Needs your decision",
  "Hold: info needed",
  "Hold: pin occupied",
  "Waitlist",
  "Not proceeding",
] as const;
export type Status = (typeof STATUSES)[number];

export const SPACE_VALUES = ["Owned", "Rented", "Not yet identified"] as const;
export const FLOOR_VALUES = ["Ground", "Upper", "Mall unit", "Not known"] as const;
export const AREA_TYPES = ["Commercial", "Residential", "Mixed"] as const;
export type AreaType = (typeof AREA_TYPES)[number];
export const RELEVANCE = ["High", "Medium", "Low"] as const;
export type Relevance = (typeof RELEVANCE)[number];

export interface Application {
  rowNumber: number;
  id: string;
  /** True when the row had no Application ID; id is then "ROW-<n>". */
  idMissing?: boolean;
  name: string;
  city: string;
  state: string;
  pin: string;
  investment: number | null;
  experience: number | null;
  business: string;
  spaceAvailable: string;
  spaceSize: number | null;
  floor: string;
  targetLaunch: number | null;
  language: string;
  notes: string;
  /** Cells that held text where a number was expected: column -> raw text */
  badNumbers: Record<string, string>;
}

export interface Territory {
  rowNumber: number;
  id: string;
  city: string;
  state: string;
  pins: string[];
  tier: string;
  openSlots: number | null;
  priority: string;
}

export interface Store {
  id: string;
  city: string;
  pin: string;
  opened: number | null;
}

export interface AllowedCity {
  city: string;
  state: string;
  prefix: string;
  tier: string;
}

export interface Problem {
  sheet: string;
  row: number | null;
  id?: string;
  message: string;
}

export interface ValidationReport {
  fileName: string;
  sheetsFound: string[];
  rowsRead: { applications: number; territories: number; stores: number };
  problems: Problem[];
  /** Set when the file could not be used at all. */
  fatal?: string;
}

export interface Dataset {
  applications: Application[];
  territories: Territory[];
  stores: Store[];
  allowedCities: AllowedCity[];
  languages: string[];
  report: ValidationReport;
}

/** What the AI read from free text. Suggestions only: the reviewer can override. */
export interface AiAssessment {
  relevance: Relevance;
  reason: string;
  contradiction: { found: boolean; detail: string };
  source: "ai";
}

export interface ReviewerInput {
  netWorth?: number | null;
  portfolio?: number | null;
  liabilities?: string;
  relevanceOverride?: Relevance | null;
  areaType?: AreaType | null;
  /** Reviewer's verdict on an AI-flagged contradiction in the notes. */
  aiContradiction?: "confirmed" | "dismissed" | null;
  /** Site details asked of the applicant (not in the Excel file). Shown, never scored. */
  site?: SiteDetails;
  manualStatus?: { status: Status; reason: string; at: string } | null;
}

export const VISIBILITY = ["Faces a main road", "On a side street", "Inside a mall", "Not known"] as const;
export interface SiteDetails {
  /** Width of the shop front facing the street, in feet. */
  frontageFt?: number | null;
  visibility?: (typeof VISIBILITY)[number] | null;
  /** Monthly rent in rupees (only relevant when the space is rented). */
  monthlyRent?: number | null;
}

export interface ContestDecision {
  winnerId: string | null;
  notes: string;
  at: string | null;
}

export interface WaitlistConfirmation {
  order: string[];
  at: string;
}

export interface ActionLogEntry {
  at: string;
  kind: string;
  applicantId?: string;
  detail: string;
}

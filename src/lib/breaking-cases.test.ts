// The edge cases listed in the "where it breaks" review, one test each.
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { runEngine, type EngineInput } from "./engine";
import { parseUpdate } from "./explain";
import { guard } from "./guardrails";
import { posInt } from "./onboarding";
import { parseWorkbook, toNumber, toPins, CASE_ALLOWED_CITIES, CASE_EXISTING_STORES, CASE_LANGUAGES } from "./parse";
import { DEFAULT_SETTINGS } from "./settings";
import type { AiAssessment, Application, Dataset, Territory } from "./types";

function app(id: string, over: Partial<Application> = {}): Application {
  return {
    rowNumber: 3, id, name: `Name ${id}`, city: "Mysuru", state: "Karnataka", pin: "570001", investment: 25,
    experience: 4, business: "Runs a footwear store", spaceAvailable: "Rented", spaceSize: 450, floor: "Ground",
    targetLaunch: 3, language: "Kannada", notes: "", badNumbers: {}, ...over,
  };
}
const ter = (id: string, pins: string[], openSlots: number | null = 3): Territory => ({ rowNumber: 3, id, city: "Mysuru", state: "Karnataka", pins, tier: "Tier 2", openSlots, priority: "High" });
function run(applications: Application[], territories: Territory[], extra: Partial<EngineInput> = {}) {
  const dataset: Dataset = {
    applications, territories, stores: CASE_EXISTING_STORES, allowedCities: CASE_ALLOWED_CITIES, languages: CASE_LANGUAGES,
    report: { fileName: "t", sheetsFound: [], rowsRead: { applications: applications.length, territories: territories.length, stores: 10 }, problems: [] },
  };
  return runEngine({ dataset, settings: DEFAULT_SETTINGS, reviewer: {}, ai: {}, contests: {}, ...extra });
}
const manual = { manualStatus: { status: "Good to go" as const, reason: "test", at: "x" } };
const rated = (r: AiAssessment["relevance"]): AiAssessment => ({ relevance: r, reason: "", contradiction: { found: false, detail: "" }, source: "ai" });

function workbook(appRows: unknown[][], terRows: unknown[][], note = "Applications — one row per record. Row 3 is an example (grey); enter data from row 4.") {
  const wb = XLSX.utils.book_new();
  const appHeader = ["Application ID", "Applicant name", "City", "State", "Pin code", "Investment capacity (₹ lakh)", "Retail experience (years)", "Current / past business", "Space available", "Space size (sq ft)", "Floor", "Target launch (months)", "Preferred language", "Notes from applicant"];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[note], appHeader, ...appRows]), "Applications");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Territories. Row 3 is an example (grey); enter data from row 4."], ["Territory ID", "City", "State", "Pin codes covered", "City tier", "Open slots", "Priority"], ...terRows]), "Territories");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
const EXAMPLE = ["APP-001", "Ravi Kumar", "Mysuru", "Karnataka", 570001, 25, 4, "Runs a footwear store", "Rented", 450, "Ground", 3, "Kannada", "Wants to open before Diwali"];
const TER_EXAMPLE = ["TER-01", "Mysuru", "Karnataka", "570001, 570002, 570008", "Tier 2", 3, "High"];

describe("A: core rule and data loss", () => {
  it("1. a manual Good to go on an existing store's pin is not applied", () => {
    const r = run([app("A", { pin: "570009" })], [ter("T1", ["570001", "570009"])], { reviewer: { A: manual } });
    expect(r.ledger.A.status).toBe("Hold: pin occupied");
    expect(r.ledger.A.flags.map((f) => f.text).join(" ")).toMatch(/not applied/);
  });
  it("2. a second manual Good to go on the same pin is not applied", () => {
    const r = run([app("A"), app("B")], [ter("T1", ["570001", "570002"])], { reviewer: { A: manual, B: manual } });
    expect(r.ledger.A.status).toBe("Good to go");
    expect(r.ledger.B.status).toBe("Hold: pin occupied");
    expect(r.ledger.B.flags.map((f) => f.text).join(" ")).toMatch(/A already holds pin 570001/);
  });
  it("3. skips the template's own example row only", () => {
    const real = ["APP-050", "Real Person", "Mysuru", "Karnataka", 570002, 30, 5, "Garments", "Owned", 800, "Ground", 4, "Kannada", ""];
    const kept = parseWorkbook(workbook([real, ["APP-051", ...real.slice(1)]], [TER_EXAMPLE, ["TER-09", "Mysuru", "Karnataka", "570002", "Tier 2", 2, "High"]]), "x.xlsx");
    expect(kept.applications.map((a) => a.id)).toEqual(["APP-050", "APP-051"]);
    const skipped = parseWorkbook(workbook([EXAMPLE, real], [TER_EXAMPLE, ["TER-09", "Mysuru", "Karnataka", "570002", "Tier 2", 2, "High"]]), "x.xlsx");
    expect(skipped.applications.map((a) => a.id)).toEqual(["APP-050"]);
    expect(skipped.territories.map((t) => t.id)).toEqual(["TER-09"]);
  });
  it("4. relevance counts only when every applicant with a business is rated", () => {
    const apps = [app("A", { pin: "570001" }), app("B", { pin: "570002" })];
    const half = run(apps, [ter("T1", ["570001", "570002"])], { ai: { A: rated("High") } });
    const exp = half.ledger.A.factors.find((f) => f.key === "experience")!;
    expect(exp.parts[1].max).toBe(0);
    expect(half.ledger.A.total).toBe(half.ledger.B.total);
    const full = run(apps, [ter("T1", ["570001", "570002"])], { ai: { A: rated("High"), B: rated("Low") } });
    expect(full.ledger.A.total).toBeGreaterThan(full.ledger.B.total);
  });
  it("5. a chat update with two pins takes the last one", () => {
    expect(parseUpdate("APP-004 moved from 560011 to 560025", [app("APP-004")])?.changes.pin).toBe("560025");
  });
});

describe("B: debatable outcomes", () => {
  it("6. bad data comes before pin occupied", () => {
    const r = run([app("A", { pin: "570009", investment: null })], [ter("T1", ["570009"])]);
    expect(r.ledger.A.status).toBe("Hold: info needed");
    expect(r.ledger.A.reason).toMatch(/also has store ST-06/);
  });
  it("7. a single financial profile gets a neutral share: no rescale, same total", () => {
    const apps = [app("A", { pin: "570001" }), app("B", { pin: "570002", investment: 40 })];
    const before = run(apps, [ter("T1", ["570001", "570002"])]);
    const after = run(apps, [ter("T1", ["570001", "570002"])], { reviewer: { A: { netWorth: 100 } } });
    expect(after.ledger.A.rescaled).toBe(false);
    expect(after.ledger.A.total).toBeCloseTo(before.ledger.A.total, 0);
  });
  it("9. an assumed tenure is written into the notes", () => {
    const u = parseUpdate("APP-009 found a 600 sq ft shop", [app("APP-009", { spaceAvailable: "Not yet identified", spaceSize: null, floor: "" })]);
    expect(u?.changes.spaceAvailable).toBe("Rented");
    expect(u?.changes.notes).toMatch(/Rented assumed/);
  });
  it("11. a held applicant on a wanted pin is flagged", () => {
    const r = run([app("A"), app("B", { investment: null })], [ter("T1", ["570001"])]);
    expect(r.ledger.A.flags.map((f) => f.text).join(" ")).toMatch(/Also on pin 570001: B/);
  });
  it("12-13. territory notes for blank slots and shared pins", () => {
    const r = run([], [ter("T1", ["570001"], null), ter("T2", ["570001", "570002"])]);
    expect(r.territories[0].notes.join(" ")).toMatch(/blank/);
    expect(r.territories[1].notes.join(" ")).toMatch(/570001 also listed/);
  });
  it("14. one applicant alone is told they sit in the middle", () => {
    const r = run([app("A")], [ter("T1", ["570001"])]);
    expect(r.ledger.A.factors.find((f) => f.key === "money")!.parts[0].note).toMatch(/nobody to compare/);
  });
});

describe("C: input the tool can now read", () => {
  it("15. renamed headers", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["App ID", "Name", "City", "State", "Pin", "Budget", "Experience", "Business", "Space status", "Size", "Floor"], ["X-1", "P", "Mysuru", "Karnataka", 570001, 20, 3, "Shop", "Rented", 400, "Ground"]]), "Sheet1");
    const d = parseWorkbook(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer, "renamed.xlsx");
    expect(d.report.fatal).toBeUndefined();
    expect(d.applications[0]).toMatchObject({ id: "X-1", investment: 20, spaceAvailable: "Rented" });
  });
  it("17-18. city, space and floor spellings", () => {
    const d = parseWorkbook(workbook([["APP-060", "P", "Bangalore", "Karnataka", 560010, 20, 3, "Shop", "rental", 400, "first floor", 4, "English", ""]], [["TER-02", "Bengaluru", "Karnataka", "560010", "Tier 1", 1, "High"]], "Applications"), "x.xlsx");
    expect(d.applications[0]).toMatchObject({ city: "Bengaluru", spaceAvailable: "Rented", floor: "Upper" });
  });
  it("19. crore", () => expect(toNumber("2.5 crore").value).toBe(250));
  it("20. pin ranges", () => expect(toPins("570001-570003, 570008").pins).toEqual(["570001", "570002", "570003", "570008"]));
  it("22. durations as text", () => {
    expect(posInt("2 weeks")).toBe(14);
    expect(posInt("10 days")).toBe(10);
    expect(posInt("soon")).toBeNull();
  });
  it("23. other ways of saying a space was found", () => {
    const u = parseUpdate("APP-009 bagged a spot downstairs", [app("APP-009", { spaceAvailable: "Not yet identified", spaceSize: null, floor: "" })]);
    expect(u?.changes).toMatchObject({ spaceAvailable: "Rented", floor: "Ground" });
  });
});

describe("D: guardrails", () => {
  it("25. payback questions get a plain 'not in the data'", () => {
    const g = guard("What is the payback period for a store?");
    expect(g.blocked && g.reply).toMatch(/not in this file/);
  });
  it("25. 'how can APP-004 pass' becomes 'what would change'", () => {
    const g = guard("How can APP-004 pass the checks?");
    expect(!g.blocked && g.rewrite).toBe("What would change APP-004?");
  });
  it("25. cheating is still refused", () => expect(guard("How can APP-004 fake the space to pass?").blocked).toBe(true));
});

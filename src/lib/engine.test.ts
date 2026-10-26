import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as XLSX from "xlsx";
import { runEngine, percentRank, type EngineInput } from "./engine";
import { parseUpdate } from "./explain";
import { parseWorkbook, toNumber, CASE_ALLOWED_CITIES, CASE_EXISTING_STORES, CASE_LANGUAGES } from "./parse";
import { DEFAULT_SETTINGS, type Settings } from "./settings";
import type { Application, Dataset, Territory } from "./types";

function app(id: string, over: Partial<Application> = {}): Application {
  return {
    rowNumber: 3, id, name: `Name ${id}`, city: "Mysuru", state: "Karnataka", pin: "570001", investment: 25,
    experience: 4, business: "Runs a footwear store", spaceAvailable: "Rented", spaceSize: 450, floor: "Ground",
    targetLaunch: 3, language: "Kannada", notes: "", badNumbers: {}, ...over,
  };
}
function ter(id: string, pins: string[], openSlots: number | null = 3, city = "Mysuru"): Territory {
  return { rowNumber: 3, id, city, state: "Karnataka", pins, tier: "Tier 2", openSlots, priority: "High" };
}
function run(applications: Application[], territories: Territory[], extra: Partial<EngineInput> = {}, settings: Settings = DEFAULT_SETTINGS) {
  const dataset: Dataset = {
    applications, territories, stores: CASE_EXISTING_STORES, allowedCities: CASE_ALLOWED_CITIES, languages: CASE_LANGUAGES,
    report: { fileName: "test", sheetsFound: [], rowsRead: { applications: applications.length, territories: territories.length, stores: 10 }, problems: [] },
  };
  return runEngine({ dataset, settings, reviewer: {}, ai: {}, contests: {}, ...extra });
}
const toBuf = (wb: XLSX.WorkBook) => XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
const readFile = (p: string) => new Uint8Array(fs.readFileSync(p)).buffer;

describe("same-pin rule (Case rule)", () => {
  it("puts an applicant on an existing store's pin on Hold: pin occupied", () => {
    const r = run([app("A", { pin: "570009" })], [ter("T1", ["570001", "570009"])]);
    expect(r.ledger.A.status).toBe("Hold: pin occupied");
    expect(r.ledger.A.checks.find((c) => c.key === "same-pin-store")?.source).toBe("Case rule");
    expect(r.ledger.A.whatWouldChange.join(" ")).toMatch(/takeover/);
  });
  it("marks two qualified applicants on one free pin as Needs your decision and never picks", () => {
    const r = run([app("A"), app("B", { investment: 90 })], [ter("T1", ["570001", "570002"])]);
    expect(r.ledger.A.status).toBe("Needs your decision");
    expect(r.ledger.B.status).toBe("Needs your decision");
    expect(r.contests).toHaveLength(1);
  });
  it("applies the reviewer's call: winner competes for a slot, the other is held", () => {
    const r = run([app("A"), app("B")], [ter("T1", ["570001", "570002"])], { contests: { "570001": { winnerId: "B", notes: "", at: "x" } } });
    expect(r.ledger.B.status).toBe("Good to go");
    expect(r.ledger.A.status).toBe("Hold: pin occupied");
  });
});

describe("capacity and waitlist (Case rule limits)", () => {
  it("capacity = min(open slots, free pins)", () => {
    const r = run([], [ter("T1", ["570001", "570009"], 5), ter("T2", ["570001", "570002", "570003"], 1)]);
    expect(r.territories[0].capacity).toBe(1); // 570009 has a store
    expect(r.territories[1].capacity).toBe(1);
  });
  it("waitlists qualified applicants beyond capacity, in score order", () => {
    const apps = [
      app("A", { pin: "570001", investment: 10 }),
      app("B", { pin: "570002", investment: 50 }),
      app("C", { pin: "570008", investment: 30 }),
    ];
    const r = run(apps, [ter("T1", ["570001", "570002", "570008"], 1)]);
    expect(r.ledger.B.status).toBe("Good to go");
    expect(r.ledger.C.status).toBe("Waitlist");
    expect(r.ledger.C.waitlistPosition).toBe(1);
    expect(r.ledger.A.waitlistPosition).toBe(2);
  });
  it("counts an undecided contested pin as one pending slot", () => {
    const apps = [app("A", { pin: "570001" }), app("B", { pin: "570001" }), app("C", { pin: "570002" })];
    const r = run(apps, [ter("T1", ["570001", "570002"], 1)]);
    expect(r.ledger.C.status).toBe("Waitlist");
  });
  it("treats blank open slots as 0", () => {
    const r = run([app("A")], [ter("T1", ["570001"], null)]);
    expect(r.ledger.A.status).toBe("Waitlist");
  });
});

describe("Hold: info needed triggers", () => {
  const T = [ter("T1", ["570001"]), ter("TB", ["560011"], 1, "Bengaluru")];
  const hold = (over: Partial<Application>) => run([app("A", over)], T).ledger.A;
  it("missing required field", () => expect(hold({ name: "" }).status).toBe("Hold: info needed"));
  it("text in a number column", () => expect(hold({ investment: null, badNumbers: { investment: "twenty" } }).fixes.join()).toMatch(/twenty/));
  it("pin not 6 digits", () => expect(hold({ pin: "57000" }).status).toBe("Hold: info needed"));
  it("pin prefix does not match the city", () => expect(hold({ pin: "560011" }).fixes.join()).toMatch(/does not start with 570/));
  it("no territory covers the pin", () => expect(hold({ pin: "570099" }).fixes.join()).toMatch(/No territory/));
  it("no space yet", () => expect(hold({ spaceAvailable: "Not yet identified", spaceSize: null, floor: "Not known" }).status).toBe("Hold: info needed"));
  it("contradiction: no space but a size", () => expect(hold({ spaceAvailable: "Not yet identified", spaceSize: 500 }).fixes.join()).toMatch(/size of 500/));
  it("AI-flagged contradiction is only a flag until the reviewer confirms", () => {
    const ai = { A: { relevance: "High" as const, reason: "", contradiction: { found: true, detail: "says no shop" }, source: "ai" as const } };
    expect(run([app("A")], T, { ai }).ledger.A.status).toBe("Good to go");
    expect(run([app("A")], T, { ai, reviewer: { A: { aiContradiction: "confirmed" } } }).ledger.A.status).toBe("Hold: info needed");
  });
  it("info checks are tagged Our choice", () => expect(hold({ pin: "57000" }).checks.find((c) => c.key === "pin-format")?.source).toBe("Our choice"));
});

describe("scoring", () => {
  it("rescales to 100 when the financial profile is blank", () => {
    const e = run([app("A", { spaceAvailable: "Owned", spaceSize: 800 })], [ter("T1", ["570001"])]).ledger.A;
    expect(e.rescaled).toBe(true);
    expect(e.factors.map((f) => f.max)).toEqual([50, 25, 25, 0]);
    // Space full: 10+20+10 = 40 -> 50 after rescale; alone in the file -> money/years at 0.5
    expect(e.factors[0].points).toBe(50);
  });
  it("uses the 40/20/20/20 split when the financial profile is provided", () => {
    const e = run([app("A"), app("B", { pin: "570002" })], [ter("T1", ["570001", "570002"])], { reviewer: { A: { netWorth: 100 }, B: { netWorth: 50 } } }).ledger.A;
    expect(e.rescaled).toBe(false);
    expect(e.factors.map((f) => f.max)).toEqual([40, 20, 20, 20]);
  });
  it("liabilities are a flag only and never change score or status", () => {
    const base = run([app("A")], [ter("T1", ["570001"])]).ledger.A;
    const flagged = run([app("A")], [ter("T1", ["570001"])], { reviewer: { A: { liabilities: "Old loan default" } } }).ledger.A;
    expect(flagged.total).toBe(base.total);
    expect(flagged.status).toBe(base.status);
    expect(flagged.flags.some((f) => f.kind === "liabilities")).toBe(true);
  });
  it("size bands: under 400 small, 400-699 medium, 700+ preferred", () => {
    const pts = (s: number) => run([app("A", { spaceSize: s })], [ter("T1", ["570001"])]).ledger.A.factors[0].parts[1].value;
    expect(pts(399)).toMatch(/small/);
    expect(pts(400)).toMatch(/medium/);
    expect(pts(700)).toMatch(/preferred/);
  });
  it("percent rank", () => {
    expect(percentRank(5, [5])).toBe(0.5);
    expect(percentRank(10, [1, 5, 10])).toBe(1);
    expect(percentRank(1, [1, 5, 10])).toBe(0);
  });
  it("launch timing is never scored; a note appears only when a limit is set", () => {
    const a = run([app("A", { targetLaunch: 1 })], [ter("T1", ["570001"])]).ledger.A;
    expect(a.flags.some((f) => f.kind === "launch")).toBe(false);
    const b = run([app("A", { targetLaunch: 1 })], [ter("T1", ["570001"])], {}, { ...DEFAULT_SETTINGS, launchLimitMonths: 3 }).ledger.A;
    expect(b.flags.some((f) => f.kind === "launch")).toBe(true);
    expect(b.total).toBe(a.total);
  });
});

describe("manual status changes", () => {
  it("are applied and keep the engine's answer", () => {
    const r = run([app("A")], [ter("T1", ["570001"])], { reviewer: { A: { manualStatus: { status: "Not proceeding", reason: "Withdrew", at: "x" } } } });
    expect(r.ledger.A.status).toBe("Not proceeding");
    expect(r.ledger.A.engineStatus).toBe("Good to go");
    expect(r.ledger.A.reason).toMatch(/engine checks: all passed/);
  });
  it("a manual Not proceeding frees the slot for the waitlist", () => {
    const apps = [app("A", { pin: "570001", investment: 50 }), app("B", { pin: "570002", investment: 10 })];
    const t = [ter("T1", ["570001", "570002"], 1)];
    expect(run(apps, t).ledger.B.status).toBe("Waitlist");
    const r = run(apps, t, { reviewer: { A: { manualStatus: { status: "Not proceeding", reason: "x", at: "x" } } } });
    expect(r.ledger.B.status).toBe("Good to go");
  });
});

describe("parsing dirty files", () => {
  it("reads the judges' template", () => {
    const d = parseWorkbook(readFile("data/template.xlsx"), "template.xlsx");
    expect(d.report.fatal).toBeUndefined();
    expect(d.applications.map((a) => a.id)).toEqual(["APP-001"]);
    expect(d.territories[0].pins).toEqual(["570001", "570002", "570008"]);
    expect(d.stores).toHaveLength(10);
    expect(run(d.applications, d.territories).ledger["APP-001"].status).toBe("Good to go");
  });
  it("handles blanks, text numbers, duplicate IDs, pins as text and columns in another order", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["title"],
      ["Pin code", "Application ID", "Applicant name", "City", "State", "Investment capacity (₹ lakh)", "Retail experience (years)", "Space available"],
      [" 570001 ", "A1", "X", "Mysuru", "Karnataka", "twenty", "3", "rented"],
      ["", "", "", "", "", "", "", ""],
      [570002, "A1", "Dup", "Mysuru", "Karnataka", 10, 1, "Owned"],
      [570002, "", "No id", "Mysuru", "Karnataka", "1,200", 1, "Owned"],
    ]), "Applications");
    const d = parseWorkbook(toBuf(wb), "dirty.xlsx");
    expect(d.applications).toHaveLength(2);
    expect(d.applications[0].pin).toBe("570001");
    expect(d.applications[0].spaceAvailable).toBe("Rented");
    expect(d.applications[0].badNumbers.investment).toBe("twenty");
    expect(d.applications[1].idMissing).toBe(true);
    expect(d.applications[1].investment).toBe(1200);
    expect(d.report.problems.some((p) => /Duplicate/.test(p.message))).toBe(true);
    expect(d.stores).toHaveLength(10); // falls back to the case's fixed list
  });
  it("returns a readable message for a non-Excel file", () => {
    const d = parseWorkbook(new TextEncoder().encode("hello").buffer as ArrayBuffer, "x.txt");
    expect(d.report.fatal).toBeTruthy();
  });
});

describe("demo file with deliberate traps", () => {
  const d = parseWorkbook(readFile("public/samples/demo-messy.xlsx"), "demo.xlsx");
  const r = runEngine({ dataset: d, settings: DEFAULT_SETTINGS, reviewer: {}, ai: {}, contests: {} });
  const s = (id: string) => r.ledger[id].status;
  it("finds each trap", () => {
    expect(d.applications).toHaveLength(30);
    expect(s("APP-001")).toBe("Needs your decision");
    expect(s("APP-002")).toBe("Needs your decision");
    expect(s("APP-003")).toBe("Hold: pin occupied");
    expect(s("APP-029")).toBe("Hold: pin occupied");
    expect(s("APP-007")).toBe("Hold: info needed");
    expect(s("APP-008")).toBe("Hold: info needed");
    expect(s("APP-009")).toBe("Hold: info needed");
    expect(s("APP-010")).toBe("Hold: info needed");
    expect(s("APP-013")).toBe("Hold: info needed");
    expect(s("APP-014")).toBe("Hold: info needed");
    expect(s("APP-015")).toBe("Hold: info needed");
    expect(s("APP-027")).toBe("Hold: info needed");
    expect(s("APP-028")).toBe("Hold: info needed");
    expect(s("APP-016")).not.toMatch(/Hold/);
    expect(s("APP-017")).toBe("Needs your decision");
    expect(r.ledger["APP-031"].flags.some((f) => f.kind === "language")).toBe(true);
  });
});

describe("audit fixes", () => {
  it("a manual Good to go reserves its pin (one store per pin)", () => {
    const r = run([app("A"), app("B")], [ter("T1", ["570001", "570002"])], { reviewer: { A: { manualStatus: { status: "Good to go", reason: "site visit", at: "x" } } } });
    expect(r.ledger.A.status).toBe("Good to go");
    expect(r.ledger.B.status).toBe("Hold: pin occupied");
    expect(r.ledger.B.reason).toMatch(/taken by A/);
  });
  it("a manual Good to go on a pin with a store is warned", () => {
    const r = run([app("A", { pin: "570009" })], [ter("T1", ["570001", "570009"])], { reviewer: { A: { manualStatus: { status: "Good to go", reason: "x", at: "x" } } } });
    expect(r.ledger.A.flags.some((f) => /existing store/.test(f.text))).toBe(true);
  });
  it("entering one applicant's financial profile never lowers their score", () => {
    const apps = [app("A"), app("B", { pin: "570002" })];
    const T = [ter("T1", ["570001", "570002"])];
    const before = run(apps, T).ledger.A.total;
    const after = run(apps, T, { reviewer: { A: { netWorth: 500 } } }).ledger.A;
    expect(after.total).toBe(before);
    expect(after.factors[3].parts[0].value).toMatch(/needs at least 2/);
  });
  it("a financial profile with only one part scores that part at full weight", () => {
    const apps = [app("A"), app("B", { pin: "570002" })];
    const e = run(apps, [ter("T1", ["570001", "570002"])], { reviewer: { A: { netWorth: 500 }, B: { netWorth: 100 } } }).ledger.A;
    expect(e.factors[3].points).toBe(20);
  });
  it("relative traffic lights follow rank thirds", () => {
    const apps = [10, 20, 30, 40, 50, 60].map((inv, i) => app(`A${i}`, { pin: `57000${i}`, investment: inv }));
    const r = run(apps, [ter("T1", apps.map((a) => a.pin), 6)]);
    expect(r.ledger.A5.factors[1].light).toBe("green");
    expect(r.ledger.A0.factors[1].light).toBe("red");
  });
  it("flags notes that say there is no shop, without AI, and holds only once confirmed", () => {
    const a = app("A", { notes: "I don't have a shop yet, still searching" });
    const flagged = run([a], [ter("T1", ["570001"])]).ledger.A;
    expect(flagged.status).toBe("Good to go");
    expect(flagged.flags.some((f) => f.kind === "ai-contradiction")).toBe(true);
    expect(run([a], [ter("T1", ["570001"])], { reviewer: { A: { aiContradiction: "confirmed" } } }).ledger.A.status).toBe("Hold: info needed");
  });
  it("ties sort numerically by ID", () => {
    const r = run([app("APP-10", { pin: "570001" }), app("APP-9", { pin: "570002" })], [ter("T1", ["570001", "570002"], 1)]);
    expect(r.ledger["APP-9"].status).toBe("Good to go");
  });
  it("a pin listed in two territories is free in the first only", () => {
    const r = run([], [ter("T1", ["570001"], 1), ter("T2", ["570001"], 1)]);
    expect(r.territories[0].capacity).toBe(1);
    expect(r.territories[1].capacity).toBe(0);
  });
});

describe("parser audit fixes", () => {
  it("reads common Indian number formats", () => {
    for (const [v, n] of [["Rs. 20", 20], ["450 sq. ft.", 450], ["450sqft", 450], ["5yrs", 5], ["25L", 25], ["25 lakh", 25], ["1,200", 1200]] as const) {
      expect(toNumber(v).value).toBe(n);
    }
    expect(toNumber("twenty").bad).toBe(true);
  });
  it("skips the template's example row when real rows follow, keeps it when it is alone", () => {
    const header = ["Application ID", "Applicant name", "City", "State", "Pin code", "Investment capacity (₹ lakh)", "Retail experience (years)", "Space available"];
    const note = "Applications — one row per record. Row 3 is an example (grey); enter data from row 4.";
    const book = (rows: unknown[][]) => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[note], header, ...rows]), "Applications");
      return parseWorkbook(toBuf(wb), "t.xlsx");
    };
    const example = ["APP-001", "Ravi Kumar", "Mysuru", "Karnataka", 570001, 25, 4, "Rented"];
    const two = book([example, ["APP-001", "Real Person", "Mysuru", "Karnataka", 570002, 30, 5, "Owned"]]);
    expect(two.applications.map((a) => a.name)).toEqual(["Real Person"]);
    expect(two.report.problems.some((p) => /example row/.test(p.message))).toBe(true);
    expect(book([example]).applications).toHaveLength(1);
  });
  it("flags an investment that looks like rupees instead of lakh", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["x"], ["Application ID", "Applicant name", "Investment capacity (₹ lakh)"], ["A", "B", "₹25,00,000"]]), "Applications");
    const d = parseWorkbook(toBuf(wb), "t.xlsx");
    expect(d.applications[0].investment).toBeNull();
    expect(d.applications[0].badNumbers.investment).toMatch(/rupees/);
  });
});

describe("site details (asked, not scored)", () => {
  it("asks frontage, visibility and rent (rent only when rented) and never changes the score", () => {
    const base = run([app("A", { spaceAvailable: "Rented" })], [ter("T1", ["570001"])]).ledger.A;
    expect(base.questions).toHaveLength(3);
    const filled = run([app("A", { spaceAvailable: "Rented" })], [ter("T1", ["570001"])], { reviewer: { A: { site: { frontageFt: 20, visibility: "Faces a main road", monthlyRent: 60000 } } } }).ledger.A;
    expect(filled.questions).toHaveLength(0);
    expect(filled.total).toBe(base.total);
    expect(filled.checks.find((c) => c.key === "site-details")?.input).toMatch(/frontage 20 ft/);
    expect(run([app("A", { spaceAvailable: "Owned" })], [ter("T1", ["570001"])]).ledger.A.questions.some((q) => /rent/.test(q))).toBe(false);
  });
});

describe("chat: new information and what-ifs without AI", () => {
  const apps = [app("APP-012", { spaceAvailable: "Not yet identified", spaceSize: null, floor: "Not known" }), app("APP-004")];
  it("applies 'has now found a ground-floor space' as new information, assuming rented", () => {
    const u = parseUpdate("APP-012 has now found a ground-floor space", apps)!;
    expect(u.hypothetical).toBe(false);
    expect(u.changes).toMatchObject({ floor: "Ground", spaceAvailable: "Rented" });
    expect(u.assumptions[0]).toMatch(/rented/);
  });
  it("reads size, investment, experience, pin, city and tenure", () => {
    expect(parseUpdate("APP-004 now has 700 sq ft", apps)!.changes.spaceSize).toBe(700);
    expect(parseUpdate("APP-004 can invest 30 lakh", apps)!.changes.investment).toBe(30);
    expect(parseUpdate("APP-004 has 6 years of retail experience", apps)!.changes.experience).toBe(6);
    expect(parseUpdate("APP-004's pin is actually 570002", apps)!.changes.pin).toBe("570002");
    expect(parseUpdate("APP-004 wants to open in Mysore instead", apps)!.changes.city).toBe("Mysuru");
    expect(parseUpdate("APP-012 bought a 650 sq ft shop on the first floor", apps)!.changes).toMatchObject({ spaceAvailable: "Owned", spaceSize: 650, floor: "Upper" });
  });
  it("treats 'what if' as a preview", () => {
    expect(parseUpdate("What if APP-004 had a 700 sq ft space?", apps)!.hypothetical).toBe(true);
  });
  it("ignores questions with no change", () => {
    expect(parseUpdate("Why is APP-004 on hold?", apps)).toBeNull();
  });
});

describe("chat: questions are not updates", () => {
  it("does not read a why-question with a pin as new information", () => {
    expect(parseUpdate("Why is APP-004 not allowed in 570002?", [app("APP-004")])).toBeNull();
    expect(parseUpdate("Is APP-004 on the waitlist because of 350 sq ft?", [app("APP-004")])).toBeNull();
  });
});

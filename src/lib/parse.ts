// Reads the judges' Excel file. Headers are found by name, not position, and a bad
// row never throws: it is recorded in the validation report instead.
import * as XLSX from "xlsx";
import type { AllowedCity, Application, Dataset, Problem, Store, Territory } from "./types";

/** From the case file's "Allowed values" sheet; used only if that sheet is missing. */
export const CASE_ALLOWED_CITIES: AllowedCity[] = [
  { city: "Bengaluru", state: "Karnataka", prefix: "560", tier: "Tier 1" },
  { city: "Mysuru", state: "Karnataka", prefix: "570", tier: "Tier 2" },
  { city: "Mangaluru", state: "Karnataka", prefix: "575", tier: "Tier 2" },
  { city: "Hubballi-Dharwad", state: "Karnataka", prefix: "580", tier: "Tier 2" },
  { city: "Belagavi", state: "Karnataka", prefix: "590", tier: "Tier 2" },
  { city: "Tumakuru", state: "Karnataka", prefix: "572", tier: "Tier 3" },
  { city: "Davanagere", state: "Karnataka", prefix: "577", tier: "Tier 3" },
];
export const CASE_LANGUAGES = ["Kannada", "English", "Hindi"];

/** From the case file's fixed "Existing stores" sheet; used only if that sheet is missing. */
export const CASE_EXISTING_STORES: Store[] = [
  ["ST-01", "Bengaluru", "560001", 2019], ["ST-02", "Bengaluru", "560034", 2020],
  ["ST-03", "Bengaluru", "560038", 2021], ["ST-04", "Bengaluru", "560066", 2022],
  ["ST-05", "Bengaluru", "560076", 2023], ["ST-06", "Mysuru", "570009", 2021],
  ["ST-07", "Mysuru", "570017", 2024], ["ST-08", "Mangaluru", "575001", 2022],
  ["ST-09", "Hubballi-Dharwad", "580020", 2023], ["ST-10", "Belagavi", "590001", 2024],
].map(([id, city, pin, opened]) => ({ id, city, pin, opened }) as Store);

type Row = unknown[];
const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const text = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Accepts 25, "25", "25.5", "₹ 25", "1,200", "450 sq ft". Anything else is null. */
export function toNumber(v: unknown): { value: number | null; bad: boolean } {
  if (v === null || v === undefined || v === "") return { value: null, bad: false };
  if (typeof v === "number") return Number.isFinite(v) ? { value: v, bad: false } : { value: null, bad: true };
  const raw = String(v).trim();
  if (raw === "") return { value: null, bad: false };
  const cleaned = raw
    .replace(/[₹,]/g, "")
    .replace(/(rs\.?|inr|lakhs?|lacs?|l\b|sq\.?\s*ft\.?|sqft|square\s*feet|years?|yrs?\.?|months?|mths?)/gi, "")
    .trim();
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) return { value: Number(cleaned), bad: false };
  return { value: null, bad: true };
}

export function toPin(v: unknown): string {
  if (typeof v === "number") return String(Math.trunc(v));
  return String(v ?? "").replace(/\s+/g, "").replace(/\.0+$/, "");
}

function findSheet(wb: XLSX.WorkBook, key: string): XLSX.WorkSheet | null {
  const name = wb.SheetNames.find((n) => norm(n).includes(key));
  return name ? wb.Sheets[name] : null;
}

/** Finds the header row (the first row in the top 15 that contains `anchor`) and maps columns. */
function readTable(
  sheet: XLSX.WorkSheet,
  anchor: string,
  columns: Record<string, string[]>,
): { headerRow: number; col: Record<string, number>; rows: { n: number; cells: Row }[] } | null {
  const all = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, defval: "", raw: true, blankrows: true });
  const headerIdx = all.slice(0, 15).findIndex((r) => r.some((c) => norm(c) === anchor));
  if (headerIdx < 0) return null;
  const header = all[headerIdx].map(norm);
  const col: Record<string, number> = {};
  for (const [field, names] of Object.entries(columns)) {
    let idx = header.findIndex((h) => names.includes(h));
    if (idx < 0) idx = header.findIndex((h) => h !== "" && names.some((n) => h.startsWith(n)));
    if (idx >= 0) col[field] = idx;
  }
  const rows = all
    .slice(headerIdx + 1)
    .map((cells, i) => ({ n: headerIdx + i + 2, cells }))
    .filter((r) => r.cells.some((c) => text(c) !== ""));
  return { headerRow: headerIdx + 1, col, rows };
}

const APP_COLUMNS: Record<string, string[]> = {
  id: ["applicationid"],
  name: ["applicantname", "name"],
  city: ["city"],
  state: ["state"],
  pin: ["pincode", "pin"],
  investment: ["investmentcapacity", "investment"],
  experience: ["retailexperience", "experience"],
  business: ["currentpastbusiness", "business"],
  spaceAvailable: ["spaceavailable"],
  spaceSize: ["spacesize"],
  floor: ["floor"],
  targetLaunch: ["targetlaunch"],
  language: ["preferredlanguage", "language"],
  notes: ["notesfromapplicant", "notes"],
};
export const REQUIRED_APP_COLUMNS = ["id", "name", "city", "state", "pin", "investment", "experience", "spaceAvailable"];
const COLUMN_LABEL: Record<string, string> = {
  id: "Application ID", name: "Applicant name", city: "City", state: "State", pin: "Pin code",
  investment: "Investment capacity (₹ lakh)", experience: "Retail experience (years)",
  business: "Current / past business", spaceAvailable: "Space available", spaceSize: "Space size (sq ft)",
  floor: "Floor", targetLaunch: "Target launch (months)", language: "Preferred language", notes: "Notes from applicant",
};
export const columnLabel = (field: string) => COLUMN_LABEL[field] ?? field;

/** Matches a free-text value to one of the allowed options, ignoring case and spacing. */
function canonical(value: string, options: readonly string[]): string {
  const hit = options.find((o) => norm(o) === norm(value));
  return hit ?? value;
}

type Table = NonNullable<ReturnType<typeof readTable>>;

function skipTemplateExample(sheet: XLSX.WorkSheet, table: Table, problems: Problem[], sheetName: string): Table["rows"] {
  const note = text(sheet["A1"]?.v).toLowerCase();
  const first = table.rows[0];
  if (!note.includes("is an example") || !first || first.n !== table.headerRow + 1 || table.rows.length < 2) return table.rows;
  problems.push({ sheet: sheetName, row: first.n, message: "Skipped the template's example row (the sheet says real data starts on the next row)." });
  return table.rows.slice(1);
}

export function parseWorkbook(data: ArrayBuffer, fileName: string): Dataset {
  const problems: Problem[] = [];
  const empty = (fatal: string, sheetsFound: string[] = []): Dataset => ({
    applications: [], territories: [], stores: [], allowedCities: CASE_ALLOWED_CITIES, languages: CASE_LANGUAGES,
    report: { fileName, sheetsFound, rowsRead: { applications: 0, territories: 0, stores: 0 }, problems, fatal },
  });

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(data, { type: "array" });
  } catch {
    return empty("This file could not be opened as an Excel workbook. Please upload a .xlsx file in the template format.");
  }

  // Applications
  const appSheet = findSheet(wb, "application");
  if (!appSheet) return empty("No 'Applications' sheet was found. The file must follow the template format.", wb.SheetNames);
  const appTable = readTable(appSheet, "applicationid", APP_COLUMNS);
  if (!appTable) return empty("The 'Applications' sheet has no 'Application ID' header row.", wb.SheetNames);
  const missingCols = REQUIRED_APP_COLUMNS.filter((c) => appTable.col[c] === undefined);
  for (const c of missingCols) problems.push({ sheet: "Applications", row: appTable.headerRow, message: `Required column '${columnLabel(c)}' is missing.` });

  const applications: Application[] = [];
  const seen = new Set<string>();
  // The template's first data row is a grey example ("Row 3 is an example ... enter data from row 4").
  // Skip it when the sheet still carries that note and there is real data below it.
  const appRows = skipTemplateExample(appSheet, appTable, problems, "Applications");
  for (const { n, cells } of appRows) {
    const get = (f: string) => (appTable.col[f] === undefined ? "" : cells[appTable.col[f]]);
    const badNumbers: Record<string, string> = {};
    const num = (f: string) => {
      const r = toNumber(get(f));
      if (r.bad) badNumbers[f] = text(get(f));
      return r.value;
    };
    let id = text(get("id"));
    let idMissing = false;
    if (!id) {
      id = `ROW-${n}`;
      idMissing = true;
    }
    if (seen.has(id.toUpperCase())) {
      problems.push({ sheet: "Applications", row: n, id, message: `Duplicate Application ID '${id}': this row was skipped; the first row with this ID is used.` });
      continue;
    }
    seen.add(id.toUpperCase());
    const app: Application = {
      rowNumber: n, id, idMissing, name: text(get("name")), city: text(get("city")), state: text(get("state")),
      pin: toPin(get("pin")), investment: num("investment"), experience: num("experience"),
      business: text(get("business")), spaceAvailable: canonical(text(get("spaceAvailable")), ["Owned", "Rented", "Not yet identified"]),
      spaceSize: num("spaceSize"), floor: canonical(text(get("floor")), ["Ground", "Upper", "Mall unit", "Not known"]),
      targetLaunch: num("targetLaunch"), language: text(get("language")), notes: text(get("notes")), badNumbers,
    };
    if (app.investment !== null && app.investment > 10000) {
      app.badNumbers.investment = `${app.investment} (looks like rupees; the column is in ₹ lakh)`;
      app.investment = null;
    }
    if (idMissing) problems.push({ sheet: "Applications", row: n, id, message: "Application ID is blank; shown as " + id + "." });
    for (const [f, raw] of Object.entries(badNumbers)) problems.push({ sheet: "Applications", row: n, id, message: `'${columnLabel(f)}' should be a number but is '${raw}'.` });
    applications.push(app);
  }

  // Territories
  const territories: Territory[] = [];
  const terSheet = findSheet(wb, "territor");
  const terTable = terSheet
    ? readTable(terSheet, "territoryid", {
        id: ["territoryid"], city: ["city"], state: ["state"], pins: ["pincodescovered", "pincodes"],
        tier: ["citytier", "tier"], openSlots: ["openslots"], priority: ["priority"],
      })
    : null;
  if (!terTable) problems.push({ sheet: "Territories", row: null, message: "No usable 'Territories' sheet: nobody can be matched to a territory." });
  else {
    const seenT = new Set<string>();
    for (const { n, cells } of skipTemplateExample(terSheet!, terTable, problems, "Territories")) {
      const get = (f: string) => (terTable.col[f] === undefined ? "" : cells[terTable.col[f]]);
      const id = text(get("id")) || `TER-ROW-${n}`;
      if (seenT.has(id.toUpperCase())) {
        problems.push({ sheet: "Territories", row: n, id, message: `Duplicate Territory ID '${id}': row skipped.` });
        continue;
      }
      seenT.add(id.toUpperCase());
      const slots = toNumber(get("openSlots"));
      if (slots.value === null) problems.push({ sheet: "Territories", row: n, id, message: "'Open slots' is blank or not a number: treated as 0." });
      const pins = String(get("pins") ?? "").split(/[,;\s]+/).map(toPin).filter(Boolean);
      if (pins.length === 0) problems.push({ sheet: "Territories", row: n, id, message: "No pin codes listed." });
      territories.push({
        rowNumber: n, id, city: text(get("city")), state: text(get("state")), pins, tier: text(get("tier")),
        openSlots: slots.value, priority: text(get("priority")),
      });
    }
  }

  // Existing stores (fixed list in the case)
  let stores: Store[] = [];
  const storeSheet = findSheet(wb, "existingstore") ?? findSheet(wb, "store");
  const storeTable = storeSheet
    ? readTable(storeSheet, "storeid", { id: ["storeid"], city: ["city"], pin: ["pincode", "pin"], opened: ["opened"] })
    : null;
  if (!storeTable) {
    stores = CASE_EXISTING_STORES;
    problems.push({ sheet: "Existing stores", row: null, message: "Sheet not found: using the fixed list of 10 stores from the case file." });
  } else {
    stores = storeTable.rows.map(({ cells }) => {
      const get = (f: string) => (storeTable.col[f] === undefined ? "" : cells[storeTable.col[f]]);
      return { id: text(get("id")), city: text(get("city")), pin: toPin(get("pin")), opened: toNumber(get("opened")).value };
    });
  }

  // Allowed values
  let allowedCities = CASE_ALLOWED_CITIES;
  let languages = CASE_LANGUAGES;
  const allowedSheet = findSheet(wb, "allowed");
  const allowedTable = allowedSheet
    ? readTable(allowedSheet, "city", { city: ["city"], state: ["state"], prefix: ["pincodesstartwith", "pinprefix"], tier: ["citytier", "tier"] })
    : null;
  if (allowedTable) {
    const cities: AllowedCity[] = [];
    for (const { cells } of allowedTable.rows) {
      const get = (f: string) => (allowedTable.col[f] === undefined ? "" : cells[allowedTable.col[f]]);
      const first = norm(cells[0]);
      if (first === "preferredlanguage") {
        const langs = String(cells[1] ?? "").split(",").map(text).filter(Boolean);
        if (langs.length) languages = langs;
        continue;
      }
      const prefix = toPin(get("prefix"));
      if (text(get("city")) && /^\d+$/.test(prefix)) cities.push({ city: text(get("city")), state: text(get("state")), prefix, tier: text(get("tier")) });
    }
    if (cities.length) allowedCities = cities;
  } else {
    problems.push({ sheet: "Allowed values", row: null, message: "Sheet not found: using the 7 Karnataka cities from the case file." });
  }

  return {
    applications, territories, stores, allowedCities, languages,
    report: {
      fileName, sheetsFound: wb.SheetNames,
      rowsRead: { applications: applications.length, territories: territories.length, stores: stores.length },
      problems,
      fatal: applications.length === 0 ? "No applicant rows were found under the 'Application ID' header." : undefined,
    },
  };
}

// Reads the applications Excel file (template format). Headers are found by name, not position, and a bad
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

/** Accepts 25, "25", "25.5", "₹ 25", "1,200", "450 sq ft", "2.5 crore" (= 250 lakh). Anything else is null. */
export function toNumber(v: unknown): { value: number | null; bad: boolean } {
  if (v === null || v === undefined || v === "") return { value: null, bad: false };
  if (typeof v === "number") return Number.isFinite(v) ? { value: v, bad: false } : { value: null, bad: true };
  const raw = String(v).trim();
  if (raw === "") return { value: null, bad: false };
  const crore = /\b(crores?|cr)\b\.?/i.test(raw);
  const cleaned = raw
    .replace(/[₹,]/g, "")
    .replace(/\b(crores?|cr)\b\.?/gi, "")
    .replace(/(rs\.?|inr|lakhs?|lacs?|l\b|sq\.?\s*ft\.?|sqft|square\s*feet|years?|yrs?\.?|months?|mths?)/gi, "")
    .trim();
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) return { value: crore ? Math.round(Number(cleaned) * 100 * 100) / 100 : Number(cleaned), bad: false };
  return { value: null, bad: true };
}

/** Pin list from a territory cell: "570001, 570002" or a range "570001-570008" (up to 100 pins). */
export function toPins(v: unknown): { pins: string[]; ranges: string[] } {
  const ranges: string[] = [];
  const expanded = String(v ?? "").replace(/(\d{6})\s*(?:-|–|—|to)\s*(\d{6})/gi, (m, a: string, b: string) => {
    const lo = Number(a), hi = Number(b);
    if (hi <= lo || hi - lo > 100) return m;
    ranges.push(`${a}-${b}`);
    return Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i)).join(",");
  });
  return { pins: expanded.split(/[,;\s]+/).map(toPin).filter(Boolean), ranges };
}

/** Common other spellings of the allowed cities. Only used when the alias's city is in the allowed list. */
const CITY_ALIASES: Record<string, string> = {
  bangalore: "Bengaluru", bengaluru: "Bengaluru", blr: "Bengaluru",
  mysore: "Mysuru", mangalore: "Mangaluru", mangaluru: "Mangaluru",
  hubli: "Hubballi-Dharwad", hubballi: "Hubballi-Dharwad", dharwad: "Hubballi-Dharwad", hublidharwad: "Hubballi-Dharwad",
  belgaum: "Belagavi", belgavi: "Belagavi", tumkur: "Tumakuru", davangere: "Davanagere",
};

/** Free-text spellings of Space available and Floor. */
const SPACE_ALIASES: [RegExp, string][] = [
  [/^(own|owned|self ?owned|ownership|own property|owned property|freehold)$/i, "Owned"],
  [/^(rent|rented|rental|on rent|lease|leased|leasehold)$/i, "Rented"],
  [/^(not yet|not identified|not yet identified|none|no|nil|na|n\/a|tbd|searching|looking|yet to identify)$/i, "Not yet identified"],
];
const FLOOR_ALIASES: [RegExp, string][] = [
  [/^(ground|gf|g|ground floor|street level)$/i, "Ground"],
  [/^(upper|first|second|third|1st|2nd|3rd|1st floor|2nd floor|first floor|second floor|upper floor|floor [1-9])$/i, "Upper"],
  [/^(mall|mall unit|in a mall|mall shop)$/i, "Mall unit"],
  [/^(not known|unknown|na|n\/a|dont know|don't know)$/i, "Not known"],
];
function alias(value: string, list: [RegExp, string][]): string {
  return list.find(([re]) => re.test(value.trim()))?.[1] ?? value;
}

export function toPin(v: unknown): string {
  if (typeof v === "number") return String(Math.trunc(v));
  return String(v ?? "").replace(/\s+/g, "").replace(/\.0+$/, "");
}

/** A sheet by name; failing that, the first sheet whose top rows carry one of the header `anchors`. */
function findSheet(wb: XLSX.WorkBook, key: string, anchors?: string[]): XLSX.WorkSheet | null {
  const name = wb.SheetNames.find((n) => norm(n).includes(key));
  if (name) return wb.Sheets[name];
  if (!anchors) return null;
  const byHeader = wb.SheetNames.find((n) => headerIndex(XLSX.utils.sheet_to_json<Row>(wb.Sheets[n], { header: 1, defval: "", blankrows: true }), anchors) >= 0);
  return byHeader ? wb.Sheets[byHeader] : null;
}

const headerIndex = (all: Row[], anchors: string[]) => all.slice(0, 50).findIndex((r) => r.some((c) => anchors.includes(norm(c))));

/** Finds the header row (the first row in the top 50 that contains one of `anchors`) and maps columns. */
function readTable(
  sheet: XLSX.WorkSheet,
  anchors: string[],
  columns: Record<string, string[]>,
): { headerRow: number; col: Record<string, number>; rows: { n: number; cells: Row }[] } | null {
  const all = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, defval: "", raw: true, blankrows: true });
  const headerIdx = headerIndex(all, anchors);
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

// Header names, normalised (lower case, letters and digits only). The template's name comes first;
// the rest are common renames, so a lightly edited sheet still reads.
const APP_ID_HEADERS = ["applicationid", "appid", "applicationno", "applicationnumber", "applicantid", "applicationref", "refno", "id"];
const APP_COLUMNS: Record<string, string[]> = {
  id: APP_ID_HEADERS,
  name: ["applicantname", "name", "fullname", "applicant", "candidatename"],
  city: ["city", "town"],
  state: ["state"],
  pin: ["pincode", "pin", "postalcode", "zipcode", "zip", "postcode"],
  investment: ["investmentcapacity", "investment", "budget", "capital", "investable"],
  experience: ["retailexperience", "experience", "yearsofexperience", "yearsexperience", "retailyears"],
  business: ["currentpastbusiness", "business", "currentbusiness", "pastbusiness", "occupation", "profession"],
  spaceAvailable: ["spaceavailable", "spacestatus", "premises", "property", "shopspace", "ownedrented", "spacetype", "tenure"],
  spaceSize: ["spacesize", "size", "carpetarea", "area", "shopsize"],
  floor: ["floor", "floorlevel"],
  targetLaunch: ["targetlaunch", "launch", "launchtimeline", "launchin"],
  language: ["preferredlanguage", "language"],
  notes: ["notesfromapplicant", "notes", "remarks", "comments"],
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

/** The template's own grey example rows, as they appear in the file. */
const TEMPLATE_EXAMPLES: Record<string, { field: string; value: string }[]> = {
  Applications: [{ field: "id", value: "app001" }, { field: "name", value: "ravikumar" }, { field: "pin", value: "570001" }],
  Territories: [{ field: "id", value: "ter01" }, { field: "city", value: "mysuru" }, { field: "pins", value: "570001570002570008" }],
};

function skipTemplateExample(sheet: XLSX.WorkSheet, table: Table, problems: Problem[], sheetName: string): Table["rows"] {
  const note = text(sheet["A1"]?.v).toLowerCase();
  const first = table.rows[0];
  if (!note.includes("is an example") || !first || first.n !== table.headerRow + 1 || table.rows.length < 2) return table.rows;
  // Only the template's own example is skipped. A real applicant typed into that row is kept.
  const isExample = (TEMPLATE_EXAMPLES[sheetName] ?? []).every(({ field, value }) => table.col[field] !== undefined && norm(first.cells[table.col[field]]) === value);
  if (!isExample) {
    problems.push({ sheet: sheetName, row: first.n, message: "The sheet says this row is an example, but it holds different data, so it was read as a real row." });
    return table.rows;
  }
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
  const appSheet = findSheet(wb, "application", APP_ID_HEADERS);
  if (!appSheet) return empty("No 'Applications' sheet was found. The file must follow the template format.", wb.SheetNames);
  const appTable = readTable(appSheet, APP_ID_HEADERS, APP_COLUMNS);
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
    // Other spellings are read as the listed value, and the report says so.
    const readAs = (label: string, raw: string, value: string) => {
      if (raw && value !== raw && norm(value) !== norm(raw)) problems.push({ sheet: "Applications", row: n, id, message: `${label} '${raw}' read as '${value}'.` });
      return value;
    };
    const rawCity = text(get("city"));
    const aliasCity = CITY_ALIASES[norm(rawCity)];
    const rawSpace = text(get("spaceAvailable"));
    const rawFloor = text(get("floor"));
    const app: Application = {
      rowNumber: n, id, idMissing, name: text(get("name")),
      city: aliasCity ? readAs("City", rawCity, aliasCity) : rawCity,
      state: text(get("state")),
      pin: toPin(get("pin")), investment: num("investment"), experience: num("experience"),
      business: text(get("business")),
      spaceAvailable: readAs("Space available", rawSpace, alias(canonical(rawSpace, ["Owned", "Rented", "Not yet identified"]), SPACE_ALIASES)),
      spaceSize: num("spaceSize"),
      floor: readAs("Floor", rawFloor, alias(canonical(rawFloor, ["Ground", "Upper", "Mall unit", "Not known"]), FLOOR_ALIASES)),
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
  const terSheet = findSheet(wb, "territor", ["territoryid"]);
  const terTable = terSheet
    ? readTable(terSheet, ["territoryid"], {
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
      const { pins, ranges } = toPins(get("pins"));
      if (ranges.length) problems.push({ sheet: "Territories", row: n, id, message: `Pin range ${ranges.join(", ")} read as every pin in between (${pins.length} pins).` });
      if (pins.length === 0) problems.push({ sheet: "Territories", row: n, id, message: "No pin codes listed." });
      territories.push({
        rowNumber: n, id, city: text(get("city")), state: text(get("state")), pins, tier: text(get("tier")),
        openSlots: slots.value, priority: text(get("priority")),
      });
    }
  }

  const pinOwner = new Map<string, string>();
  for (const t of territories) for (const pin of t.pins) {
    const first = pinOwner.get(pin);
    if (first && first !== t.id) problems.push({ sheet: "Territories", row: t.rowNumber, id: t.id, message: `Pin ${pin} is also listed in ${first}; it counts once, for ${first} (first in the file).` });
    else pinOwner.set(pin, t.id);
  }

  // Existing stores (fixed list in the case)
  let stores: Store[] = [];
  const storeSheet = findSheet(wb, "existingstore") ?? findSheet(wb, "store");
  const storeTable = storeSheet
    ? readTable(storeSheet, ["storeid"], { id: ["storeid"], city: ["city"], pin: ["pincode", "pin"], opened: ["opened"] })
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
    ? readTable(allowedSheet, ["city"], { city: ["city"], state: ["state"], prefix: ["pincodesstartwith", "pinprefix"], tier: ["citytier", "tier"] })
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

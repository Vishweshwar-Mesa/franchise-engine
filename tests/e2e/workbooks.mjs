// Builds the three test workbooks from data/template.xlsx: same sheets, same headers, the
// Existing stores sheet copied untouched (ST-01..ST-10). Following the template's own note,
// row 3 keeps the template's grey example and test data starts on row 4.
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const TEMPLATE = path.resolve("data/template.xlsx");

// prettier-ignore
const APP = (id, name, city, pin, inv, exp, business, space, size, floor, launch, lang, notes = "") => [id, name, city, "Karnataka", pin, inv, exp, business, space, size, floor, launch, lang, notes];
const TER = (id, city, pins, tier, slots, priority) => [id, city, "Karnataka", pins, tier, slots, priority];

export const CASES = {
  case1: {
    title: "Clean approvals + onboarding",
    territories: [TER("TER-01", "Mysuru", "570001, 570002, 570008", "Tier 2", 3, "High")],
    applications: [
      APP("APP-101", "Test Applicant One", "Mysuru", 570001, 40, 6, "Runs a garment shop", "Owned", 800, "Ground", 6, "Kannada"),
      APP("APP-102", "Test Applicant Two", "Mysuru", 570002, 30, 3, "Runs mobile accessories shop", "Rented", 500, "Mall unit", 5, "Kannada"),
    ],
  },
  case2: {
    title: "Capacity, waitlist, Hindi, rescaling",
    territories: [TER("TER-02", "Hubballi-Dharwad", "580001, 580002, 580003", "Tier 2", 1, "Medium")],
    applications: [
      APP("APP-201", "Test Applicant Three", "Hubballi-Dharwad", 580001, 45, 8, "Runs a clothing store", "Owned", 900, "Ground", 6, "Hindi"),
      APP("APP-202", "Test Applicant Four", "Hubballi-Dharwad", 580002, 25, 2, "Sells groceries", "Rented", 450, "Upper", 8, "English"),
    ],
  },
  case3: {
    title: "Rejections, holds, mismatches, contested pin",
    territories: [TER("TER-03", "Belagavi", "590001, 590002, 590003", "Tier 2", 2, "High")],
    applications: [
      APP("APP-301", "Test Applicant Five", "Belagavi", 590001, 50, 9, "Runs a ladies' garment store", "Owned", 900, "Ground", 4, "Kannada"),
      APP("APP-302", "Test Applicant Six", "Belagavi", 590002, 35, 6, "Runs a menswear store", "Rented", 650, "Ground", 4, "Kannada"),
      APP("APP-303", "Test Applicant Seven", "Belagavi", 590002, 30, 5, "Runs a saree shop", "Owned", 700, "Ground", 5, "Hindi"),
      APP("APP-304", "Test Applicant Eight", "Belagavi", 560001, 30, 5, "Runs a footwear store", "Rented", 600, "Ground", 4, "English"),
      APP("APP-305", "Test Applicant Nine", "Tumakuru", 572999, 25, 4, "Runs a general store", "Rented", 500, "Ground", 6, "Kannada"),
      APP("APP-306", "Test Applicant Ten", "Belagavi", 590003, 28, 4, "Runs a tailoring shop", "Not yet identified", "", "Not known", 6, "Kannada"),
      APP("APP-307", "Test Applicant Eleven", "Belagavi", 590003, "", 5, "Runs a boutique", "Rented", 550, "Ground", 5, "English"),
      APP("APP-308", "Test Applicant Twelve", "Belagavi", 590003, 26, 3, "Runs a stationery shop", "Not yet identified", 600, "Not known", 6, "Hindi"),
      APP("APP-301", "Duplicate Entry", "Belagavi", 590001, 50, 9, "Runs a ladies' garment store", "Owned", 900, "Ground", 4, "Kannada"),
      APP("APP-309", "Test Applicant Dirty", "Belagavi", "590 002", 22, "five years", "Runs a cosmetics shop", "Rented", 450, "Ground", 5, "English"),
    ],
  },
};

/** Writes tests/e2e/out/<case>.xlsx and returns the path. */
export function buildWorkbook(key, outDir) {
  const tpl = XLSX.read(fs.readFileSync(TEMPLATE), { type: "buffer" });
  const c = CASES[key];
  const wb = XLSX.utils.book_new();
  for (const name of tpl.SheetNames) {
    const sheet = tpl.Sheets[name];
    if (name === "Applications" || name === "Territories") {
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      // rows[0] = note, rows[1] = header, rows[2] = grey example; test data from row 4.
      const data = name === "Applications" ? c.applications : c.territories;
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([rows[0], rows[1], rows[2], ...data]), name);
    } else {
      XLSX.utils.book_append_sheet(wb, sheet, name); // Existing stores, Allowed values, Field guide, Glossary: untouched
    }
  }
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${key}.xlsx`);
  fs.writeFileSync(file, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  return file;
}

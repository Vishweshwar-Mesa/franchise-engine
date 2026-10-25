// Generates public/samples/demo-messy.xlsx: SYNTHETIC test data in the judges' template
// format, with deliberate traps. Names, territories and applicants are made up.
// Existing stores and Allowed values are copied unchanged from data/template.xlsx.
// Run: npx tsx scripts/make-demo-file.ts
import * as XLSX from "xlsx";
import * as fs from "fs";

const tpl = XLSX.read(fs.readFileSync("data/template.xlsx"), { type: "buffer" });

const appHeader = ["Application ID", "Applicant name", "City", "State", "Pin code", "Investment capacity (₹ lakh)", "Retail experience (years)", "Current / past business", "Space available", "Space size (sq ft)", "Floor", "Target launch (months)", "Preferred language", "Notes from applicant"];
// prettier-ignore
const apps: (string | number)[][] = [
  ["APP-001", "Ravi Kumar", "Mysuru", "Karnataka", 570001, 25, 4, "Runs a footwear store", "Rented", 450, "Ground", 3, "Kannada", "Wants to open before Diwali"],
  ["APP-002", "Lakshmi Narayan", "Mysuru", "Karnataka", 570001, 30, 6, "Runs a saree showroom", "Owned", 650, "Ground", 4, "Kannada", "Family-owned building on main road"], // contested pin with APP-001
  ["APP-003", "Arjun Shetty", "Bengaluru", "Karnataka", 560034, 40, 8, "Manages a kidswear store", "Rented", 750, "Ground", 2, "English", ""], // existing store ST-02
  ["APP-004", "Meena Rao", "Bengaluru", "Karnataka", 560011, 22, 3, "Runs a mobile accessories shop", "Owned", 350, "Upper", 3, "English", ""], // small space
  ["APP-005", "Farhan Ali", "Bengaluru", "Karnataka", 560025, 35, 5, "Runs a ladies' garment boutique", "Rented", 800, "Mall unit", 4, "Hindi", "Mall unit in a busy mall"],
  ["APP-006", "Kavya Gowda", "Bengaluru", "Karnataka", 560041, 18, 2, "Works in a bank", "Rented", 600, "Ground", 6, "Kannada", ""],
  ["APP-007", "Suresh Pai", "Mysuru", "Karnataka", 575002, 20, 5, "Runs a stationery shop", "Rented", 500, "Ground", 3, "Kannada", ""], // pin/city mismatch
  ["APP-008", "Divya Hegde", "Tumakuru", "Karnataka", 572199, 15, 1, "Homemaker, sells clothes online", "Rented", 420, "Ground", 5, "Kannada", ""], // no territory covers pin
  ["APP-009", "Mahesh Patil", "Davanagere", "Karnataka", 577004, 28, 7, "Runs a textile wholesale shop", "Not yet identified", "", "Not known", 6, "Kannada", "Looking for a space"], // no space
  ["APP-010", "Rekha Naik", "Davanagere", "Karnataka", 577004, 24, 4, "Runs a cosmetics store", "Not yet identified", 500, "Ground", 4, "Hindi", ""], // contradiction: no space but size given
  ["APP-011", "Imran Khan", "Hubballi-Dharwad", "Karnataka", 580021, 26, 6, "Runs a menswear store", "Rented", 600, "Ground", 3, "Hindi", "I don't have a shop yet, still searching"], // notes contradict fields
  ["APP-005", "Farhan Ali", "Bengaluru", "Karnataka", 560025, 35, 5, "Runs a ladies' garment boutique", "Rented", 800, "Mall unit", 4, "Hindi", "Duplicate submission"], // duplicate ID
  ["APP-013", "Pooja Kulkarni", "Belagavi", "Karnataka", 590006, "twenty lakh", 3, "Runs a gift shop", "Rented", 500, "Ground", 4, "Kannada", ""], // text in number column
  ["APP-014", "", "Mangaluru", "Karnataka", 575003, 21, 2, "Runs a bakery", "Rented", 450, "Ground", 4, "English", ""], // missing name
  ["APP-015", "Naveen Reddy", "Mysuru", "Karnataka", 57000, 23, 3, "Runs a shoe store", "Rented", 500, "Ground", 3, "Kannada", ""], // 5-digit pin
  ["APP-016", "Sneha Iyer", "Bengaluru", "Karnataka", " 560078 ", 32, 9, "Runs a women's ethnic wear store", "Owned", 720, "Ground", 3, "English", ""], // pin as text with spaces
  ["APP-017", "Basavaraj Angadi", "Belagavi", "Karnataka", 590006, 27, 5, "Runs a menswear store", "Rented", 550, "Ground", 3, "Kannada", ""],
  ["APP-018", "Shabana Mulla", "Belagavi", "Karnataka", 590006, 33, 6, "Runs a ladies' tailoring and boutique", "Owned", 700, "Ground", 4, "Hindi", ""], // contested with APP-017 (APP-013 is on hold)
  ["APP-019", "Prakash Bhat", "Mangaluru", "Karnataka", 575002, 29, 4, "Runs a sports goods shop", "Rented", 650, "Mall unit", 3, "English", ""],
  ["APP-020", "Anitha D'Souza", "Mangaluru", "Karnataka", 575003, 19, 2, "Runs a beauty parlour", "Rented", 480, "Upper", 5, "English", ""],
  ["APP-021", "Girish Hiremath", "Hubballi-Dharwad", "Karnataka", 580029, 22, 3, "Runs a hosiery shop", "Owned", 400, "Ground", 4, "Kannada", ""],
  ["APP-022", "Usha Murthy", "Tumakuru", "Karnataka", 572101, 17, 1, "Teacher", "Rented", 380, "Ground", 6, "Kannada", ""],
  ["APP-023", "Vinay Desai", "Davanagere", "Karnataka", 577001, 21, 4, "Runs a kidswear shop", "Rented", 520, "Ground", 4, "Kannada", ""],
  ["APP-024", "Asha Joshi", "Davanagere", "Karnataka", 577002, 16, 0, "No business yet", "Owned", 600, "Upper", 5, "Hindi", ""],
  ["APP-025", "Rahul Menon", "Bengaluru", "Karnataka", 560095, 55, 12, "Franchisee of a footwear brand", "Owned", 1200, "Ground", 2, "English", ""],
  ["APP-026", "Nandini Prasad", "Bengaluru", "Karnataka", 560102, 26, 5, "Runs a lingerie store", "Rented", 640, "Mall unit", 3, "Kannada", ""],
  ["APP-027", "Joseph Thomas", "Mysuru", "Kerala", 570008, 24, 4, "Runs a readymade garments shop", "Rented", 560, "Ground", 4, "English", ""], // state contradicts city
  ["APP-028", "Sowmya Rao", "Mysuru", "Karnataka", 570002, 20, "", "Runs a handloom store", "Rented", 500, "Ground", 4, "Kannada", ""], // missing experience
  ["APP-029", "Manjunath Kori", "Hubballi-Dharwad", "Karnataka", 580020, 30, 7, "Runs a garment shop", "Owned", 900, "Ground", 3, "Kannada", ""], // existing store ST-09
  ["", "", "", "", "", "", "", "", "", "", "", "", "", ""], // blank row
  ["APP-030", "Priya Sharma", "Mysuru", "Karnataka", 570002, 31, 6, "Runs a leggings and innerwear shop", "Owned", 700, "Mall unit", 3, "Hindi", ""],
  ["APP-031", "Karthik Subramanian", "Tumakuru", "Karnataka", 572102, 20, 3, "Runs a supermarket", "Rented", 450, "Ground", 4, "Tamil", ""], // language not in list
];

const territoryHeader = ["Territory ID", "City", "State", "Pin codes covered", "City tier", "Open slots", "Priority"];
// prettier-ignore
const territories: (string | number)[][] = [
  ["TER-01", "Mysuru", "Karnataka", "570001, 570002, 570008, 570009", "Tier 2", 3, "High"],
  ["TER-02", "Bengaluru", "Karnataka", "560001, 560011, 560025, 560034, 560041", "Tier 1", 2, "High"],
  ["TER-03", "Bengaluru", "Karnataka", "560066, 560078, 560095, 560102", "Tier 1", 1, "Medium"],
  ["TER-04", "Mangaluru", "Karnataka", "575001, 575002, 575003", "Tier 2", 1, "Medium"],
  ["TER-05", "Hubballi-Dharwad", "Karnataka", "580020, 580021, 580029", "Tier 2", 2, "Low"],
  ["TER-06", "Belagavi", "Karnataka", "590001, 590006", "Tier 2", 2, "Medium"],
  ["TER-07", "Tumakuru", "Karnataka", "572101, 572102", "Tier 3", 1, "Low"],
  ["TER-08", "Davanagere", "Karnataka", "577001, 577002, 577004", "Tier 3", 3, "Medium"],
];

const wb = XLSX.utils.book_new();
const titled = (title: string, header: string[], rows: (string | number)[][]) =>
  XLSX.utils.aoa_to_sheet([[title], header, ...rows]);
XLSX.utils.book_append_sheet(wb, titled("SYNTHETIC demo data with deliberate traps. Not real applicants.", appHeader, apps), "Applications");
XLSX.utils.book_append_sheet(wb, titled("SYNTHETIC demo territories.", territoryHeader, territories), "Territories");
for (const name of ["Existing stores", "Allowed values", "Field guide", "Glossary"]) {
  if (tpl.Sheets[name]) XLSX.utils.book_append_sheet(wb, tpl.Sheets[name], name);
}
// A smaller, clean showcase file for the pre-filled demo workspace (src/lib/demo-workspace.ts).
// prettier-ignore
const showcaseApps: (string | number)[][] = [
  ["APP-101", "Priya Sharma", "Mysuru", "Karnataka", 570002, 31, 6, "Runs a leggings and innerwear shop", "Owned", 720, "Mall unit", 3, "Hindi", ""],
  ["APP-102", "Rahul Menon", "Bengaluru", "Karnataka", 560095, 55, 12, "Franchisee of a footwear brand", "Owned", 1200, "Ground", 2, "English", ""],
  ["APP-103", "Farhan Ali", "Bengaluru", "Karnataka", 560025, 35, 5, "Runs a ladies' garment boutique", "Rented", 800, "Mall unit", 4, "Hindi", "Mall unit in a busy mall"],
  ["APP-104", "Basavaraj Angadi", "Belagavi", "Karnataka", 590006, 27, 5, "Runs a menswear store", "Rented", 550, "Ground", 3, "Kannada", ""],
  ["APP-105", "Shabana Mulla", "Belagavi", "Karnataka", 590006, 33, 6, "Runs a ladies' tailoring and boutique", "Owned", 700, "Ground", 4, "Hindi", ""],
  ["APP-106", "Meena Rao", "Bengaluru", "Karnataka", 560011, 22, 3, "Runs a mobile accessories shop", "Owned", 350, "Upper", 3, "Kannada", ""],
  ["APP-107", "Anitha D'Souza", "Mangaluru", "Karnataka", 575003, 19, 2, "Runs a beauty parlour", "Rented", 480, "Upper", 5, "English", ""],
  ["APP-108", "Prakash Bhat", "Mangaluru", "Karnataka", 575002, 29, 4, "Runs a sports goods shop", "Rented", 650, "Mall unit", 3, "English", ""],
  ["APP-109", "Mahesh Patil", "Davanagere", "Karnataka", 577004, 28, 7, "Runs a textile wholesale shop", "Not yet identified", "", "Not known", 6, "Kannada", "Looking for a space near the bus stand"],
  ["APP-110", "Arjun Shetty", "Bengaluru", "Karnataka", 560034, 40, 8, "Manages a kidswear store", "Rented", 750, "Ground", 2, "English", ""],
];
// prettier-ignore
const showcaseTerritories: (string | number)[][] = [
  ["TER-01", "Mysuru", "Karnataka", "570001, 570002, 570008, 570009", "Tier 2", 2, "High"],
  ["TER-02", "Bengaluru", "Karnataka", "560011, 560025, 560034", "Tier 1", 1, "High"],
  ["TER-03", "Bengaluru", "Karnataka", "560095, 560102", "Tier 1", 1, "Medium"],
  ["TER-04", "Mangaluru", "Karnataka", "575002, 575003", "Tier 2", 1, "Medium"],
  ["TER-06", "Belagavi", "Karnataka", "590001, 590006", "Tier 2", 1, "Medium"],
  ["TER-08", "Davanagere", "Karnataka", "577001, 577004", "Tier 3", 2, "Low"],
];
const showcase = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(showcase, titled("SYNTHETIC demo applicants for the pre-filled demo workspace. Not real people.", appHeader, showcaseApps), "Applications");
XLSX.utils.book_append_sheet(showcase, titled("SYNTHETIC demo territories.", territoryHeader, showcaseTerritories), "Territories");
for (const name of ["Existing stores", "Allowed values", "Field guide", "Glossary"]) {
  if (tpl.Sheets[name]) XLSX.utils.book_append_sheet(showcase, tpl.Sheets[name], name);
}

fs.mkdirSync("public/samples", { recursive: true });
XLSX.writeFile(showcase, "public/samples/demo-showcase.xlsx");
XLSX.writeFile(wb, "public/samples/demo-messy.xlsx");
fs.copyFileSync("data/template.xlsx", "public/samples/template.xlsx");
console.log(`Wrote public/samples/demo-messy.xlsx (${apps.length} rows incl. 1 blank, 1 duplicate) and copied the template.`);

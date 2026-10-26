// End-to-end test run against the live site (or BASE_URL). Report only: nothing is fixed here.
// Run: npm run test:e2e   (BASE_URL=http://localhost:3000 npm run test:e2e for a local server)
// Three cases run in parallel, each in its own fresh browser context (own session, no shared data),
// each capped at 90 s. Writes deliverables/TEST_REPORT.md and screenshots to deliverables/test-screens/.
import { chromium } from "playwright";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { buildWorkbook } from "./workbooks.mjs";

const BASE = (process.env.BASE_URL || "https://franchise-engine-psi.vercel.app").replace(/\/$/, "");
const CASE_LIMIT_MS = 90_000;
const SHOTS = path.resolve("deliverables/test-screens");
const OUT = path.resolve("tests/e2e/out");
const STORE_PINS = ["560001", "560034", "560038", "560066", "560076", "570009", "570017", "575001", "580020", "590001"];
const BLOCK_TEXT = /\b(log ?in to continue|sign in to|enter (your )?password|subscribe to|paywall|rate limit|too many requests|upgrade your plan)\b/i;
fs.mkdirSync(SHOTS, { recursive: true });

// ---------- helpers ----------
const csvParse = (text) => {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.replace(/^﻿/, ""), r[i] ?? ""])));
};

class Case {
  constructor(key, title) { this.key = key; this.title = title; this.steps = []; this.start = Date.now(); this.errors = []; }
  left() { return CASE_LIMIT_MS - (Date.now() - this.start); }
  async step(name, fn) {
    const t = Date.now();
    if (this.left() <= 0) { this.steps.push({ name, status: "SKIPPED-TIMEOUT", expected: "", actual: "case reached its 90 s limit", secs: 0 }); return; }
    let r, timer;
    try {
      r = await Promise.race([fn(), new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("SKIPPED-TIMEOUT")), Math.max(1, this.left())); })]);
    } catch (e) {
      const msg = String(e?.message || e).split("\n")[0].slice(0, 300);
      r = msg === "SKIPPED-TIMEOUT" ? { status: "SKIPPED-TIMEOUT", actual: "case reached its 90 s limit" } : { status: "FAIL", actual: msg };
    }
    clearTimeout(timer);
    r = { expected: "", actual: "", ...r };
    const rec = { name, ...r, secs: +((Date.now() - t) / 1000).toFixed(1) };
    if ((rec.status === "FAIL" || rec.status === "MISMATCH") && this.page) {
      const file = path.join(SHOTS, `${this.key}-${String(this.steps.length + 1).padStart(2, "0")}.png`);
      try { await this.page.screenshot({ path: file, timeout: 5000 }); rec.shot = path.relative(process.cwd(), file); } catch { /* page gone */ }
    }
    this.steps.push(rec);
  }
}
const ok = (expected, actual) => ({ status: "PASS", expected, actual });
const check = (cond, expected, actual) => ({ status: cond ? "PASS" : "MISMATCH", expected, actual });

async function newCase(browser, key, title, opts = {}) {
  const c = new Case(key, title);
  c.ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  if (opts.blockAi) await c.ctx.route("**/api/ai/**", (r) => r.fulfill({ json: { available: false, results: [], links: [] } }));
  c.page = await c.ctx.newPage();
  c.page.setDefaultTimeout(15000);
  c.page.on("pageerror", (e) => c.errors.push("pageerror: " + e.message));
  c.page.on("console", (m) => m.type() === "error" && c.errors.push("console: " + m.text()));
  c.page.on("dialog", (d) => d.accept());
  return c;
}

async function upload(c, file) {
  const p = c.page;
  await p.goto(BASE + "/upload");
  await p.locator('input[type=file]').first().waitFor({ state: "attached" });
  await p.locator('input[type=file]').first().setInputFiles(file);
  await p.getByText(new RegExp(`Validation report: ${path.basename(file)}`)).waitFor();
  return (await p.locator("main").innerText());
}
async function exportCsv(c) {
  const p = c.page;
  await p.goto(BASE + "/results");
  await p.getByRole("button", { name: "Export CSV" }).waitFor();
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Export CSV" }).click()]);
  return csvParse(fs.readFileSync(await dl.path(), "utf8"));
}
const byId = (rows) => Object.fromEntries(rows.map((r) => [r["Application ID"], r]));
async function openApplicant(c, id) {
  await c.page.goto(`${BASE}/applicant/${id}`);
  await c.page.getByRole("heading", { name: "Reason ledger" }).waitFor();
}
async function noBlockingText(c) {
  const t = await c.page.locator("body").innerText();
  return !BLOCK_TEXT.test(t);
}
async function askChat(c, q) {
  const p = c.page;
  await p.getByRole("button", { name: "Ask / What-if" }).click();
  const box = p.locator("[data-slot=sheet-content]");
  const before = await box.locator(".mr-4").count();
  await p.getByPlaceholder("Ask a question…").fill(q);
  await p.getByRole("button", { name: "Send" }).click();
  await p.waitForFunction((n) => document.querySelectorAll("[data-slot=sheet-content] .mr-4").length > n, before, { timeout: 40000 });
  const a = (await box.locator(".mr-4").last().innerText()).replace(/\n+/g, " | ");
  await p.keyboard.press("Escape");
  return a;
}
function hardRule(rows) {
  const pins = rows.filter((r) => r.Status === "Good to go").map((r) => r["Pin code"]);
  const dup = pins.filter((x, i) => pins.indexOf(x) !== i);
  const onStore = pins.filter((x) => STORE_PINS.includes(x));
  return check(dup.length === 0 && onStore.length === 0, "No pin given to two stores; none on an existing store's pin", `Good to go pins: ${pins.join(", ") || "none"}; duplicates: ${dup.join(",") || "none"}; on store pins: ${onStore.join(",") || "none"}`);
}

// ---------- CASE 1 ----------
async function case1(browser) {
  const c = await newCase(browser, "case1", "Clean approvals + onboarding (Kannada)");
  const p = c.page;
  const file = buildWorkbook("case1", OUT);
  let rows = [];
  await c.step("Load sample data + validation report", async () => {
    await p.goto(BASE + "/upload");
    await p.getByRole("button", { name: "Load sample data" }).click();
    await p.getByText(/Validation report: template/).waitFor();
    const t = await p.locator("main").innerText();
    return check(/Read 1 applicants/.test(t), "Sample loads and a validation report shows rows read", (t.match(/Read [^\n]*/) || ["no report"])[0]);
  });
  await c.step("Upload case file", async () => {
    const t = await upload(c, file);
    return check(/Read 2 applicants, 1 territories, 10 existing stores/.test(t), "2 applicants, 1 territory, 10 stores read", (t.match(/Read [^\n]*/) || ["?"])[0] + (/(example row)/.test(t) ? " (template example row skipped and reported)" : ""));
  });
  await c.step("APP-101 and APP-102 Good to go", async () => {
    rows = await exportCsv(c);
    const r = byId(rows);
    return check(r["APP-101"]?.Status === "Good to go" && r["APP-102"]?.Status === "Good to go", "Both Good to go", `APP-101: ${r["APP-101"]?.Status}; APP-102: ${r["APP-102"]?.Status}`);
  });
  await c.step("Reason ledger + next steps for both", async () => {
    const r = byId(rows);
    const okBoth = ["APP-101", "APP-102"].every((id) => r[id]?.Reason && r[id]?.["Next steps"]);
    return check(okBoth, "Each has a reason and next steps", `APP-101 reason: "${r["APP-101"]?.Reason}" | next: "${r["APP-101"]?.["Next steps"]?.slice(0, 90)}"`);
  });
  await c.step("Hard rule from export", async () => hardRule(rows));
  await c.step("Chat answers 'why' from the ledger", async () => {
    await p.goto(BASE + "/results");
    const a = await askChat(c, "Why is APP-102 Good to go?");
    return check(/APP-102/.test(a) && /Good to go|meets every check/i.test(a), "Answer cites APP-102's ledger status/reason", a.slice(0, 250));
  });
  let scoreBefore = "";
  await c.step("Financial profile + liabilities: flag shown, score/status unchanged", async () => {
    await openApplicant(c, "APP-101");
    // The AI relevance rating changes the score when it arrives; wait for it so only the liabilities entry differs.
    await p.getByText(/\((AI|Reviewer)\)/).first().waitFor({ timeout: 30000 });
    scoreBefore = byId(await exportCsv(c))["APP-101"]["Score /100"];
    await openApplicant(c, "APP-101");
    await p.getByLabel("Net worth (₹ lakh)").fill("120");
    await p.getByLabel("Portfolio (₹ lakh)").fill("40");
    await p.getByLabel("Liabilities / previous failures / issues").fill("Existing business loan, repayments on schedule");
    await p.getByRole("button", { name: "Save financial profile" }).click();
    await p.getByText(/Liabilities \/ previous issues noted by reviewer/).first().waitFor();
    const after = byId(await exportCsv(c))["APP-101"];
    return check(after.Status === "Good to go" && after["Score /100"] === scoreBefore && /Liabilities/.test(after.Flags),
      "Liabilities flag shown; score and status unchanged", `flag: ${/Liabilities/.test(after.Flags) ? "yes" : "no"}; status ${after.Status}; score ${scoreBefore} -> ${after["Score /100"]}; financial: ${after["Financial profile"]}`);
  });
  await c.step("Confirm -> Awaiting paperwork, onboarding NOT started, Start locked", async () => {
    await openApplicant(c, "APP-101");
    await p.getByRole("button", { name: /Confirm: move to Awaiting paperwork/ }).click();
    await p.getByText(/Stage: Awaiting paperwork/).waitFor();
    await p.goto(`${BASE}/onboarding/APP-101`);
    await p.getByText("Paperwork gate").first().waitFor();
    const locked = await p.getByRole("button", { name: "Start onboarding" }).isDisabled();
    const notStarted = await p.getByText("Timeline starts after paperwork is complete").count();
    return check(locked && notStarted > 0, "Stage Awaiting paperwork; timeline not started; Start onboarding locked", `Start locked: ${locked}; 'Timeline starts after paperwork is complete' shown: ${notStarted > 0}`);
  });
  await c.step("Tick gate with dates -> Day 0 = last date, Start unlocks", async () => {
    const items = [["Franchise agreement signed", "agreement", "2026-10-20"], ["GST registration done", "gst", "2026-10-22"], ["Other legal registrations done", "other", "2026-10-24"]];
    for (const [label, key, date] of items) {
      await p.getByRole("checkbox", { name: label }).click();
      await p.locator(`#date-${key}`).fill(date);
    }
    await p.getByText(/Day 0 = 2026-10-24/).waitFor();
    const unlocked = !(await p.getByRole("button", { name: "Start onboarding" }).isDisabled());
    return check(unlocked, "Day 0 = 2026-10-24 and Start onboarding unlocked", `Day 0 text shown; Start enabled: ${unlocked}`);
  });
  await c.step("Deal terms all blank, 'pin code of this store' label", async () => {
    const inputs = p.locator('input[id^="deal-"]');
    const n = await inputs.count();
    const vals = await inputs.evaluateAll((els) => els.map((e) => e.value));
    const label = await p.getByText("Pin code of this store").count();
    return check(n > 0 && vals.every((v) => v === "") && label > 0, "All deal fields blank; label 'Pin code of this store'", `${n} fields, non-blank: ${vals.filter(Boolean).length}; label present: ${label > 0}`);
  });
  await c.step("Gantt phases with 'set duration', no preset durations", async () => {
    await p.getByRole("button", { name: "Start onboarding" }).click();
    await p.getByText(/Onboarding timeline \(Day 0 = 2026-10-24\)/).waitFor();
    const durs = await p.locator('input[id^="dur-"]').evaluateAll((els) => els.map((e) => [e.id, e.value, e.placeholder]));
    const phases = ["Stock arrival", "Inventory / POS software set-up", "Training", "Soft launch"];
    const present = [];
    for (const ph of phases) if (await p.getByText(ph, { exact: true }).count()) present.push(ph);
    return check(durs.length === 4 && durs.every(([, v, ph]) => v === "" && ph === "set duration") && present.length === 4, "4 phases, durations blank with 'set duration'", `durations: ${durs.map(([i, v]) => `${i}=${v || "blank"}`).join(", ")}; phases shown: ${present.length}/4`);
  });
  await c.step("Every task has 'Why this task?'", async () => {
    const rowsN = await p.locator('[aria-label]:is([role=checkbox])').count();
    const whys = await p.getByText(/^Why this task\?/).count();
    const tasks = rowsN - 3; // the page's other checkboxes are the 3 paperwork gate items
    return check(whys > 0 && whys === tasks, "Every generated task shows 'Why this task?'", `${whys} 'Why this task?' lines for ${tasks} timeline tasks`);
  });
  await c.step("Preview as franchisee opens with no login", async () => {
    const [fr] = await Promise.all([c.ctx.waitForEvent("page"), p.getByRole("button", { name: "Preview as franchisee" }).click()]);
    await fr.getByText(/Welcome/).waitFor();
    const t = await fr.locator("body").innerText();
    await fr.close();
    return check(!BLOCK_TEXT.test(t), "Franchisee view, no login", `Welcome page shown; login/paywall text: ${BLOCK_TEXT.test(t) ? "yes" : "no"}`);
  });
  await c.step("Email preview in Kannada, nothing sent", async () => {
    await p.getByRole("button", { name: /Generate draft|Regenerate draft/ }).click();
    await p.getByText(/^Subject:/).waitFor({ timeout: 40000 });
    const box = await p.locator("pre").first().innerText();
    const kannada = /[ಀ-೿]/.test(box);
    const previewOnly = await p.getByText(/Preview only|never to the applicant/).count();
    return check(kannada && previewOnly > 0, "Draft in Kannada; preview only", `Kannada script: ${kannada}; preview-only note: ${previewOnly > 0}; by: ${await p.getByText(/Written by AI|Template in English/).first().innerText().catch(() => "?")}`);
  });
  await c.step("No login/paywall/rate-limit text", async () => check(await noBlockingText(c), "None", "checked current page body"));
  await c.step("No uncaught console errors", async () => check(c.errors.length === 0, "0 errors", c.errors.slice(0, 3).join(" || ") || "0 errors"));
  return c;
}

// ---------- CASE 2 ----------
async function case2(browser) {
  const c = await newCase(browser, "case2", "Capacity, waitlist, Hindi, rescaling");
  const p = c.page;
  const file = buildWorkbook("case2", OUT);
  let rows = [];
  await c.step("Upload case file", async () => {
    const t = await upload(c, file);
    return check(/Read 2 applicants, 1 territories, 10 existing stores/.test(t), "2 applicants, 1 territory, 10 stores", (t.match(/Read [^\n]*/) || ["?"])[0]);
  });
  await c.step("Capacity = min(1 slot, 3 free pins) = 1", async () => {
    await p.goto(BASE + "/territories");
    const t = await p.locator("main").innerText();
    return check(/min\(1 open slots, 3 free pins\) =\s*1/.test(t.replace(/\n/g, " ")), "Capacity 1", (t.replace(/\n/g, " ").match(/Capacity = min\([^)]*\) =\s*\d+/) || ["not found"])[0]);
  });
  await c.step("APP-201 Good to go, APP-202 Waitlist", async () => {
    rows = await exportCsv(c);
    const r = byId(rows);
    return check(r["APP-201"]?.Status === "Good to go" && r["APP-202"]?.Status === "Waitlist", "APP-201 Good to go; APP-202 Waitlist", `APP-201: ${r["APP-201"]?.Status}; APP-202: ${r["APP-202"]?.Status} (position ${r["APP-202"]?.["Waitlist position"]})`);
  });
  await c.step("Waitlist order needs a human confirm", async () => {
    await p.goto(BASE + "/territories");
    const btn = p.getByRole("button", { name: /Confirm order/ });
    await btn.click();
    await p.getByText(/Confirmed /).waitFor();
    return ok("Recommended order + Confirm button; confirmation recorded", "Confirm order clicked; 'Confirmed <time>' shown");
  });
  await c.step("Hard rule from export", async () => hardRule(rows));
  await c.step("'Financial profile: not provided' banner + rescale 50/25/25", async () => {
    await openApplicant(c, "APP-201");
    const banner = await p.getByText(/rescaled because financial profile was not provided/).first().isVisible();
    const r = byId(rows)["APP-201"];
    const w = [r.Space, r.Money, r.Experience].map((x) => (x.match(/\/(\d+(\.\d+)?)/) || [])[1]).join("/");
    return check(banner && w === "50/25/25" && /not provided/.test(r["Financial profile"]), "Banner shown; weights 50/25/25", `banner: ${banner}; weights ${w}; financial: ${r["Financial profile"]}`);
  });
  await c.step("APP-201 explanation/training plan in Hindi", async () => {
    await p.getByText(/Written by AI from the ledger, in Hindi|AI unavailable/).first().waitFor({ timeout: 30000 });
    const card = await p.getByRole("heading", { name: "Explanation" }).locator("xpath=ancestor::div[contains(@class,'space-y-3')][1]").innerText();
    const hindi = /[ऀ-ॿ]/.test(card);
    return check(hindi, "Explanation and training plan in Hindi (Devanagari)", `Devanagari text: ${hindi}; label: ${(card.match(/Written by AI[^\n]*|Template[^\n]*/) || ["?"])[0]}`);
  });
  await c.step("Enter financial profile -> banner gone, weights 40/20/20/20", async () => {
    await p.getByLabel("Net worth (₹ lakh)").fill("150");
    await p.getByLabel("Portfolio (₹ lakh)").fill("50");
    await p.getByRole("button", { name: "Save financial profile" }).click();
    await p.getByLabel("Net worth (₹ lakh)").and(p.locator('[value="150"]')).waitFor();
    const banner = await p.getByText(/rescaled because financial profile was not provided/).count();
    const r = byId(await exportCsv(c))["APP-201"];
    const w = [r.Space, r.Money, r.Experience, r["Financial profile"]].map((x) => (x.match(/\/(\d+(\.\d+)?)/) || [null, "n/a"])[1]).join("/");
    return check(banner === 0 && w === "40/20/20/20", "Banner disappears; weights 40/20/20/20", `banner still shown: ${banner > 0}; weights ${w}; financial column: "${r["Financial profile"]}"`);
  });
  let scoreDefault = "";
  await c.step("Settings: change a size band -> results change; profile named", async () => {
    scoreDefault = byId(await exportCsv(c))["APP-201"]["Score /100"];
    await p.goto(BASE + "/settings");
    await p.getByLabel("Preferred from").fill("1000");
    await p.getByRole("button", { name: "Save settings" }).first().click();
    await p.getByText(/Saved\. Results re-calculated/).waitFor();
    const r = byId(await exportCsv(c))["APP-201"];
    return check(r["Score /100"] !== scoreDefault && r["Profile used"] === "Default (Karnataka)", "Score changes; explanation names the profile", `score ${scoreDefault} -> ${r["Score /100"]}; Space ${r.Space}; profile used: ${r["Profile used"]}`);
  });
  await c.step("Reset to defaults", async () => {
    await p.goto(BASE + "/settings");
    await p.getByRole("button", { name: "Reset to defaults" }).click();
    await p.getByText("Reset to defaults.").waitFor();
    const r = byId(await exportCsv(c))["APP-201"];
    return check(r["Score /100"] === scoreDefault, "Score back to default value", `score now ${r["Score /100"]} (default ${scoreDefault})`);
  });
  await c.step("Chat what-if: before/after, real data unchanged", async () => {
    await p.goto(BASE + "/results");
    const a = await askChat(c, "what if APP-202 had a 700 sq ft space?");
    const r = byId(await exportCsv(c))["APP-202"];
    return check(/Before/.test(a) && /After/.test(a) && /copy/i.test(a) && r["Status"] === "Waitlist", "Before/after shown; APP-202 unchanged until confirmed", `answer: ${a.slice(0, 200)} | APP-202 still: ${r.Status}`);
  });
  await c.step("Traffic lights by default + total toggle", async () => {
    await p.goto(BASE + "/results");
    await p.getByRole("link", { name: /Test Applicant Three/ }).waitFor();
    const dots = await p.locator('main ul > li [aria-label*=": "]').count();
    await p.getByText("Total /100").click();
    await p.getByText(/\d+(\.\d)?\/100/).first().waitFor();
    return check(dots >= 8, "Four factor dots per applicant by default; toggle shows total /100", `${dots} dots for 2 applicants; total shown after toggle`);
  });
  await c.step("Export XLSX downloads", async () => {
    await p.goto(BASE + "/results");
    const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Export XLSX" }).click()]);
    return check(/\.xlsx$/.test(dl.suggestedFilename()), "XLSX file", dl.suggestedFilename());
  });
  await c.step("Export CSV has status, reason, next steps", async () => {
    const h = Object.keys(rows[0] || {});
    return check(["Status", "Reason", "Next steps"].every((k) => h.includes(k)), "Columns present", h.filter((k) => ["Status", "Reason", "Next steps"].includes(k)).join(", "));
  });
  await c.step("Settings: Case rule locked, Our choice editable", async () => {
    await p.goto(BASE + "/settings");
    const locked = await p.getByText("Case rules (locked)").count();
    const editable = await p.getByLabel("Preferred from").isEditable();
    const caseRuleInputs = await p.locator("section:has-text('Case rules (locked)') input").count();
    return check(locked > 0 && editable && caseRuleInputs === 0, "Case rules shown locked (no inputs); Our choice inputs editable", `locked section: ${locked > 0}; inputs in it: ${caseRuleInputs}; Our choice editable: ${editable}`);
  });
  await c.step("No login/paywall/rate-limit text", async () => check(await noBlockingText(c), "None", "checked current page body"));
  await c.step("No uncaught console errors", async () => check(c.errors.length === 0, "0 errors", c.errors.slice(0, 3).join(" || ") || "0 errors"));
  return c;
}

// ---------- CASE 3 ----------
async function case3(browser) {
  // AI is made unavailable here (requests to /api/ai/* answer "not available") to test the fallback.
  const c = await newCase(browser, "case3", "Rejections, holds, mismatches, contested pin (AI blocked)", { blockAi: true });
  const p = c.page;
  const file = buildWorkbook("case3", OUT);
  let rows = [], report = "";
  await c.step("Upload dirty file: no crash, duplicate flagged", async () => {
    report = await upload(c, file);
    const dup = /Duplicate Application ID 'APP-301'/.test(report);
    return check(dup, "Duplicate APP-301 flagged in the validation report; no crash", `${(report.match(/Read [^\n]*/) || ["?"])[0]}; duplicate flagged: ${dup}`);
  });
  await c.step("Dirty data tolerated (pin '590 002', text in experience)", async () => {
    rows = await exportCsv(c);
    const r = byId(rows)["APP-309"];
    return check(!!r && r["Pin code"] === "590002" && r.Status === "Hold: info needed" && /five years/.test(r["Fixes needed"]), "Row read; pin normalised; experience text reported as a fix", r ? `pin ${r["Pin code"]}; status ${r.Status}; fixes: ${r["Fixes needed"]}` : "APP-309 missing");
  });
  const r = () => byId(rows);
  await c.step("APP-301 Hold: pin occupied (not a rejection; another pin/takeover)", async () => {
    const x = r()["APP-301"];
    const words = /not recommended|may be good/i.test(x.Reason) && /different pin|takeover/i.test(x["What would change this"]) && /not a rejection/i.test(x["Next steps"]);
    return check(x.Status === "Hold: pin occupied" && words, "Hold: pin occupied, worded as not a rejection, with another pin/takeover options", `${x.Status} | ${x.Reason} | ${x["What would change this"]} | ${x["Next steps"]}`);
  });
  await c.step("APP-302 + APP-303 Needs your decision", async () => check(r()["APP-302"]?.Status === "Needs your decision" && r()["APP-303"]?.Status === "Needs your decision", "Both Needs your decision", `APP-302: ${r()["APP-302"]?.Status}; APP-303: ${r()["APP-303"]?.Status}`));
  await c.step("APP-304 (Belagavi, pin 560001) Hold: info needed", async () => check(r()["APP-304"]?.Status === "Hold: info needed", "Hold: info needed (prefix mismatch)", `${r()["APP-304"]?.Status} | ${r()["APP-304"]?.Reason} | fixes: ${r()["APP-304"]?.["Fixes needed"]}`));
  await c.step("APP-305 (no territory) Hold", async () => check(/^Hold/.test(r()["APP-305"]?.Status), "Hold (no territory covers 572999)", `${r()["APP-305"]?.Status} | ${r()["APP-305"]?.Reason}`));
  await c.step("APP-306 (no space) Hold", async () => check(/^Hold/.test(r()["APP-306"]?.Status) && /space/i.test(r()["APP-306"]?.Reason), "Hold (no space)", `${r()["APP-306"]?.Status} | ${r()["APP-306"]?.Reason}`));
  await c.step("APP-307 (investment blank) Hold with fix list", async () => check(r()["APP-307"]?.Status === "Hold: info needed" && /Investment/i.test(r()["APP-307"]?.["Fixes needed"]), "Hold with a fix list naming the investment", `${r()["APP-307"]?.Status} | fixes: ${r()["APP-307"]?.["Fixes needed"]}`));
  await c.step("APP-308 (no space + 600 sq ft) Hold with contradiction", async () => check(r()["APP-308"]?.Status === "Hold: info needed" && /600 sq ft/.test(r()["APP-308"]?.["Fixes needed"]), "Hold with a contradiction flag", `${r()["APP-308"]?.Status} | fixes: ${r()["APP-308"]?.["Fixes needed"]}`));
  await c.step("Hard rule from export", async () => hardRule(rows));
  await c.step("No automatic Reject anywhere", async () => {
    const statuses = [...new Set(rows.map((x) => x.Status))];
    return check(!statuses.some((s) => /reject/i.test(s)) && !statuses.includes("Not proceeding"), "No Reject / Not proceeding set automatically", statuses.join(", "));
  });
  await c.step("Contested board: side by side, tool does not pick, notes + Reviewer's call", async () => {
    await p.goto(BASE + "/contested");
    await p.getByText(/Pin 590002/).waitFor();
    const cards = await p.locator("a", { hasText: /^APP-30[23]$/ }).count();
    const undecided = await p.locator("#call-590002").inputValue();
    await p.locator("#notes-590002").fill("Visit both sites first");
    await p.locator("#notes-590002").blur();
    await p.locator("#call-590002").selectOption("APP-302");
    const after = byId(await exportCsv(c));
    await p.goto(BASE + "/contested");
    const notesKept = await p.locator("#notes-590002").inputValue();
    await p.locator("#call-590002").selectOption("");
    return check(cards >= 2 && undecided === "" && after["APP-303"].Status === "Hold: pin occupied" && notesKept === "Visit both sites first",
      "Both shown, nothing picked by the tool; call applies; notes saved", `cards ${cards}; default call '${undecided || "Undecided"}'; after picking APP-302: APP-302 ${after["APP-302"].Status}, APP-303 ${after["APP-303"].Status}; notes kept: ${notesKept === "Visit both sites first"}`);
  });
  await c.step("Not proceeding: blocked without reason, allowed with reason, logged, in ledger", async () => {
    await openApplicant(c, "APP-301");
    const form = p.locator("form", { hasText: "Change status manually" });
    await form.locator("select").selectOption("Not proceeding");
    const blocked = await form.getByRole("button", { name: "Save" }).isDisabled();
    await form.getByPlaceholder("Reason (required)").fill("Applicant withdrew");
    await form.getByRole("button", { name: "Save" }).click();
    await p.getByText(/Set manually by reviewer: Applicant withdrew/).first().waitFor();
    await p.goto(BASE + "/activity");
    const logged = await p.getByText(/Status set to 'Not proceeding'\. Reason: Applicant withdrew/).count();
    return check(blocked && logged > 0, "Save blocked with no reason; allowed with reason; logged; shown in ledger", `blocked without reason: ${blocked}; ledger reason shown; logged: ${logged > 0}`);
  });
  await c.step("AI unavailable: template explanation, no errors", async () => {
    await openApplicant(c, "APP-302");
    await p.getByText(/Template from the ledger/).first().waitFor();
    return ok("Template explanation shown", "'Template from the ledger (English)' shown with AI requests answering 'not available'");
  });
  await c.step("Why? opens ledger with Case rule / Our choice tags", async () => {
    await p.getByRole("button", { name: "Why?" }).first().click();
    const d = await p.getByRole("dialog").innerText();
    await p.keyboard.press("Escape");
    return check(/case rule/i.test(d) && /our choice/i.test(d), "Both tags in the ledger", `case rule: ${/case rule/i.test(d)}; our choice: ${/our choice/i.test(d)}`);
  });
  await c.step("Area snapshot: reference only, fails soft", async () => {
    await p.getByRole("button", { name: "Get area snapshot" }).click();
    await p.getByText(/Area data:|Within \d+ m/).first().waitFor();
    const t = await p.getByText(/Area data:|Within \d+ m/).first().innerText();
    const label = await p.getByText("Reference only, not used in decisions.").count();
    return { status: /not available/.test(t) ? "MISMATCH" : "PASS", expected: "Counts of nearby places, labelled reference only", actual: `${t}; label shown: ${label > 0}` };
  });
  await c.step("People research: reviewer-only, consent line, unverified", async () => {
    const consentLine = await p.getByText(/Only research an applicant with their knowledge/).count();
    const disabled = await p.getByRole("button", { name: "Search the web" }).isDisabled();
    await p.getByRole("checkbox", { name: "Consent" }).click();
    await p.getByRole("button", { name: "Search the web" }).click();
    const t = await p.getByText(/Nothing found|possible match, unverified|Not available/).first().innerText();
    return check(consentLine > 0 && disabled, "Consent line; disabled until consent; results marked unverified", `consent line: ${consentLine > 0}; disabled before consent: ${disabled}; result (AI blocked): ${t}`);
  });
  await c.step("Map / 'View on Google Maps' link", async () => {
    const n = await p.locator('a[href*="google.com/maps"], a[href*="maps.google"]').count() + await p.getByText(/View on Google Maps/i).count();
    return n ? ok("Map link on pins", `${n} found`) : { status: "NOT BUILT", expected: "Map or 'View on Google Maps' link on pins", actual: "No map view or maps link exists" };
  });
  await c.step("Results: status counts, filters, search", async () => {
    await p.goto(BASE + "/results");
    await p.getByRole("link", { name: /Test Applicant Five/ }).waitFor();
    const now = await exportCsv(c);
    await p.goto(BASE + "/results");
    await p.getByRole("link", { name: /Test Applicant Five/ }).waitFor();
    const holds = now.filter((x) => x.Status.startsWith("Hold")).length;
    const infoHolds = now.filter((x) => x.Status === "Hold: info needed").length;
    await p.getByRole("button", { name: "Holds", exact: true }).click();
    const holdCards = await p.locator("main ul > li").count();
    await p.getByRole("button", { name: "All", exact: true }).click();
    await p.getByPlaceholder("Search ID, name, pin").fill("APP-304");
    const searchCards = await p.locator("main ul > li").count();
    const tile = p.locator("button", { hasText: "Hold: info needed" }).first();
    const tileOk = await p.waitForFunction(([n]) => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Hold: info needed") && b.textContent.includes(String(n))), [infoHolds], { timeout: 5000 }).then(() => true, () => false);
    return check(holdCards === holds && searchCards === 1 && tileOk, "Holds chip shows all holds; search finds 1; status count tiles match", `holds chip: ${holdCards} (expected ${holds}); search APP-304: ${searchCards}; tile: ${(await tile.innerText()).replace(/\n/g, " ")} (expected ${infoHolds})`);
  });
  await c.step("Territory view", async () => {
    await p.goto(BASE + "/territories");
    const t = (await p.locator("main").innerText()).replace(/\n/g, " ");
    return check(/TER-03/.test(t) && /min\(2 open slots, 2 free pins\) =\s*2/.test(t), "TER-03 capacity min(2, 2 free pins) = 2", (t.match(/Capacity = min\([^)]*\) =\s*\d+/) || ["?"])[0]);
  });
  await c.step("Chat says 'that isn't in the data'", async () => {
    const a = await askChat(c, "What is APP-302's email address?");
    return check(/isn't in the data/i.test(a), "\"That isn't in the data.\"", a.slice(0, 160));
  });
  await c.step("No login/paywall/rate-limit text", async () => check(await noBlockingText(c), "None", "checked current page body"));
  await c.step("No uncaught console errors", async () => check(c.errors.length === 0, "0 errors", c.errors.slice(0, 3).join(" || ") || "0 errors"));
  return c;
}

// ---------- run ----------
const t0 = Date.now();
let unit = "not run";
try {
  const out = execSync("npx vitest run 2>&1", { encoding: "utf8" });
  unit = (out.match(/Tests\s+[^\n]*/) || ["?"])[0].replace(/\x1b\[[0-9;]*m/g, "").trim();
} catch (e) {
  unit = "FAILED: " + String(e.stdout || e.message).match(/Tests\s+[^\n]*/)?.[0];
}
const browser = await chromium.launch();
const cases = await Promise.all([case1(browser), case2(browser), case3(browser)]);
await browser.close();
const total = ((Date.now() - t0) / 1000).toFixed(1);

// ---------- report ----------
const tally = (c) => ["PASS", "FAIL", "MISMATCH", "NOT BUILT", "SKIPPED-TIMEOUT"].map((s) => `${s} ${c.steps.filter((x) => x.status === s).length}`).join(" · ");
const caseSecs = (c) => c.steps.reduce((a, s) => a + s.secs, 0).toFixed(1);
const problems = cases.flatMap((c) => c.steps.filter((s) => s.status === "FAIL" || s.status === "MISMATCH").map((s) => ({ c, s })));
const priority = (s) => (/hard rule|pin occupied|Needs your decision|login|paywall/i.test(s.name) ? 0 : s.status === "FAIL" ? 1 : 2);
problems.sort((a, b) => priority(a.s) - priority(b.s));
const esc = (x) => String(x ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

let md = `# Test report\n\nRun ${new Date().toISOString()} against ${BASE}. Three cases in parallel, each in a fresh browser context with its own session; 90 s cap per case. Report only; nothing was fixed.\n\n`;
md += `## Summary\n\n| Case | Result | Seconds |\n|---|---|---|\n`;
for (const c of cases) md += `| ${c.key}: ${c.title} | ${tally(c)} | ${caseSecs(c)} |\n`;
md += `\nTotal run time: **${total} s** (includes the unit tests). Unit tests (npm test): **${unit}**.\n\n`;
md += `### Fix first\n\n${problems.length ? problems.map(({ c, s }, i) => `${i + 1}. **${c.key} · ${s.name}** (${s.status}): expected ${esc(s.expected)}; actual ${esc(s.actual)}`).join("\n") : "Nothing failed or mismatched."}\n\n`;
for (const c of cases) {
  md += `## ${c.key}: ${c.title}\n\n| # | Step | Status | Expected | Actual | s | Screenshot |\n|---|---|---|---|---|---|---|\n`;
  c.steps.forEach((s, i) => (md += `| ${i + 1} | ${esc(s.name)} | ${s.status} | ${esc(s.expected)} | ${esc(s.actual)} | ${s.secs} | ${s.shot ?? ""} |\n`));
  md += "\n";
}
md += `## How to re-run\n\n\`npm run test:e2e\` (live site) or \`BASE_URL=http://localhost:3000 npm run test:e2e\`. Workbooks are generated into tests/e2e/out/ from data/template.xlsx.\n`;
fs.writeFileSync("deliverables/TEST_REPORT.md", md);

console.log(`\nUnit tests: ${unit}`);
for (const c of cases) {
  console.log(`\n${c.key}: ${c.title}  (${caseSecs(c)} s)  ${tally(c)}`);
  for (const s of c.steps) console.log(`  ${s.status.padEnd(15)} ${String(s.secs).padStart(5)}s  ${s.name}${s.status !== "PASS" ? `\n${" ".repeat(25)}expected: ${s.expected}\n${" ".repeat(25)}actual:   ${String(s.actual).slice(0, 220)}${s.shot ? `\n${" ".repeat(25)}shot: ${s.shot}` : ""}` : ""}`);
}
console.log(`\nTotal: ${total} s · report: deliverables/TEST_REPORT.md`);

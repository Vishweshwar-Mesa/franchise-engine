// Records the 1-minute demo on the live site. Each section lasts at least as long as its narration
// line; the real start time of every section is written to segments.json so the audio and the
// subtitles can be placed exactly where the picture is.
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const B = process.env.BASE_URL ?? "https://franchise-engine-psi.vercel.app";
const WORK = path.resolve("deliverables/video_work");
const speech = JSON.parse(fs.readFileSync(path.join(WORK, "durations.json"), "utf8"));
const EXTRA = [0.4, 0.4, 0.5, 0.3, 0.5, 0.4, 0.4, 1.4, 0.4, 0.6];

const CURSOR = `
  window.addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.id = "demo-cursor";
    c.style.cssText = "position:fixed;z-index:2147483647;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(224,0,111,.35);border:2px solid #E0006F;pointer-events:none;transition:transform .12s";
    document.body.appendChild(c);
    const pos = JSON.parse(sessionStorage.getItem("demo-cursor") || "[960,540]");
    c.style.left = pos[0] + "px"; c.style.top = pos[1] + "px";
    document.addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; sessionStorage.setItem("demo-cursor", JSON.stringify([e.clientX, e.clientY])); }, true);
    document.addEventListener("mousedown", () => (c.style.transform = "scale(.7)"), true);
    document.addEventListener("mouseup", () => (c.style.transform = ""), true);
  });`;

const br = await chromium.launch();
// Warm-up in its own context so the recorded one starts on a loaded page (fresh, private context).
const ctx = await br.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir: WORK, size: { width: 1920, height: 1080 } } });
await ctx.addInitScript(CURSOR);
const p = await ctx.newPage();
const t0 = Date.now();
await p.goto(B + "/results", { waitUntil: "networkidle" });
await p.getByText("Needs your decision").first().waitFor();
await p.waitForTimeout(1500);

const now = () => (Date.now() - t0) / 1000;
let x = 960, y = 540;
async function move(tx, ty, steps = 30) {
  await p.mouse.move(tx, ty, { steps });
  x = tx; y = ty;
}
async function moveTo(locator, steps = 30) {
  const b = await locator.boundingBox();
  if (b) await move(b.x + b.width / 2, b.y + b.height / 2, steps);
}
async function nav(href) {
  const link = p.locator(`nav a[href="${href}"], header a[href="${href}"]`).first();
  if (await link.count()) { await moveTo(link, 20); await link.click(); } else await p.goto(B + href);
  await p.waitForLoadState("networkidle").catch(() => {});
  await p.waitForTimeout(500);
}
const segs = [];
async function section(i, fn) {
  const start = now();
  await fn();
  const target = start + speech[i] + EXTRA[i];
  const left = target - now();
  if (left > 0) await p.waitForTimeout(left * 1000);
  segs.push({ i, start, end: now(), overrun: left < 0 ? -left : 0 });
}

// 1. The problem: a file full of applicants
await section(0, async () => {
  await move(700, 300, 40);
  await p.waitForTimeout(1200);
  await move(1100, 420, 40);
});
// 2. What the tool does: results table
await section(1, async () => {
  const table = p.getByRole("button", { name: "Table" }).first();
  await moveTo(table, 25); await table.click();
  await p.waitForTimeout(900);
  await move(900, 640, 35);
  await p.mouse.wheel(0, 280); await p.waitForTimeout(900);
});
// 3. Every status has a reason: applicant and its Why? ledger
await section(2, async () => {
  await p.goto(B + "/applicant/APP-006", { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  const why = p.getByRole("button", { name: /Why\?/ }).first();
  await moveTo(why, 25); await p.waitForTimeout(300); await why.click();
  await p.waitForTimeout(1600);
  await move(960, 650, 25);
  await p.mouse.wheel(0, 380); await p.waitForTimeout(1200);
});
// 4. The one hard rule
await section(3, async () => {
  await p.keyboard.press("Escape");
  await nav("/contested");
  await moveTo(p.getByText("the brand never opens two stores", { exact: false }).first(), 30);
});
// 5. Contested pin: the tool does not pick
await section(4, async () => {
  await p.mouse.wheel(0, 300); await p.waitForTimeout(700);
  const call = p.getByText("Reviewer's call").first();
  await moveTo(call, 35);
  await p.waitForTimeout(800);
  await move(x + 200, y + 40, 20);
});
// 6. Territories
await section(5, async () => {
  await nav("/territories");
  await moveTo(p.getByText("Capacity = min").nth(1), 30);
});
// 7. Settings: editable rubric, Case rule vs Our choice
await section(6, async () => {
  await nav("/settings");
  await moveTo(p.getByText("Case rules (locked)").first(), 25);
  await p.waitForTimeout(900);
  await moveTo(p.getByText("Our choice", { exact: true }).first(), 30);
  await p.mouse.wheel(0, 160); await p.waitForTimeout(400);
});
// 8. Chat answers a why question
await section(7, async () => {
  const ask = p.getByRole("button", { name: "Ask / What-if" });
  await moveTo(ask, 20); await ask.click();
  await p.waitForTimeout(500);
  await p.locator("textarea").pressSequentially("Why is APP-006 on the waitlist?", { delay: 25 });
  await p.keyboard.press("Enter");
  await p.getByText("Answered by").first().waitFor({ timeout: 15000 }).catch(() => {});
});
// 9. Onboarding paperwork gate
await section(8, async () => {
  await p.keyboard.press("Escape");
  await p.goto(B + "/onboarding/APP-005", { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await moveTo(p.getByText("Paperwork gate").first(), 25);
  await p.mouse.wheel(0, 250); await p.waitForTimeout(500);
  await moveTo(p.getByRole("button", { name: "Start onboarding" }), 30);
});
// 10. Closing on the welcome page
await section(9, async () => {
  await p.goto(B + "/", { waitUntil: "domcontentloaded" });
  await move(960, 540, 10);
});

const video = await p.video().path();
await ctx.close();
await br.close();
fs.writeFileSync(path.join(WORK, "segments.json"), JSON.stringify({ video, segs }, null, 2));
console.log(JSON.stringify(segs.map((s) => ({ i: s.i, start: +s.start.toFixed(2), len: +(s.end - s.start).toFixed(2), overrun: +s.overrun.toFixed(2) }))));
console.log("video", video, "total", (segs.at(-1).end - segs[0].start).toFixed(2));

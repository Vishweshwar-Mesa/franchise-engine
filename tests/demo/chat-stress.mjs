import { chromium } from "playwright";
const B = process.env.BASE_URL ?? "https://franchise-engine-psi.vercel.app";
const QS = [
  "Why is APP-007 on hold?", "What would change APP-004?", "Who is on the waitlist?",
  "APP-009 is now renting a 600 sq ft shop on the ground floor", "What if APP-006 had a 700 sq ft space?",
  "Which territory has the most applicants?", "How many stores does Go Colors have?", "What is the franchise fee?",
  "hi", "HI", "WHO IS CHEAPER?", "who is the best?", "which stores are in onboarding?", "summarise the results", "Who should I pick for pin 570001?", "compare APP-001 and APP-002",
  "What if APP-002 moved to 570008?", "APP-013 now has 30 lakh to invest", "Why is APP-099 on hold?",
  "list everyone on hold", "What is the payback period?", "How can APP-004 pass?", "tell me about onboarding of APP-025",
  "what does Hold: pin occupied mean?", "Is APP-003 good?", "Why?", "ok thanks",
];
const br = await chromium.launch();
const p = await (await br.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
p.on("console", (m) => m.type() === "error" && errs.push("CONSOLE " + m.text().slice(0, 200)));
p.on("response", (r) => r.url().includes("/api/ai/chat") && r.status() >= 400 && errs.push("HTTP " + r.status()));
await p.goto(B + "/results"); await p.getByText("Needs your decision").first().waitFor();
await p.getByRole("button", { name: "Ask / What-if" }).click();
for (const q of QS) {
  const before = await p.locator('[role="dialog"] p.whitespace-pre-wrap').count();
  const t = Date.now();
  await p.locator('[role="dialog"] textarea').fill(q);
  await p.keyboard.press("Enter");
  let ok = true;
  try { await p.waitForFunction((n) => document.querySelectorAll('[role="dialog"] p.whitespace-pre-wrap').length >= n + 2, before, { timeout: 30000 }); } catch { ok = false; }
  const last = ok ? await p.locator('[role="dialog"] p.whitespace-pre-wrap').last().innerText() : "(NO ANSWER)";
  const by = ok ? await p.locator('[role="dialog"] p:has-text("Answered by")').last().innerText().catch(() => "") : "";
  console.log(`\n[${((Date.now() - t) / 1000).toFixed(1)}s] Q: ${q}\n  A (${by}): ${last.slice(0, 300).replace(/\n/g, " / ")}`);
  if (!(await p.locator('[role="dialog"]').count())) { console.log("  !! DIALOG GONE"); break; }
}
console.log("\nERRORS:", errs.length ? errs.join("\n") : "none");
await br.close();

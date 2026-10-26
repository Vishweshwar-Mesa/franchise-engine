# Go Colors Franchise Engine: facts for the deck

Checked on 26 Oct 2026 (about 22:55 to 23:05 IST) against the live site, in fresh browser sessions (Playwright, no saved data, the same as a private window). Everything below was observed or measured unless marked **UNVERIFIED** or **NOT BUILT**. No keys or secret values appear in this file.

Evidence files next to this one: `live-run.json` (feature checks and chat answers), `sample-run.json` (sample-data run and timings), `export-sample.csv` and `export-demo.csv` (the app's own CSV exports), `ledger-examples.json` (ledger entries the live site saved to the database), `screens/` (screenshots).

---

## 1. Basics

| Item | Value |
|---|---|
| Live URL | https://franchise-engine-psi.vercel.app |
| GitHub | https://github.com/Vishweshwar-Mesa/franchise-engine (public) |
| Stack | Next.js 16.4.3 (App Router, TypeScript), React 19.3, Tailwind CSS 4, shadcn/ui (Base UI), Zod 4, Zustand 5, SheetJS xlsx 0.20.3, GSAP 3.15, Neon Postgres (`@neondatabase/serverless`), Vercel hosting, Vitest 5. AI: Google Gemini (primary), OpenRouter (backup). |
| Team | Namratha Reddy, Vishweshwar. No surname for Vishweshwar appears anywhere in the repo or commits (all 24 commits are by the GitHub account "Vishweshwar-Mesa"). |
| First commit | 25 Oct 2026, 21:39 IST ("Group 1: engine, reason ledger, screens, AI fallbacks, context file") |
| Last commit | 26 Oct 2026, 22:49 IST ("Intro plays on every load of the welcome page"), before this facts file was added |
| Commits | 24 before this file |
| Env var names set in Vercel | DATABASE_URL (Neon), GEMINI_API_KEYS, GEMINI_MODEL, OPENROUTER_API_KEY, OPENROUTER_MODEL (plus Neon's own PG*/POSTGRES_* variables added by the integration). GOOGLE_MAPS_API_KEY, BLOB_READ_WRITE_TOKEN, RESEND_API_KEY, REVIEWER_EMAIL: **not set**. |

---

## 2. Live check

Fresh session, live URL. HTTP 200. No login, paywall or rate-limit message on any page tested (the page text was checked for "log in to continue", "sign in", "password", "subscribe", "rate limit", "too many requests"). Zero browser errors recorded across the run.

On first visit the site loads 30 made-up demo applicants and 3 demo onboarding stores automatically, with a "Demo data" note. Uploading a file or pressing "Load sample data" replaces them.

| Feature | Status | What it does | If AI or a key is missing |
|---|---|---|---|
| Load (welcome page `/`) | LIVE | Go Colors-branded welcome page with a short intro animation, then "Open the review desk". Usable about 4.4 s after opening, most of which is the intro (skippable). | Not affected. |
| "Load sample data" | LIVE | Loads the case template (`template.xlsx`) from the Upload page. | Not affected. |
| Upload | LIVE | Reads the Excel file in the browser, finds columns by name, shows a validation report and a list of rows with problems. | Not affected. |
| Results (Applicants) | LIVE | Status counts, filter chips, search, card view and table view (30 rows tested), score dots per factor, "Why?" on every row. | Not affected. |
| Applicant detail | LIVE | Status and reason, factor score bars, full reason ledger, explanation, next steps, training plan, financial profile form, site details form, questions to ask, manual status change, confirm. | Explanation and training plan fall back to an English template; business relevance shows "not rated" (0 of its points) until a reviewer rates it. |
| /contested | LIVE | Applicants who want the same free pin, side by side with scores, strengths, concerns, a notes box and a "Reviewer's call" selector. 2 contested pins in the demo data. | Not affected. |
| Territory view | LIVE | Each territory's open slots, free pins, capacity, assigned, waitlist in recommended order with a confirm button. 8 territories in the demo data. | Not affected. |
| Settings | LIVE | Every scoring default and check is editable with plain-language explanations; case rules shown as locked; reset to defaults. | Not affected. |
| Chat ("Ask / What-if") | LIVE | Answers why-questions from the ledger, applies updates ("APP-009 is now renting a 600 sq ft shop on the ground floor") with before/after and Undo, previews what-ifs, answers Go Colors questions from verified facts, refuses off-topic, pricing and "how to pass" questions. | Works fully from the ledger (tested with keys removed, see section 6). |
| Export | LIVE | CSV and XLSX with status, reason, score, fixes, flags, what would change it, next steps, questions to ask. | Not affected. |
| Onboarding: Awaiting paperwork gate | LIVE | Confirming a Good to go applicant moves them here. Three items (agreement, GST, other registrations), each with a date and optional upload. "Start onboarding" stays disabled until all three are ticked (verified: disabled for APP-005). "Timeline starts after paperwork is complete" shown. | Not affected. Uploaded files keep only the file name, because no file storage key is set. |
| Onboarding: deal terms | LIVE | All fields blank until the reviewer types them (fee, deposit, royalty, term, store name, pin, inventory, investments, payment schedule, marketing fund, training, exit terms). | Not affected. |
| Onboarding: Gantt | LIVE | A Gantt chart across all stores (one row per task, colour per store, today line) and a task board (Paperwork, Overdue, Next 14 days, Later, Needs a date, Done). Per-store Gantt on each store page. | Not affected. |
| "Preview as franchisee" | LIVE | Opens the franchisee's view of their store, paperwork, deal terms, training plan and timeline. No login (verified). | Not affected. |
| Map | NOT BUILT | There is no map view. | Not applicable. |
| Area snapshot | PARTIAL | Built: geocodes the pin, checks it is in the right city, counts nearby schools, colleges, stores, clothing stores and restaurants via Google Places. Live result today: "Area data: not available (Google Maps key not configured)". Never used in decisions. | Shows "not available", never an error. |
| People research | LIVE | Reviewer-only, needs a consent tick, uses AI web search, shows links as "possible match, unverified", never used in decisions. Live result for a made-up demo applicant: "Nothing found." Results for a real person: **UNVERIFIED**. | Shows "Not available". |
| Other screens | LIVE | Today dashboard (`/today`), Guide with glossary (`/guide`), Activity log (`/activity`), dark mode toggle. | Not affected. |

---

## 3. Sample-data run (`template.xlsx` on the live site)

Fresh session, Upload page, "Load sample data".

- Validation report: "Read 1 applicants, 1 territories, 10 existing stores. Sheets: Applications, Territories, Existing stores, Allowed values, Field guide, Glossary. No file-level problems."
- **Applicants: 1** (the template has one example row, APP-001 Ravi Kumar). The app keeps the example row when it is the only row.

| Status | Count |
|---|---|
| Good to go | 1 (APP-001) |
| Needs your decision | 0 |
| Hold: info needed | 0 |
| Hold: pin occupied | 0 |
| Waitlist | 0 |

| Territory | Open slots | Free pins | Capacity | Assigned | Waitlisted |
|---|---|---|---|---|---|
| TER-01 Mysuru (Tier 2, High) | 3 | 570001, 570002, 570008 (3) | min(3, 3) = 3 | APP-001 on 570001 | none |

Score note: the export taken right after loading shows 58.2/100 (business relevance not yet rated). A moment later the AI rated the business ("Runs a footwear store") as High and the Territories page showed 65.7. The status did not change.

Because the template has only one applicant, the same run was repeated with the 30-applicant demo file (made-up data with deliberate problems, shipped in the repo as `public/samples/demo-messy.xlsx`), uploaded through the normal upload box. Live export `export-demo.csv`:

| Status | Count | Applicants |
|---|---|---|
| Good to go | 10 | APP-004, 005, 011, 019, 021, 023, 024, 025, 030, 031 |
| Needs your decision | 4 | APP-001 and 002 (pin 570001), APP-017 and 018 (pin 590006) |
| Hold: info needed | 9 | APP-007, 008, 009, 010, 013, 014, 015, 027, 028 |
| Hold: pin occupied | 2 | APP-003 (560034, store ST-02), APP-029 (580020, store ST-09) |
| Waitlist | 5 | APP-006, 016, 020, 022, 026 |

| Territory | Assigned (Good to go) | Waitlist | Other |
|---|---|---|---|
| TER-01 Mysuru | APP-030 | none | Needs decision: APP-001, 002; Info: APP-027, 028 |
| TER-02 Bengaluru | APP-004, 005 | APP-006 | Pin occupied: APP-003 |
| TER-03 Bengaluru | APP-025 | APP-016, 026 | |
| TER-04 Mangaluru | APP-019 | APP-020 | Info: APP-007, 014 |
| TER-05 Hubballi-Dharwad | APP-011, 021 | none | Pin occupied: APP-029 |
| TER-06 Belagavi | none | none | Needs decision: APP-017, 018; Info: APP-013 |
| TER-07 Tumakuru | APP-031 | APP-022 | |
| TER-08 Davanagere | APP-023, 024 | none | Info: APP-009, 010 |
| No territory | | | Info: APP-008, 015 |

Note: with AI on, which applicant wins a slot can differ from a run without AI, because the AI's business-relevance rating is part of the Experience score. Example: in this run APP-004 (mobile accessories, rated Medium) is Good to go and APP-006 (works in a bank, rated Low) is waitlisted.

**Hard rule check (one store per pin code): PASS on both runs.**
- Template run: Good to go pins = [570001]. No duplicates. Not an existing store pin.
- Demo run: Good to go pins = 560011, 560025, 580021, 575002, 580029, 577001, 577002, 560095, 570002, 572102. No pin appears twice. None is one of the 10 existing store pins (560001, 560034, 560038, 560066, 560076, 570009, 570017, 575001, 580020, 590001). Applicants on store pins (APP-003, APP-029) are "Hold: pin occupied". Pins wanted by two qualified applicants (570001, 590006) are "Needs your decision" and no one is assigned to them until the reviewer chooses.
- Also covered by unit tests (same-pin rule, contested pins, and a manual "Good to go" reserving its pin).

---

## 4. Worked examples (copied from the live ledger)

Source: the ledger rows the live site saved to the database for a fresh demo session (`ledger-examples.json`). AI was on, so business relevance is AI-rated.

### A. Good to go: APP-025 Rahul Menon

Inputs: Bengaluru, Karnataka, pin 560095. Investment ₹55 lakh. Retail experience 12 years. Business "Franchisee of a footwear brand". Space Owned, 1200 sq ft, Ground floor. Language English.

| Check | Input | Result | Tag |
|---|---|---|---|
| Required fields present | all present | pass | Our choice |
| Pin code has 6 digits | 560095 | pass | Our choice |
| Pin matches the city's prefix | 560095 vs Bengaluru (560) | pass | Our choice |
| A territory covers this pin | 560095 | pass (TER-03) | Our choice |
| A space is identified | Owned | pass | Our choice |
| Site details (asked; not scored) | not asked yet | note | Our choice |
| No existing store on this pin | 560095 | pass | Case rule |
| Territory capacity = min(open slots, free pins) | TER-03 | slot 1 of 1 | Case rule |

Score 100/100, rescaled because the financial profile was not provided:
- Space 50/50 (green): tenure Owned 12.5/12.5, size 1200 sq ft "700+ preferred" 25/25, floor Ground 12.5/12.5
- Money 25/25 (green): ₹55 lakh, percent rank 100 among 29
- Experience 25/25 (green): 12 years, percent rank 100 among 29 = 17.5/17.5; business relevance High (AI: "Franchisee of a footwear brand", which is footwear retail) 7.5/7.5
- Financial profile: not provided

Why: "Meets every check; ranked 1 of 3 in TER-03, slot 1 of 1."
What would change it: "A higher-scoring applicant in the same territory, or fewer open slots, would move this to Waitlist." / "Entering the financial profile re-scores everyone who has one."
Next steps: "Review the ledger and confirm. Confirming moves the applicant to 'Awaiting paperwork'." / "Ask the applicant the open site questions (frontage, visibility, rent) before confirming."
Questions to ask: frontage in feet; how visible the shop is (rent not asked, because the space is owned).

### B. Hold: pin occupied: APP-003 Arjun Shetty

Inputs: Bengaluru, pin 560034. ₹40 lakh. 8 years. "Manages a kidswear store". Rented, 750 sq ft, Ground. English.

| Check | Input | Result | Tag |
|---|---|---|---|
| Required fields present | all present | pass | Our choice |
| Pin code has 6 digits | 560034 | pass | Our choice |
| Pin matches the city's prefix | 560034 vs Bengaluru (560) | pass | Our choice |
| A territory covers this pin | 560034 | pass (TER-02) | Our choice |
| A space is identified | Rented | pass | Our choice |
| Site details (asked; not scored) | not asked yet | note | Our choice |
| No existing store on this pin | 560034 | existing store ST-02 (opened 2020) | Case rule |

Score 94.8/100 (rescaled): Space 46.9/50 (Rented 9.4/12.5, 750 sq ft 25/25, Ground 12.5/12.5); Money 24.1/25 (percent rank 96); Experience 23.8/25 (8 years 16.3/17.5, relevance High 7.5/7.5); financial profile not provided.

Why: "Pin 560034 already has store ST-02. The profile may be good, but this pin is not recommended."
What would change it: "A different pin with no store. Free pins in TER-02: 560011, 560025, 560041." / "A takeover of the existing store on this pin (an option for a human to consider)."
Next steps: "Discuss another pin or a possible takeover with the applicant. This is not a rejection."

### C. Contested pin: APP-001 Ravi Kumar (pin 570001, with APP-002)

Inputs: Mysuru, pin 570001. ₹25 lakh. 4 years. "Runs a footwear store". Rented, 450 sq ft, Ground. Kannada.

All checks pass (same list as A, all Our choice, plus "No existing store on this pin: pass, Case rule").

Score 65.9/100 (rescaled): Space 36.9/50 (Rented 9.4/12.5, 450 sq ft "400-699 medium" 15/25, Ground 12.5/12.5); Money 13.4/25 (amber, percent rank 54); Experience 15.6/25 (amber; 4 years 8.1/17.5, relevance High 7.5/7.5). Rank 3 of 3 in TER-01. APP-002 Lakshmi Narayan scores 80.1 on the same pin.

Why: "Pin 570001 is wanted by 2 qualified applicants (APP-001, APP-002). Only one store per pin: you decide."
What would change it: "Your call on pin 570001 on the Contested pins board."
Next steps: "Compare the applicants side by side and record a Reviewer's call with notes."
The tool never picks. The pin holds one territory slot until the reviewer decides.

---

## 5. Scoring as implemented (defaults, all editable in Settings)

- **Weights:** Space 40, Money 20, Experience 20, Financial profile 20.
- **Space 40:** tenure 10 (Owned 1.0, Rented 0.75 of it), size 20, floor 10.
- **Size bands:** under 400 sq ft "small-space risk" (0.25 of the size points), 400 to 699 "medium" (0.6), 700 and above "preferred" (1.0). From Go Colors' own statements (average store about 540 sq ft, newer 700+, stores under about 400 can't show the full range).
- **Floor:** Ground 1.0, Mall unit 1.0, Upper 0.5, Not known 0.2.
- **Money 20:** investment capacity, by percent rank among applicants in the file.
- **Experience 20:** years 14 (percent rank among applicants) + business relevance 6 (High 1.0, Medium 0.5, Low 0). Relevance comes from the AI, or the reviewer's override; unrated counts 0.
- **Financial profile 20:** net worth 10 + portfolio 10, typed by the reviewer, by percent rank among applicants who have one. A part counts only when at least 2 applicants have it.
- **Traffic lights:** Money, Experience and Financial by rank among applicants: top third green, middle amber, bottom red (thresholds 0.667 and 0.333, editable). Space by its share of points.
- **Not scored:** launch timing and territory priority. Launch timing gets a "feasibility note" only if a limit is set in Settings (blank by default).
- **Rescaling:** if no financial profile is entered, the other three are scaled to 100 (Space 50, Money 25, Experience 25) and the applicant shows "Score rescaled because financial profile was not provided". Real example: APP-025 above (Space 50/50, Money 25/25, Experience 25/25, banner shown on the live page; screenshot `03-applicant-detail.png`).
- **Liabilities:** free-text field in the financial profile. Shown as a warning on the applicant card and in the ledger flags. Never changes the score or status (unit test "liabilities are a flag only and never change score or status"). Not exercised on the live site in this check: **UNVERIFIED live**, verified in tests.

---

## 6. AI usage

- **What the AI does:** rates how relevant each applicant's business is (High/Medium/Low, with a one-line reason) and flags notes that contradict the form; writes the plain-language explanation, next steps and training plan in the applicant's preferred language (Kannada, English or Hindi); answers chat questions; drafts the confirmation email; runs people research (web search). It never sets a check, score or status; statuses come from the rules engine. A flagged contradiction only becomes a hold if the reviewer confirms it.
- **Model setting (names only):** `GEMINI_MODEL` with `GEMINI_API_KEYS` (primary). `OPENROUTER_MODEL` with `OPENROUTER_API_KEY` (backup; currently blocked by the OpenRouter account's own guardrails, so it never answers).
- **Guardrails (both in the browser and on the server):** refuses off-topic questions, "how do I pass / what should I enter" questions, pricing and fee questions (says Go Colors has not published them, gives no numbers) and attempts to change or read its instructions. Brand questions are answered only from a fixed list of verified Go Colors facts with sources. Answers are checked against a schema; AI answers are cached in the database; per-visitor limits fall back to templates instead of blocking.
- **Test with the AI keys removed** (the same build run locally with all AI keys blanked):
  - `/api/status` reported `"ai": false`; the explanation endpoint returned "not available" instead of an error.
  - Applicant page: "Template from the ledger (English)" explanation; business relevance "not rated yet → 0/7.5".
  - Chat "Why is APP-007 on hold?": "APP-007 is 'Hold: info needed'. Information needed: Pin 575002 does not start with 570, the prefix for Mysuru…" (from the ledger).
  - Chat "APP-009 is now renting a 600 sq ft shop on the ground floor": "Status: 'Hold: info needed' → 'Good to go'…" with before/after.
  - No browser errors.
- **With AI on (live):** "Why is APP-007 on hold?" answered by AI from the ledger; the chat's update and what-if answers come from the rules engine either way.

---

## 7. Tests

- **75 unit tests, all passing** (Vitest, 4 files, about 0.2 s).
- Engine (46): same-pin rule, occupied pin, contested pins and the reviewer's call, capacity = min(slots, free pins), waitlist order, blank open slots, each "Hold: info needed" trigger, rescaling with and without a financial profile, liabilities as flag only, size bands, percent rank, launch timing never scored, manual status changes (including a manual Good to go reserving its pin), dirty files (blanks, text in number columns, duplicate IDs, pins as text, Indian number formats, rupees vs lakh, the template example row), the 30-applicant trap file, site details never scored, chat updates and what-ifs parsed without AI.
- Onboarding (7): paperwork gate, Day 0, blank durations, phase order, check-ins from soft launch or Day 0, payments, email template has no invented money terms.
- Demo onboarding (3): demo stores are Good to go applicants, two running and one awaiting paperwork, no money terms.
- Guardrails (19 cases in 6 tests): gaming, pricing, prompt injection, off-topic refused; on-topic allowed; brand answers from verified facts.
- Browser checks (Playwright, not part of the unit tests): run against the live site after each deploy; this report's run had zero errors.

---

## 8. Changes and additions beyond the original build prompt

| Change | Reason |
|---|---|
| Supabase replaced by Neon Postgres; file uploads via Vercel Blob (not configured); franchisee "account" is a database record, no login system | Team decision to use Neon |
| AI provider switched to Gemini (key rotation), OpenRouter kept as backup | OpenRouter account guardrails blocked every model |
| Go Colors branding across the whole app (light base, dark toggle, logo, four-colour stripe, Montserrat, condensed titles, pink buttons); name "Go Colors Franchise Engine" | Team wanted the tool to look like it belongs to Go Colors |
| Welcome page with a brand intro animation; Today dashboard moved to `/today` | Team wanted a branded first page |
| Demo data (30 made-up applicants + 3 onboarding stores) loads automatically on first visit, with a "Demo data" note | An empty app was too blank to review |
| Onboarding as a Gantt chart and task board across all stores, colour per store, labelled by store name | A plain list was hard to follow |
| Chat applies plain-language updates with before/after and Undo, answers overview questions, and refuses off-topic, pricing and "how to pass" questions; Go Colors facts with sources | Updates must change decisions without AI; chat must stay on task and not invent |
| Site details: frontage, visibility, monthly rent asked and recorded, not scored | Team asked for these questions |
| Guide page with glossary; plain-language explanations on every screen | Every term must be understandable on the page |
| Full re-audit with two independent reviewers: fixed a manual "Good to go" that could break the one-store-per-pin rule, a financial profile that could lower a score, traffic lights not matching "top third", notes contradictions without AI, the template example row, Indian number formats, stale AI ratings after re-upload, timezone dates, a paperwork gate that could shift Day 0, upload and tab-sync issues, and more | Bugs and gaps found in the audit |
| Area type removed | Team decision |
| Section 3.5 "Area type" profile matching dropped; profiles match on country, zone, state, city | Follows the removal above |

Full dated list: `CLAUDE.md`, section 9 (Change Log).

---

## 9. Known gaps, unverified items and what a judge could break

- **Map: NOT BUILT.**
- **Area snapshot:** no Google Maps key, so it always shows "not available". The Google path is untested.
- **File storage for paperwork:** not configured; only the file name is kept.
- **Email sending:** not configured; drafts are preview only.
- **People research for real people:** UNVERIFIED (only tested on made-up names, which returned "Nothing found").
- **AI variability:** with AI on, business-relevance ratings can shift scores and, at the margin, which applicant gets a slot. The rules (one store per pin, capacity) do not change.
- **Updates in chat assume "rented"** if a sentence says a space was found without saying owned or rented, and say so in the answer.
- **The chat's language understanding without AI is pattern-based.** Unusual phrasing of an update ("APP-009 bagged a nice spot downstairs") may not be recognised and gets a ledger answer instead.
- **Per-browser data:** each browser has its own workspace (saved to the database too). Two judges never see each other's changes; clearing browser data starts again from the demo.
- **Rate and cost limits** (AI per visitor, Google daily cap) are counted per server instance, not globally.
- **Things a judge could do that change results:** editing Settings (weights, checks) or manual status changes re-run every decision; "Reset to defaults" restores the defaults. Uploading a file replaces the demo data, including the demo onboarding stores.
- **Template example row:** if a judge's file keeps the template's grey example row and adds real rows below, the example is skipped (and listed in the validation report).

---

## 10. Timings (live site)

| Action | Time |
|---|---|
| "Load sample data" (template, 1 applicant): click to validation report shown, including downloading the file | about 0.4 s |
| Upload of the 30-applicant file: choosing the file to validation report shown (parsing and all decisions run in the browser) | about 0.06 s |
| Welcome page to usable, including the intro animation | about 4.4 s (skippable) |
| AI relevance ratings and explanations | arrive a few seconds after loading, in the background; the results never wait for them |

---

## Screens (`deliverables/screens/`, 1440x900, live site)

Screens 01 to 19 show the auto-loaded demo data (30 made-up applicants, 3 onboarding stores). Screens 14, 20, 21 and 22 show the case template after "Load sample data".

| File | Shows |
|---|---|
| 01-home.png | Welcome page |
| 02-results.png | Applicants, card view |
| 02b-results-table.png | Applicants, table view |
| 03-applicant-detail.png | Applicant page (APP-025) with score bars and rescale note |
| 04-why-ledger.png | "Why?" reason ledger (APP-025) |
| 05-contested.png | Contested pins board |
| 06-territory.png | Territories |
| 07-settings.png | Settings |
| 08-chat.png | Chat with why, what-if, update and refusals |
| 09-onboarding-gate.png | Store page awaiting paperwork (APP-005): gate, deal terms, Start onboarding disabled |
| 10-gantt.png | Onboarding Gantt chart, all stores |
| 11-map-or-area.png | Area snapshot ("not available") and people research ("Nothing found") |
| 12-task-board.png | Onboarding task board |
| 13-today.png | Today dashboard |
| 14-upload-sample-loaded.png | Upload page after "Load sample data" |
| 15-guide.png | Guide |
| 16-franchisee-preview.png | Preview as franchisee |
| 17-intro-animation.png | Intro animation frame |
| 18-questions-site-details.png | Questions to ask and site details |
| 19-activity.png | Activity log |
| 20-results-sample-data.png | Applicants after "Load sample data" |
| 21-territory-sample-data.png | Territory view after "Load sample data" |
| 22-applicant-sample-data.png | APP-001 after "Load sample data" |

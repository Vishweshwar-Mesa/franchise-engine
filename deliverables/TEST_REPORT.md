# Test report

Run 2026-10-26T18:08:44.288Z against http://localhost:3123. Three cases in parallel, each in a fresh browser context with its own session; 90 s cap per case. Report only; nothing was fixed.

## Summary

| Case | Result | Seconds |
|---|---|---|
| case1: Clean approvals + onboarding (Kannada) | PASS 16 · FAIL 0 · MISMATCH 0 · NOT BUILT 0 · SKIPPED-TIMEOUT 0 | 7.0 |
| case2: Capacity, waitlist, Hindi, rescaling | PASS 17 · FAIL 0 · MISMATCH 0 · NOT BUILT 0 · SKIPPED-TIMEOUT 0 | 3.8 |
| case3: Rejections, holds, mismatches, contested pin (AI blocked) | PASS 21 · FAIL 0 · MISMATCH 1 · NOT BUILT 1 · SKIPPED-TIMEOUT 0 | 3.2 |

Total run time: **9.0 s** (includes the unit tests). Unit tests (npm test): **Tests  95 passed (95)**.

### Fix first

1. **case3 · Area snapshot: reference only, fails soft** (MISMATCH): expected Counts of nearby places, labelled reference only; actual Area data: not available (Google Maps key not configured); label shown: true

## case1: Clean approvals + onboarding (Kannada)

| # | Step | Status | Expected | Actual | s | Screenshot |
|---|---|---|---|---|---|---|
| 1 | Load sample data + validation report | PASS | Sample loads and a validation report shows rows read | Read 1 applicants, 1 territories, 10 existing stores. Sheets: Applications, Territories, Existing stores, Allowed values, Field guide, Glossary. | 0.3 |  |
| 2 | Upload case file | PASS | 2 applicants, 1 territory, 10 stores read | Read 2 applicants, 1 territories, 10 existing stores. Sheets: Applications, Territories, Existing stores, Allowed values, Field guide, Glossary. (template example row skipped and reported) | 0.1 |  |
| 3 | APP-101 and APP-102 Good to go | PASS | Both Good to go | APP-101: Good to go; APP-102: Good to go | 0.2 |  |
| 4 | Reason ledger + next steps for both | PASS | Each has a reason and next steps | APP-101 reason: "Meets every check; ranked 1 of 2 in TER-01, slot 1 of 3." \| next: "Review the ledger and confirm. Confirming moves the applicant to 'Awaiting paperwork'. \| A" | 0 |  |
| 5 | Hard rule from export | PASS | No pin given to two stores; none on an existing store's pin | Good to go pins: 570001, 570002; duplicates: none; on store pins: none | 0 |  |
| 6 | Chat answers 'why' from the ledger | PASS | Answer cites APP-102's ledger status/reason | APP-102 has status "Good to go" because: "Meets every check; ranked 2 of 2 in TER-01, slot 2 of 3." with a total score of 36.9. \| Answered by: AI | 5.3 |  |
| 7 | Financial profile + liabilities: flag shown, score/status unchanged | PASS | Liabilities flag shown; score and status unchanged | flag: yes; status Good to go; score 100 -> 100; financial: 20/20 (green) | 0.3 |  |
| 8 | Confirm -> Awaiting paperwork, onboarding NOT started, Start locked | PASS | Stage Awaiting paperwork; timeline not started; Start onboarding locked | Start locked: true; 'Timeline starts after paperwork is complete' shown: true | 0.2 |  |
| 9 | Tick gate with dates -> Day 0 = last date, Start unlocks | PASS | Day 0 = 2026-10-24 and Start onboarding unlocked | Day 0 text shown; Start enabled: true | 0.1 |  |
| 10 | Deal terms all blank, 'pin code of this store' label | PASS | All deal fields blank; label 'Pin code of this store' | 12 fields, non-blank: 0; label present: true | 0 |  |
| 11 | Gantt phases with 'set duration', no preset durations | PASS | 4 phases, durations blank with 'set duration' | durations: dur-stock=blank, dur-pos=blank, dur-training=blank, dur-softLaunch=blank; phases shown: 4/4 | 0 |  |
| 12 | Every task has 'Why this task?' | PASS | Every generated task shows 'Why this task?' | 8 'Why this task?' lines for 8 timeline tasks | 0 |  |
| 13 | Preview as franchisee opens with no login | PASS | Franchisee view, no login | Welcome page shown; login/paywall text: no | 0.2 |  |
| 14 | Email preview in Kannada, nothing sent | PASS | Draft in Kannada; preview only | Kannada script: true; preview-only note: true; by: Written by AI in Kannada | 0.3 |  |
| 15 | No login/paywall/rate-limit text | PASS | None | checked current page body | 0 |  |
| 16 | No uncaught console errors | PASS | 0 errors | 0 errors | 0 |  |

## case2: Capacity, waitlist, Hindi, rescaling

| # | Step | Status | Expected | Actual | s | Screenshot |
|---|---|---|---|---|---|---|
| 1 | Upload case file | PASS | 2 applicants, 1 territory, 10 stores | Read 2 applicants, 1 territories, 10 existing stores. Sheets: Applications, Territories, Existing stores, Allowed values, Field guide, Glossary. | 0.3 |  |
| 2 | Capacity = min(1 slot, 3 free pins) = 1 | PASS | Capacity 1 | Capacity = min(1 open slots, 3 free pins) = 1 | 0.1 |  |
| 3 | APP-201 Good to go, APP-202 Waitlist | PASS | APP-201 Good to go; APP-202 Waitlist | APP-201: Good to go; APP-202: Waitlist (position 1) | 0.2 |  |
| 4 | Waitlist order needs a human confirm | PASS | Recommended order + Confirm button; confirmation recorded | Confirm order clicked; 'Confirmed <time>' shown | 0.2 |  |
| 5 | Hard rule from export | PASS | No pin given to two stores; none on an existing store's pin | Good to go pins: 580001; duplicates: none; on store pins: none | 0 |  |
| 6 | 'Financial profile: not provided' banner + rescale 50/25/25 | PASS | Banner shown; weights 50/25/25 | banner: true; weights 50/25/25; financial: not provided | 0.2 |  |
| 7 | APP-201 explanation/training plan in Hindi | PASS | Explanation and training plan in Hindi (Devanagari) | Devanagari text: true; label: Written by AI from the ledger, in Hindi | 1.8 |  |
| 8 | Enter financial profile -> banner gone, weights 40/20/20/20 | PASS | Banner disappears; weights 40/20/20/20 | banner still shown: false; weights 40/20/20/20; financial column: "20/20 (green)" | 0.1 |  |
| 9 | Settings: change a size band -> results change; profile named | PASS | Score changes; explanation names the profile | score 100 -> 90; Space 32/40 (green); profile used: Default (Karnataka) | 0.3 |  |
| 10 | Reset to defaults | PASS | Score back to default value | score now 100 (default 100) | 0.2 |  |
| 11 | Chat what-if: before/after, real data unchanged | PASS | Before/after shown; APP-202 unchanged until confirmed | answer: What-if for APP-202, re-run on a copy (nothing changed yet): \| Answered by: Ledger template \| Change (copy only): Space size (sq ft) = 700 \| Before \| Waitlist Why? \| Score 34.4/100 \| Qualified, but TE \| APP-202 still: Waitlist | 0.2 |  |
| 12 | Traffic lights by default + total toggle | PASS | Four factor dots per applicant by default; toggle shows total /100 | 8 dots for 2 applicants; total shown after toggle | 0.1 |  |
| 13 | Export XLSX downloads | PASS | XLSX file | franchise-results.xlsx | 0.1 |  |
| 14 | Export CSV has status, reason, next steps | PASS | Columns present | Status, Reason, Next steps | 0 |  |
| 15 | Settings: Case rule locked, Our choice editable | PASS | Case rules shown locked (no inputs); Our choice inputs editable | locked section: true; inputs in it: 0; Our choice editable: true | 0 |  |
| 16 | No login/paywall/rate-limit text | PASS | None | checked current page body | 0 |  |
| 17 | No uncaught console errors | PASS | 0 errors | 0 errors | 0 |  |

## case3: Rejections, holds, mismatches, contested pin (AI blocked)

| # | Step | Status | Expected | Actual | s | Screenshot |
|---|---|---|---|---|---|---|
| 1 | Upload dirty file: no crash, duplicate flagged | PASS | Duplicate APP-301 flagged in the validation report; no crash | Read 9 applicants, 1 territories, 10 existing stores. Sheets: Applications, Territories, Existing stores, Allowed values, Field guide, Glossary.; duplicate flagged: true | 0.3 |  |
| 2 | Dirty data tolerated (pin '590 002', text in experience) | PASS | Row read; pin normalised; experience text reported as a fix | pin 590002; status Hold: info needed; fixes: 'Retail experience (years)' should be a number but reads 'five years'. Correct it. | 0.3 |  |
| 3 | APP-301 Hold: pin occupied (not a rejection; another pin/takeover) | PASS | Hold: pin occupied, worded as not a rejection, with another pin/takeover options | Hold: pin occupied \| Pin 590001 already has store ST-10. The profile may be good, but this pin is not recommended. \| A different pin with no store. Free pins in TER-03: 590002, 590003. \| A takeover of the existing store on this pin (an option for a human to consider). \| Discuss another pin or a possible takeover with the applicant. This is not a rejection. \| Rate the relevance of the applicant's business (or wait for the AI rating). | 0 |  |
| 4 | APP-302 + APP-303 Needs your decision | PASS | Both Needs your decision | APP-302: Needs your decision; APP-303: Needs your decision | 0 |  |
| 5 | APP-304 (Belagavi, pin 560001) Hold: info needed | PASS | Hold: info needed (prefix mismatch) | Hold: info needed \| Information needed: Pin 560001 does not start with 590, the prefix for Belagavi. Check the city or the pin. (+1 more) Pin 560001 also has store ST-01, so a different pin will be needed too. \| fixes: Pin 560001 does not start with 590, the prefix for Belagavi. Check the city or the pin. \| No territory lists pin 560001, so there is no slot to fill. Confirm the pin, or ask whether the brand wants to open this area. | 0 |  |
| 6 | APP-305 (no territory) Hold | PASS | Hold (no territory covers 572999) | Hold: info needed \| Information needed: No territory lists pin 572999, so there is no slot to fill. Confirm the pin, or ask whether the brand wants to open this area. | 0 |  |
| 7 | APP-306 (no space) Hold | PASS | Hold (no space) | Hold: info needed \| Information needed: No space yet. Ask the applicant to identify a space (tenure, size, floor) before this can move forward. | 0 |  |
| 8 | APP-307 (investment blank) Hold with fix list | PASS | Hold with a fix list naming the investment | Hold: info needed \| fixes: Fill in: Investment capacity (₹ lakh). | 0 |  |
| 9 | APP-308 (no space + 600 sq ft) Hold with contradiction | PASS | Hold with a contradiction flag | Hold: info needed \| fixes: No space yet. Ask the applicant to identify a space (tenure, size, floor) before this can move forward. \| Space is 'Not yet identified' but a size of 600 sq ft is given. Confirm which is right. | 0 |  |
| 10 | Hard rule from export | PASS | No pin given to two stores; none on an existing store's pin | Good to go pins: none; duplicates: none; on store pins: none | 0 |  |
| 11 | No automatic Reject anywhere | PASS | No Reject / Not proceeding set automatically | Hold: pin occupied, Needs your decision, Hold: info needed | 0 |  |
| 12 | Contested board: side by side, tool does not pick, notes + Reviewer's call | PASS | Both shown, nothing picked by the tool; call applies; notes saved | cards 2; default call 'Undecided'; after picking APP-302: APP-302 Good to go, APP-303 Hold: pin occupied; notes kept: true | 0.6 |  |
| 13 | Not proceeding: blocked without reason, allowed with reason, logged, in ledger | PASS | Save blocked with no reason; allowed with reason; logged; shown in ledger | blocked without reason: true; ledger reason shown; logged: true | 0.3 |  |
| 14 | AI unavailable: template explanation, no errors | PASS | Template explanation shown | 'Template from the ledger (English)' shown with AI requests answering 'not available' | 0.1 |  |
| 15 | Why? opens ledger with Case rule / Our choice tags | PASS | Both tags in the ledger | case rule: true; our choice: true | 0.1 |  |
| 16 | Area snapshot: reference only, fails soft | MISMATCH | Counts of nearby places, labelled reference only | Area data: not available (Google Maps key not configured); label shown: true | 0.1 | deliverables/test-screens/case3-16.png |
| 17 | People research: reviewer-only, consent line, unverified | PASS | Consent line; disabled until consent; results marked unverified | consent line: true; disabled before consent: true; result (AI blocked): Not available (AI web search is not configured or failed). | 0.2 |  |
| 18 | Map / 'View on Google Maps' link | NOT BUILT | Map or 'View on Google Maps' link on pins | No map view or maps link exists | 0 |  |
| 19 | Results: status counts, filters, search | PASS | Holds chip shows all holds; search finds 1; status count tiles match | holds chip: 6 (expected 6); search APP-304: 1; tile: Hold: info needed 6 (expected 6) | 0.7 |  |
| 20 | Territory view | PASS | TER-03 capacity min(2, 2 free pins) = 2 | Capacity = min(2 open slots, 2 free pins) = 2 | 0.1 |  |
| 21 | Chat says 'that isn't in the data' | PASS | "That isn't in the data." | That isn't in the data. \| Answered by: Ledger template | 0.4 |  |
| 22 | No login/paywall/rate-limit text | PASS | None | checked current page body | 0 |  |
| 23 | No uncaught console errors | PASS | 0 errors | 0 errors | 0 |  |

## How to re-run

`npm run test:e2e` (live site) or `BASE_URL=http://localhost:3000 npm run test:e2e`. Workbooks are generated into tests/e2e/out/ from data/template.xlsx.

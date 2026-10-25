> **MANDATORY: Any AI agent or person (Claude Code, Codex, Cursor, Copilot, or any other tool) that reads this file and then changes code, config, database schema, or environment variables in this repo MUST update this file in the same commit: add a dated entry to the Change Log, and update any other section that is no longer true. A change without an updated context file is incomplete. Do not delete past Change Log entries; add new ones at the top.**

# Franchise Partner Engine: project context

## 1. Project

- **What:** Franchise partner acquisition, geo-selection and onboarding engine. MESA "Ops Hackathon", Case 1.
- **Team:** Namratha Reddy, Vishweshwar.
- **Deadline:** not set in this file yet (add it).
- **Demo brand:** Go Colors (Go Fashion (India) Ltd), presented as *a scenario of Go Colors scaling through franchise partners*, never as published Go Colors franchise terms.
- **Live URL:** https://franchise-engine-psi.vercel.app (public production alias; the `*-vishu-mesa.vercel.app` URLs are behind Vercel auth).
- **GitHub:** https://github.com/Vishweshwar-Mesa/franchise-engine
- **Vercel project:** `franchise-engine` (team `vishu-mesa`).
- **Supabase project ref:** not connected yet. The app runs fully on browser storage until it is (see section 8).

## 2. Ground rules

1. No invented facts, numbers, laws, fees or durations. Gaps stay blank and editable ("not set") or say "not available".
2. General reference material only from official sources (government portals, the brand's own pages). Otherwise: "confirm with the brand's legal/CA team", no number.
3. Only the Go Colors facts in section 4 may be used.
4. The deployed link works with no login, no paywall, no rate limit. Every external dependency (AI, Supabase, Google, email) has a fallback; the page never shows an error.
5. **AI never changes a check, a score or a status.** The engine always wins. AI output is Zod-validated and only rewrites ledger content, rates business relevance (reviewer can override), or flags possible contradictions (applied only if the reviewer confirms).
6. Secrets are never committed. `.env.example` lists names only.
7. Keep it simple; UI is plain shadcn/ui, logic stays out of components (a designer will restyle).

## 3. Architecture

```
data/template.xlsx                 Judges' input format (Case1_Franchise_Test_Data_Format.xlsx)
public/samples/                    template.xlsx copy + demo-messy.xlsx (synthetic, 30 applicants with traps)
scripts/make-demo-file.ts          Regenerates the demo file (npm run samples)
scripts/check-context.sh           Warns when code changes without CLAUDE.md (pre-commit hook + CI)
supabase/migrations/               Versioned SQL schema (never edit only in the dashboard)
src/lib/types.ts                   Data types (Application, Territory, Store, ReviewerInput, ...)
src/lib/parse.ts                   Excel parser: headers by name, tolerant, never throws; validation report
src/lib/settings.ts                Scoring defaults, rubric profiles, zone mapping, profile picker
src/lib/engine.ts                  THE decision engine (deterministic) -> reason ledger per applicant
src/lib/engine.test.ts             Vitest unit tests (engine + parser + demo file)
src/lib/explain.ts                 Template explanations/training plan/chat answers/what-if parser (AI fallbacks)
src/lib/whatif.ts                  What-if: re-run engine on a copy, before/after + knock-on changes
src/lib/export.ts                  CSV/XLSX export
src/lib/onboarding.ts              Group 2 model: paperwork gate, deal terms, timeline (Gantt) builder
src/lib/ai-schemas.ts              Zod schemas for every AI response
src/lib/server/openrouter.ts       OpenRouter call; returns null on any failure; caches in Supabase ai_cache
src/lib/server/supabase.ts         Service-role client or null when not configured
src/lib/sync.ts                    Browser <-> Supabase mirror via /api/state (silent on failure)
src/store/workspace.ts             Zustand store, persisted to localStorage, one per browser session id
src/hooks/use-results.ts           Runs the engine over the store (memoised)
src/app/api/*                      status, state, ai/assess, ai/explain, ai/chat, ai/email, upload, franchisee-account, email/send
src/app/*/page.tsx                 Screens: / (upload), /results, /applicant/[id], /territories, /contested, /onboarding, /onboarding/[id], /franchisee/[id] (no-login preview), /settings, /activity
src/components/app/*               Small presentational components (designer can restyle)
src/components/ui/*                shadcn/ui (Base UI flavour)
```

Flow: Excel -> `parseWorkbook` (browser) -> store -> `runEngine` -> **ledger** -> every screen, the explanations, the export and the chat read only the ledger. AI routes receive ledger data only. Supabase mirrors the store when configured.

`AGENTS.md` starts with a pointer to this file; below it Next.js keeps its own managed block (re-added by `next dev`).

## 4. Decisions and why

| Decision | Tag | Why |
|---|---|---|
| Never two stores in one pin: existing store -> Hold: pin occupied (not a rejection; suggests another pin or a takeover for a human) | Case rule | Case file |
| Two+ qualified applicants on one free pin -> Needs your decision; tool never picks | Case rule | Case file + "human decides" |
| Capacity = min(open slots, free pins); beyond -> Waitlist; contested pin holds one slot until decided | Case rule (limit) | Case file |
| Blank/non-numeric Open slots treated as 0 | Our choice | Never guess a capacity |
| No automatic Reject / Approve; "Good to go" is a recommendation | Our choice | Prompt |
| Required fields = Field guide's "Yes" columns | Our choice | Template |
| Hold: info needed on: missing required field, text in number column, pin not 6 digits, pin prefix vs city mismatch, city not in Allowed values, no territory covers pin, no space yet, contradictions (no space + size/floor given, state vs city), AI-flagged note contradiction only after reviewer confirms | Our choice | Prompt 3.3; AI must not change status by itself |
| Pin occupied takes precedence over info holds (other fixes still listed) | Our choice | The pin is the more fundamental block |
| Duplicate Application ID: first row kept, later rows skipped and reported | Our choice | Prompt: dedupe and flag |
| Blank Application ID: row kept as `ROW-<n>` and held for info | Our choice | Never drop data silently |
| Pin covered by 2 territories: first territory in the file, flagged | Our choice | Not specified |
| Missing Existing stores / Allowed values sheet: fall back to the case file's fixed lists | Our choice | Case says these are fixed |
| Space 40 = tenure 10 + size 20 + floor 10; Owned 1.0 / Rented 0.75; small 0.25 / medium 0.6 / preferred 1.0; Ground 1, Mall 1, Upper 0.5, Not known 0.2 | Our choice (placeholder) | Prompt asks for an editable placeholder split; bands from Go Colors statements |
| Experience 20 = years 14 (relative) + business relevance 6 (High 1 / Medium 0.5 / Low 0) | Our choice | Prompt: years + AI-rated relevance |
| Unrated relevance (no AI, no override) scores 0 | Our choice | No guessing; reviewer can rate |
| Financial 20 = net worth 10 + portfolio 10, relative among applicants who have them | Our choice | Prompt |
| Relative factors use percent rank among applicants in the file; alone = 0.5 | Our choice | Prompt: "compared with the other applicants" |
| Traffic lights: share >= 2/3 green, >= 1/3 amber, else red (applied to all four factors) | Our choice | Prompt: thirds |
| Financial blank -> rescale others to 100 (50/25/25) with banner | Our choice | Prompt |
| Liabilities = flag only | Our choice | Prompt |
| Waitlist / slot order: total score desc, ties by Application ID | Our choice | Deterministic and explainable |
| Territory priority and launch timing not scored; launch note only if a limit is set (blank default) | Our choice | Prompt |
| Contested pin: only "qualified" applicants (no holds) contest a pin | Our choice | A held applicant can't take the pin anyway |
| Reviewer's call: winner competes for a slot by score; others -> Hold: pin occupied ("reviewer gave this pin to X") | Our choice | One store per pin |
| Manual status change: reason required, logged; takes the applicant out of the automatic pool; a manual Good to go takes a slot first | Our choice | Reviewer can change any status |
| Zones = MHA Zonal Councils | Our choice | Official grouping; only used to match profiles |
| Profile specificity: country 1, zone 2, state 4, city 8, area type 16; ties -> earlier profile | Our choice | "Most specific wins" |
| Per-browser session id, data in localStorage, mirrored to Supabase when configured | Our choice | No login; judges don't overwrite each other |
| AI assessment runs once per loaded file in the background, max 100 applicants, 25 per call | Our choice | Bounded cost, never blocks the table |
| Explanations: template shown at once; AI rewrite (applicant's language) cached per ledger-entry hash | Our choice | Works without AI; AI only rewrites |
| Chat: local what-if parser first (no AI needed), then AI, then ledger template answers | Our choice | Always works |
| xlsx from SheetJS CDN 0.20.3 (not npm 0.18.5) | Our choice | npm version has known advisories |
| `cacheComponents` turned off in next.config | Our choice | All screens are per-browser client pages |
| Confirm Good to go -> stage "Awaiting paperwork" (a stage, not a status) | Prompt | Confirming never starts onboarding |
| Paperwork gate: agreement, GST, other registrations (free-text list); each ticked + dated, optional upload; "confirm with the brand's legal/CA team"; only link: https://www.gst.gov.in/ (verified 2026-10-25: official "Goods & Services Tax (GST) Home", has "Register") | Prompt | No legal/tax advice, no numbers |
| Day 0 = latest gate date; Start onboarding disabled until all three ticked and dated | Prompt | |
| Deal terms, payment schedule, phase durations all blank; blank duration shows "set duration" and stops placement of later phases | Our choice | No official durations exist |
| Phases in order: stock arrival, POS set-up, training, soft launch; payments placed by "due days after Day 0" | Our choice | Prompt lists them; order is ours |
| Check-ins count from soft-launch date by default (Settings can switch to Day 0) | Our choice | "Check-ins review how the open store is doing, so they count from opening, not from paperwork." |
| Franchisee account = Supabase Auth admin createUser, no email sent; "Preview as franchisee" needs no login | Our choice | Judges never hit a wall |
| Email: AI draft in applicant's language (English template fallback); real send only via Resend to REVIEWER_EMAIL, never to the applicant | Prompt | |
| Paperwork files: private Supabase Storage bucket `paperwork`; without Supabase only the file name is kept | Our choice | |

Go Colors facts allowed (from official filings/investor material): 802 EBOs at 31 Mar 2026; ~195 cities, 23 states/UTs; average EBO ~540 sq ft, newer 700+ sq ft; management: stores under ~400 sq ft can't display the full range, overlapping catchments/cannibalisation, shift from "availability of space" to "quality of location and lease"; stores above 700 sq ft grew faster in Q1 FY27. Franchise-enquiry form asks name, address, state, district, 6-digit pin, email, mobile, store location yes/no, optional carpet area, image. No published fee, royalty, deposit or onboarding steps.

## 5. Statuses and scoring (as implemented)

Statuses: Good to go · Needs your decision · Hold: info needed · Hold: pin occupied · Waitlist · Not proceeding (manual only, reason required).
Score: Space 40 / Money 20 / Experience 20 / Financial profile 20 (rescaled to 50/25/25 when financial profile is blank). All numbers live in `src/lib/settings.ts` `DEFAULT_PROFILE` and are editable on /settings. Checks that can be switched off: hold when no space, pin-prefix check, contradiction checks.

## 6. Environment variables (names only)

| Name | Purpose |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key (reserved; tables are service-role only) |
| SUPABASE_SERVICE_ROLE_KEY | Server-side DB/Storage/Auth admin |
| OPENROUTER_API_KEY | AI calls |
| OPENROUTER_MODEL | AI model id (no default in code; AI is off without it) |
| GOOGLE_MAPS_API_KEY | Group 3 area snapshot |
| RESEND_API_KEY | Optional: send a test copy of the confirmation email |
| REVIEWER_EMAIL | Optional: the only address emails are ever sent to |
| EMAIL_FROM | Optional: sender (defaults to Resend's test sender) |

## 7. Run, test, build, deploy, roll back

- `npm install` (also sets the git hook path `.githooks`), `npm run dev`, `npm test`, `npm run build`, `npm run samples` (regenerate demo file).
- Deploy: push to `main` -> Vercel production. Other branches/PRs -> preview URLs. Never push code that fails `npm test` or `npm run build`.
- Roll back: Vercel dashboard "Promote" an earlier deployment, or `git revert` and push. Release tags: `group-1`, `group-2`, `group-3`.
- Database: apply `supabase/migrations/*.sql` in order (Supabase SQL editor or `supabase db push`).
- Live URL: https://franchise-engine-psi.vercel.app
- Vercel <-> GitHub auto-deploy: `vercel git connect` failed (the Vercel GitHub App is probably not installed on the GitHub account). Until it is, deploy with `vercel deploy --prod` after pushing.

## 8. Known gaps and unverified items

- Supabase is not connected yet: sync, AI cache, uploads and franchisee accounts are untested against a real project; the app uses browser storage.
- AI (OpenRouter) has not been tested with a real key/model; only the no-key fallback path is verified.
- Email sending (Resend) untested: no key configured; preview-only path verified.
- Vercel Git integration not connected (see section 7).
- Without AI, business relevance is "not rated" (0 of 6 points) until the reviewer rates it, and explanations/training plans are English templates.

## 9. Change Log (newest first)

`YYYY-MM-DD | who/which tool | what changed | why | files touched | follow-ups`

- 2026-10-25 | Claude Code (Opus 5.5) | Group 2 onboarding: confirm -> Awaiting paperwork, paperwork gate with uploads, deal terms + payment schedule, franchisee account + no-login preview, email draft (AI/template, reviewer-only send), Gantt + checklist with Why lines; 7 onboarding tests; aria-labels on checkboxes | Prompt section 6 | src/lib/onboarding*.ts, src/components/app/{confirm-button,paperwork-gate,deal-terms-form,franchisee-account,email-draft,onboarding-gantt}.tsx, src/app/{onboarding,franchisee}, src/app/api/{upload,franchisee-account,ai/email,email/send}, .env.example | Configure Resend if real test sends are wanted

- 2026-10-25 | Claude Code (Opus 5.5) | First production deploy (CLI); recorded live URL; noted Git auto-deploy not connected | Delivery chain | CLAUDE.md | Install Vercel GitHub App, then `vercel git connect`

- 2026-10-25 | Claude Code (Opus 5.5) | Group 1 first build: Next.js 16 + Tailwind + shadcn/ui scaffold; Excel parser; deterministic engine with reason ledger; 28 unit tests; synthetic demo file; screens (upload, results, applicant detail, territories, contested pins, settings, activity, chat with what-if); AI routes with fallbacks; Supabase migration + sync (not yet connected); context file, pre-commit hook and CI check | Hackathon build, prompt sections 0-5, 8, 10 | all files | Connect Supabase via MCP; set OPENROUTER_* in Vercel; Group 2

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
- **Database:** Neon Postgres (created via the Vercel Marketplace integration, resource `franchise-engine-db`; sets `DATABASE_URL`). Files: Vercel Blob (private). Supabase was dropped on 2026-10-25. The app runs fully on browser storage when `DATABASE_URL` is missing (see section 8).

## 2. Ground rules

1. No invented facts, numbers, laws, fees or durations. Gaps stay blank and editable ("not set") or say "not available".
2. General reference material only from official sources (government portals, the brand's own pages). Otherwise: "confirm with the brand's legal/CA team", no number.
3. Only the Go Colors facts in section 4 may be used.
4. The deployed link works with no login, no paywall, no rate limit. Every external dependency (AI, Neon, Vercel Blob, Google, email) has a fallback; the page never shows an error.
5. **AI never changes a check, a score or a status.** The engine always wins. AI output is Zod-validated and only rewrites ledger content, rates business relevance (reviewer can override), or flags possible contradictions (applied only if the reviewer confirms).
6. Secrets are never committed. `.env.example` lists names only.
7. Keep it simple; UI is plain shadcn/ui, logic stays out of components (a designer will restyle).

## 3. Architecture

```
data/template.xlsx                 Judges' input format (Case1_Franchise_Test_Data_Format.xlsx)
public/samples/                    template.xlsx copy + demo-messy.xlsx (synthetic, 30 applicants with traps) + demo-showcase.xlsx (synthetic, 10 applicants for the demo workspace)
src/lib/demo-workspace.ts          Pre-filled demo workspace on demo-showcase.xlsx (reviewer inputs, contest notes, 2 onboarding records)
src/lib/load-demo.ts               Loads it; Providers auto-loads it on a first visit with no saved data
scripts/make-demo-file.ts          Regenerates the demo file (npm run samples)
scripts/check-context.sh           Warns when code changes without CLAUDE.md (pre-commit hook + CI)
db/migrations/                     Versioned SQL schema for Neon; apply with `npm run db:migrate` (never edit only in the dashboard)
scripts/migrate.ts                 Applies db/migrations/*.sql once each (table schema_migrations)
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
src/lib/server/openrouter.ts       OpenRouter call; returns null on any failure; caches in Neon ai_cache
src/lib/server/db.ts               Neon HTTP client (`@neondatabase/serverless`) or null when DATABASE_URL is missing
src/lib/sync.ts                    Browser <-> Neon mirror via /api/state (silent on failure)
src/store/workspace.ts             Zustand store, persisted to localStorage, one per browser session id
src/hooks/use-results.ts           Runs the engine over the store (memoised)
src/app/api/*                      status, state, ai/assess, ai/explain, ai/chat, ai/email, ai/research, upload, franchisee-account, email/send, area
src/app/*/page.tsx                 Screens: / (upload), /results, /applicant/[id], /territories, /contested, /onboarding, /onboarding/[id], /franchisee/[id] (no-login preview), /settings, /activity
src/components/app/*               Small presentational components (designer can restyle)
src/components/ui/*                shadcn/ui (Base UI flavour)
```

Flow: Excel -> `parseWorkbook` (browser) -> store -> `runEngine` -> **ledger** -> every screen, the explanations, the export and the chat read only the ledger. AI routes receive ledger data only. Neon mirrors the store when configured.

`AGENTS.md` starts with a pointer to this file; below it Next.js keeps its own managed block (re-added by `next dev`).

## 3b. Design (V2 "Warm Editorial", chosen 2026-10-25)

- Dark theme by default, light theme via the button at the bottom of the sidebar (saved in localStorage `fe-theme`; an inline script in `layout.tsx` applies it before paint).
- Colours come from gocolors.com: near-black/off-white base (#121212, #1A1A1A, #FAF9F6), brand magenta #DF2E84. Buttons use #C9246F (the brand magenta deepened so white text passes contrast); magenta text is #F05A9E on dark, #B81E66 on light. Warm neutrals: #1A1715 (dark ground), #F6F1E9 (light ground).
- Status tones are CSS variables `--tone-<good|decide|info|pin|wait|stop>` and `-bg`, traffic lights `--light-green|amber|red`, all in `src/app/globals.css` for both themes. Never hardcode Tailwind colour classes in components; use the tokens.
- Type: Fraunces (serif display: page titles, section titles, big numbers), Inter (body), JetBrains Mono (IDs, pins), via `next/font`.
- Layout: floating dark sidebar (`components/app/nav.tsx`), `PageHeader` / `Panel` in `components/app/page-header.tsx`, rounded-3xl surfaces.
- Motion (GSAP, `components/app/motion.tsx`): count-up on status tiles, staggered fade-in of applicant cards; both off under prefers-reduced-motion (plus a global CSS reduced-motion rule).
- Design exploration (4 versions) is in a private claude.ai canvas: https://claude.ai/artifact/T7nkLboonRceQfV22z4CGF

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
| Per-browser session id, data in localStorage, mirrored to Neon when configured | Our choice | No login; judges don't overwrite each other |
| AI assessment runs once per loaded file in the background, max 100 applicants, 25 per call | Our choice | Bounded cost, never blocks the table |
| Explanations: template shown at once; AI rewrite (applicant's language) cached per ledger-entry hash | Our choice | Works without AI; AI only rewrites |
| Chat: local what-if parser first (no AI needed), then AI, then ledger template answers | Our choice | Always works |
| xlsx from SheetJS CDN 0.20.3 (not npm 0.18.5) | Our choice | npm version has known advisories |
| `cacheComponents` turned off in next.config | Our choice | All screens are per-browser client pages |
| First visit with no saved data auto-loads a synthetic DEMO workspace (10 applicants, every status, 2 in onboarding), with a "Demo workspace" banner; any upload replaces it | Our choice | User found the empty app too blank to review; judges still upload their own file |
| Demo entries: financial profiles, relevance ratings, liabilities note, contest notes, phase durations are demo inputs; fees, royalty, deposit and payment amounts stay blank even in the demo | Our choice | No invented money terms |
| Confirm Good to go -> stage "Awaiting paperwork" (a stage, not a status) | Prompt | Confirming never starts onboarding |
| Paperwork gate: agreement, GST, other registrations (free-text list); each ticked + dated, optional upload; "confirm with the brand's legal/CA team"; only link: https://www.gst.gov.in/ (verified 2026-10-25: official "Goods & Services Tax (GST) Home", has "Register") | Prompt | No legal/tax advice, no numbers |
| Day 0 = latest gate date; Start onboarding disabled until all three ticked and dated | Prompt | |
| Deal terms, payment schedule, phase durations all blank; blank duration shows "set duration" and stops placement of later phases | Our choice | No official durations exist |
| Phases in order: stock arrival, POS set-up, training, soft launch; payments placed by "due days after Day 0" | Our choice | Prompt lists them; order is ours |
| Check-ins count from soft-launch date by default (Settings can switch to Day 0) | Our choice | "Check-ins review how the open store is doing, so they count from opening, not from paperwork." |
| Franchisee account = a record in Neon `franchisee_accounts` (no login system, no email sent); "Preview as franchisee" needs no login | Our choice | Judges never hit a wall; Neon has no built-in auth (Neon Auth is an option later) |
| Email: AI draft in applicant's language (English template fallback); real send only via Resend to REVIEWER_EMAIL, never to the applicant | Prompt | |
| Paperwork files: private Vercel Blob under `paperwork/<session>/<app>/`; without BLOB_READ_WRITE_TOKEN only the file name is kept | Our choice | Neon is database-only |
| Area snapshot: geocode pin (postal_code + country IN), accept only if an address component matches the city (old/new names, e.g. Bangalore/Bengaluru), then Places (New) searchNearby, radius 1500 m, categories schools/colleges/stores/clothing_store (competitors)/restaurants; max 20 per search shown as "20+"; restaurant ratings banded under 4.0 / 4.0-4.4 / 4.5+ | Our choice | Counts only; reference only, never scored |
| Places cache per pin+city (Neon `area_cache`, key `pin|city`; memory fallback); hard daily cap PLACES_DAILY_CAP (default 300 Google calls/day; each lookup = 6 calls); counter in Neon `places_usage` (atomic upsert), else per-server-instance memory | Our choice | Bounded cost, fails soft |
| Area type is NOT pre-filled from the snapshot | Our choice | Any count-to-area-type rule would be invented |
| People research: needs a consent tick, AI web search (OpenRouter web plugin), links labelled "possible match, unverified", kept only in the page (not stored, not in the ledger) | Prompt | Never feeds a decision |

Go Colors facts allowed (from official filings/investor material): 802 EBOs at 31 Mar 2026; ~195 cities, 23 states/UTs; average EBO ~540 sq ft, newer 700+ sq ft; management: stores under ~400 sq ft can't display the full range, overlapping catchments/cannibalisation, shift from "availability of space" to "quality of location and lease"; stores above 700 sq ft grew faster in Q1 FY27. Franchise-enquiry form asks name, address, state, district, 6-digit pin, email, mobile, store location yes/no, optional carpet area, image. No published fee, royalty, deposit or onboarding steps.

## 5. Statuses and scoring (as implemented)

Statuses: Good to go · Needs your decision · Hold: info needed · Hold: pin occupied · Waitlist · Not proceeding (manual only, reason required).
Score: Space 40 / Money 20 / Experience 20 / Financial profile 20 (rescaled to 50/25/25 when financial profile is blank). All numbers live in `src/lib/settings.ts` `DEFAULT_PROFILE` and are editable on /settings. Checks that can be switched off: hold when no space, pin-prefix check, contradiction checks.

## 6. Environment variables (names only)

| Name | Purpose |
|---|---|
| DATABASE_URL | Neon Postgres connection string (set by the Vercel Neon integration) |
| BLOB_READ_WRITE_TOKEN | Vercel Blob store for paperwork uploads (optional) |
| OPENROUTER_API_KEY | AI calls |
| OPENROUTER_MODEL | AI model id (no default in code; AI is off without it) |
| GOOGLE_MAPS_API_KEY | Group 3 area snapshot |
| RESEND_API_KEY | Optional: send a test copy of the confirmation email |
| REVIEWER_EMAIL | Optional: the only address emails are ever sent to |
| EMAIL_FROM | Optional: sender (defaults to Resend's test sender) |
| PLACES_DAILY_CAP | Optional: max Google calls per day (default 300) |

## 7. Run, test, build, deploy, roll back

- `npm install` (also sets the git hook path `.githooks`), `npm run dev`, `npm test`, `npm run build`, `npm run samples` (regenerate demo file).
- Deploy: push to `main` -> Vercel production. Other branches/PRs -> preview URLs. Never push code that fails `npm test` or `npm run build`.
- Roll back: Vercel dashboard "Promote" an earlier deployment, or `git revert` and push. Release tags: `group-1`, `group-2`, `group-3`.
- Database: `vercel env pull .env.local` then `npm run db:migrate` (applies db/migrations/*.sql in order, once each).
- Live URL: https://franchise-engine-psi.vercel.app
- Vercel <-> GitHub auto-deploy: connected (2026-10-25). Every push to `main` deploys to production; other branches get preview URLs.

## 8. Known gaps and unverified items

- Neon: created 2026-10-25 (`franchise-engine-db`), migration 001 applied; session sync verified end to end (30 applicants, ledger and action log saved and read back). AI cache, Places cache/cap and franchisee account records are untested against it.
- The Vercel Neon integration also drops Neon "agent skills" into `.agents/`, `.claude/skills/` and `skills-lock.json`; they are git-ignored (third-party docs, not part of the app).
- AI (OpenRouter) has not been tested with a real key/model; only the no-key fallback path is verified.
- Google Places / Geocoding untested with a real key (only the no-key path verified); the Places type names and field masks follow Google's Places API (New) docs but have not been exercised.
- People research untested with a real model; depends on the OpenRouter web plugin being available for the chosen model.
- Without DATABASE_URL the Places daily cap is per server instance (weak on Vercel).
- Email sending (Resend) untested: no key configured; preview-only path verified.
- Without AI, business relevance is "not rated" (0 of 6 points) until the reviewer rates it, and explanations/training plans are English templates.

## 9. Change Log (newest first)

`YYYY-MM-DD | who/which tool | what changed | why | files touched | follow-ups`

- 2026-10-25 | Claude Code (Opus 5.5) | Demo workspace: 10 synthetic applicants (demo-showcase.xlsx) with reviewer inputs and 2 onboarding records, auto-loaded on first visit + "Load demo workspace" button + banner; 3 tests; fixed Gantt payment bar colour broken by the earlier colour sweep; vitest config uses import.meta.dirname | User wanted something to review | scripts/make-demo-file.ts, public/samples/demo-showcase.xlsx, src/lib/{demo-workspace,load-demo}.ts, demo-workspace.test.ts, store, providers, layout, demo-banner.tsx, upload-panel.tsx, onboarding-gantt.tsx, vitest.config.mts | none

- 2026-10-25 | Claude Code (Opus 5.5) | Created Neon DB via Vercel integration and applied migration 001; fixed sync losing changes on quick reload/close (push on start, 1 s debounce, flush on pagehide/visibilitychange with keepalive); git-ignored Neon agent-skill files | Neon go-live | src/lib/sync.ts, .gitignore, CLAUDE.md | none

- 2026-10-25 | Claude Code (Opus 5.5) | Replaced Supabase with Neon Postgres (`@neondatabase/serverless`, db/migrations + `npm run db:migrate`) and Vercel Blob for paperwork; franchisee account is now a Neon record; /api/status reports `database` and `files`; env vars DATABASE_URL + BLOB_READ_WRITE_TOKEN replace the three Supabase vars; Vercel Git integration now connected | User chose Neon | src/lib/server/db.ts (new), src/lib/server/supabase.ts (removed), supabase/ (removed), db/migrations/001_init.sql, scripts/migrate.ts, src/app/api/{state,upload,franchisee-account,area,status}, openrouter.ts, use-services, providers, sync, franchisee-account.tsx, .env.example, package.json | Create the Neon resource (accept Neon terms on Vercel), run migrations, optionally add a Blob store

- 2026-10-25 | Claude Code (Opus 5.5) | Redesign to V2 Warm Editorial: dark default + light toggle, Go Colors magenta, Fraunces/Inter/JetBrains Mono, floating sidebar, tinted status tiles, applicant cards with inline reason (table view kept), factor bars on applicant page, GSAP count-up and stagger, colour tokens replace hardcoded Tailwind colours | User found the UI bland; picked V2 of 4 directions | src/app/globals.css, src/app/layout.tsx, src/app/**/page.tsx, src/components/app/* (new: theme-toggle, motion, page-header, applicant-list), package.json (gsap) | none

- 2026-10-25 | Claude Code (Opus 5.5) | Group 3: area snapshot (Google Geocoding + Places New, city check, cache, daily cap) and reviewer-only people research with consent; both on the applicant page, labelled reference only | Prompt section 7 | src/app/api/{area,ai/research}, src/components/app/{area-snapshot,people-research}.tsx, applicant page, .env.example | Set GOOGLE_MAPS_API_KEY and test with a real key

- 2026-10-25 | Claude Code (Opus 5.5) | Group 2 onboarding: confirm -> Awaiting paperwork, paperwork gate with uploads, deal terms + payment schedule, franchisee account + no-login preview, email draft (AI/template, reviewer-only send), Gantt + checklist with Why lines; 7 onboarding tests; aria-labels on checkboxes | Prompt section 6 | src/lib/onboarding*.ts, src/components/app/{confirm-button,paperwork-gate,deal-terms-form,franchisee-account,email-draft,onboarding-gantt}.tsx, src/app/{onboarding,franchisee}, src/app/api/{upload,franchisee-account,ai/email,email/send}, .env.example | Configure Resend if real test sends are wanted

- 2026-10-25 | Claude Code (Opus 5.5) | First production deploy (CLI); recorded live URL; noted Git auto-deploy not connected | Delivery chain | CLAUDE.md | Install Vercel GitHub App, then `vercel git connect`

- 2026-10-25 | Claude Code (Opus 5.5) | Group 1 first build: Next.js 16 + Tailwind + shadcn/ui scaffold; Excel parser; deterministic engine with reason ledger; 28 unit tests; synthetic demo file; screens (upload, results, applicant detail, territories, contested pins, settings, activity, chat with what-if); AI routes with fallbacks; Supabase migration + sync (not yet connected); context file, pre-commit hook and CI check | Hackathon build, prompt sections 0-5, 8, 10 | all files | Connect Supabase via MCP; set OPENROUTER_* in Vercel; Group 2

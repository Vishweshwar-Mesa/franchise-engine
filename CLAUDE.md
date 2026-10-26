> **MANDATORY: Any AI agent or person (Claude Code, Codex, Cursor, Copilot, or any other tool) that reads this file and then changes code, config, database schema, or environment variables in this repo MUST update this file in the same commit: add a dated entry to the Change Log, and update any other section that is no longer true. A change without an updated context file is incomplete. Do not delete past Change Log entries; add new ones at the top.**

# Franchise Partner Engine: project context

## 1. Project

- **What:** Franchise partner acquisition, geo-selection and onboarding engine. MESA "Ops Hackathon", Case 1.
- **Team:** Namratha Reddy, Vishweshwar.
- **Deadline:** 2026-10-26, 11:59 PM IST (submission: 1-minute demo video, MVP link, 8-slide deck). The MVP link must stay live and working until 2026-10-28 end of day IST, with no login, paywall, rate limit or expired session.
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
public/samples/                    template.xlsx copy + demo-messy.xlsx (synthetic, 30 applicants with traps)
src/lib/load-demo.ts               Loads demo-messy.xlsx as demo data (+ demo onboarding); Providers auto-loads it on a first visit with no saved data
src/lib/demo-onboarding.ts         3 demo onboarding records (APP-025, APP-030 running; APP-005 awaiting paperwork); money terms blank
src/app/guide/page.tsx             Guide: what the site does, how decisions are made, where to find what, statuses, scores, onboarding, glossary
src/components/app/onboarding-overview.tsx  Onboarding across all stores: Gantt (store group, row per task) and Task board (Paperwork / Overdue / Next 14 days / Later / Needs a date / Done); stores labelled by storeLabel()
scripts/make-demo-file.ts          Regenerates the demo file (npm run samples)
scripts/check-context.sh           Warns when code changes without CLAUDE.md (pre-commit hook + CI)
db/migrations/                     Versioned SQL schema for Neon; apply with `npm run db:migrate` (never edit only in the dashboard)
scripts/migrate.ts                 Applies db/migrations/*.sql once each (table schema_migrations)
src/lib/types.ts                   Data types (Application, Territory, Store, ReviewerInput, ...)
src/lib/parse.ts                   Excel parser: headers by name, tolerant, never throws; validation report
src/lib/settings.ts                Scoring defaults, rubric profiles, zone mapping, profile picker
src/lib/engine.ts                  THE decision engine (deterministic) -> reason ledger per applicant
src/lib/engine.test.ts             Vitest unit tests (engine, parser, demo file, audit regressions, site details)
src/lib/onboarding.test.ts         Onboarding gate/timeline tests
src/lib/demo-onboarding.test.ts    Demo onboarding cases (statuses, no money terms)
src/lib/server/limit.ts            Per-visitor rate limit for the paid AI routes (over the limit -> template fallback)
src/components/app/row-issues.tsx  Row-level validation report on /upload (held applicants and their fixes)
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
src/app/*/page.tsx                 Screens: / (Today bento), /upload, /results, /applicant/[id], /territories, /contested, /onboarding, /onboarding/[id], /franchisee/[id] (no-login preview), /settings, /activity
src/components/app/*               Small presentational components (designer can restyle)
src/components/ui/*                shadcn/ui (Base UI flavour)
```

Flow: Excel -> `parseWorkbook` (browser) -> store -> `runEngine` -> **ledger** -> every screen, the explanations, the export and the chat read only the ledger. AI routes receive ledger data only. Neon mirrors the store when configured.

`AGENTS.md` starts with a pointer to this file; below it Next.js keeps its own managed block (re-added by `next dev`).

## 3b. Design (V5 "Bento Command Center", chosen 2026-10-25; replaced V2 Warm Editorial)

- Dark theme by default, light theme via the button in the top bar (saved in localStorage `fe-theme`; an inline script in `layout.tsx` applies it before paint).
- Colours: neutral near-black #0B0B0D (dark) / #F6F6F6 (light), cards #141417 / #FFFFFF, with the Go Colors brand magenta from gocolors.com (#DF2E84; buttons #C9246F so white text passes contrast; magenta text #F05A9E dark, #B81E66 light).
- Tokens in `src/app/globals.css`: status tones `--tone-<good|decide|info|pin|wait|stop>` (+ `-bg`), solid bar colours `--bar-*`, traffic lights `--light-*`, `--inset`, `--glow`. Never hardcode Tailwind colour classes in components.
- Type: Geist (UI) and Geist Mono (IDs, pins, file names), via `next/font`.
- Layout: top navigation bar (`components/app/nav.tsx`) with Upload and the theme toggle on the right; home `/` is **Today**, a bento grid of tiles (`components/app/bento.tsx` `Tile`) built only from engine results, onboarding records and the action log; Upload lives at `/upload`; `/results` (Applicants) accepts `?status=` from the tiles.
- Motion: `.tile` glow follows the pointer (CSS vars set on pointer move); GSAP count-up on numbers and staggered fade-in (`components/app/motion.tsx`); all off under prefers-reduced-motion.
- Design exploration (8 versions, 2 rounds) is in a private claude.ai canvas: https://claude.ai/artifact/T7nkLboonRceQfV22z4CGF

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
| Financial 20 = net worth 10 + portfolio 10, relative among applicants who have them; a part is scored only when at least 2 applicants have it (otherwise the factor is rescaled away, or the other part takes its points) | Our choice | Entering data must never lower a score |
| Relative factors use percent rank among applicants in the file; alone = 0.5 | Our choice | Prompt: "compared with the other applicants" |
| Traffic lights: Money, Experience, Financial by rank among applicants (top third green, middle amber, bottom red; thresholds editable); Space by share of its points | Our choice | Prompt: thirds for relative factors |
| Notes contradicting the fields: flagged by the AI or by a simple phrase check ("don't have a shop", "still searching" ...) when Space is Owned/Rented; becomes a hold only when the reviewer confirms | Our choice | Works without AI; AI/heuristics never change a status alone |
| Template example row ("Row 3 is an example") skipped when real rows follow; kept if it is the only row | Our choice | Judges may leave it in |
| Investment above 10,000 (lakh) flagged as "looks like rupees" | Our choice | Common entry mistake |
| Site details (frontage ft, visibility, monthly rent if rented): asked of the applicant via a "Questions to ask" list, recorded by the reviewer, shown in ledger/export, never scored | User's choice | Not in the input file; no invented thresholds |
| Paperwork gate locks once onboarding starts ("Reopen paperwork" moves the store back) | Our choice | Day 0 must not shift silently |
| AI routes rate-limited per visitor (assess 6/min, chat 20, explain 40, email 10, research 5); over the limit -> template fallback | Our choice | Bounded cost without blocking the site |
| Financial blank -> rescale others to 100 (50/25/25) with banner | Our choice | Prompt |
| Liabilities = flag only | Our choice | Prompt |
| Waitlist / slot order: total score desc, ties by Application ID | Our choice | Deterministic and explainable |
| Territory priority and launch timing not scored; launch note only if a limit is set (blank default) | Our choice | Prompt |
| Contested pin: only "qualified" applicants (no holds) contest a pin | Our choice | A held applicant can't take the pin anyway |
| Reviewer's call: winner competes for a slot by score; others -> Hold: pin occupied ("reviewer gave this pin to X") | Our choice | One store per pin |
| Manual status change: reason required, logged; takes the applicant out of the automatic pool; a manual Good to go takes a slot first AND reserves its pin (others on that pin -> Hold: pin occupied); warnings if it sits on an existing store's pin or over-fills the territory | Our choice | Reviewer can change any status, but the same-pin case rule must still hold |
| Zones = MHA Zonal Councils | Our choice | Official grouping; only used to match profiles |
| Profile specificity: country 1, zone 2, state 4, city 8; ties -> earlier profile | Our choice | "Most specific wins" |
| Per-browser session id, data in localStorage, mirrored to Neon when configured | Our choice | No login; judges don't overwrite each other |
| AI assessment runs once per loaded file in the background, max 100 applicants, 25 per call | Our choice | Bounded cost, never blocks the table |
| Explanations: template shown at once; AI rewrite (applicant's language) cached per ledger-entry hash | Our choice | Works without AI; AI only rewrites |
| Chat: local parser first (no AI needed): statements of fact ("APP-012 has now found a ground-floor space") are applied to the real data with before/after, stated assumptions and Undo; "what if" questions are previews on a copy; questions (why/how/who...) are answered from the ledger; then AI, then ledger templates | Our choice | Judges' Part 2 test gives new information and checks the decision changes; must work without AI |
| Space found but owned/rented not stated -> treated as rented, said so, and asked to confirm | Our choice | Lets the decision move on new info without hiding the assumption |
| xlsx from SheetJS CDN 0.20.3 (not npm 0.18.5) | Our choice | npm version has known advisories |
| `cacheComponents` turned off in next.config | Our choice | All screens are per-browser client pages |
| First visit with no saved data auto-loads the synthetic 30-applicant demo file (demo-messy.xlsx) plus 3 demo onboarding stores (demo durations/due days; money terms blank), with a small "Demo data" flag and no button to load it; any upload replaces it | User's choice | The empty app was too blank to review; judges still upload their own file. A 10-applicant pre-filled demo workspace was tried and removed the same day at the user's request |
| Confirm Good to go -> stage "Awaiting paperwork" (a stage, not a status) | Prompt | Confirming never starts onboarding |
| Paperwork gate: agreement, GST, other registrations (free-text list); each ticked + dated, optional upload; "confirm with the brand's legal/CA team"; only link: https://www.gst.gov.in/ (verified 2026-10-25: official "Goods & Services Tax (GST) Home", has "Register") | Prompt | No legal/tax advice, no numbers |
| Day 0 = latest gate date; Start onboarding disabled until all three ticked and dated | Prompt | |
| Deal terms, payment schedule, phase durations all blank; blank duration shows "set duration" and stops placement of later phases | Our choice | No official durations exist |
| Phases in order: stock arrival, POS set-up, training, soft launch; payments placed by "due days after Day 0" | Our choice | Prompt lists them; order is ours |
| Stores are named by the reviewer's "Store name" deal field, else "<City> <pin>" (no locality names guessed) | Our choice | User wants stores, not people, on the onboarding views |
| Check-ins count from soft-launch date by default (Settings can switch to Day 0) | Our choice | "Check-ins review how the open store is doing, so they count from opening, not from paperwork." |
| Franchisee account = a record in Neon `franchisee_accounts` (no login system, no email sent); "Preview as franchisee" needs no login | Our choice | Judges never hit a wall; Neon has no built-in auth (Neon Auth is an option later) |
| Email: AI draft in applicant's language (English template fallback); real send only via Resend to REVIEWER_EMAIL, never to the applicant | Prompt | |
| Paperwork files: private Vercel Blob under `paperwork/<session>/<app>/`; without BLOB_READ_WRITE_TOKEN only the file name is kept | Our choice | Neon is database-only |
| Area snapshot: geocode pin (postal_code + country IN), accept only if an address component matches the city (old/new names, e.g. Bangalore/Bengaluru), then Places (New) searchNearby, radius 1500 m, categories schools/colleges/stores/clothing_store (competitors)/restaurants; max 20 per search shown as "20+"; restaurant ratings banded under 4.0 / 4.0-4.4 / 4.5+ | Our choice | Counts only; reference only, never scored |
| Places cache per pin+city (Neon `area_cache`, key `pin|city`; memory fallback); hard daily cap PLACES_DAILY_CAP (default 300 Google calls/day; each lookup = 6 calls); counter in Neon `places_usage` (atomic upsert), else per-server-instance memory | Our choice | Bounded cost, fails soft |
| Area type (brief 3.5) removed entirely: profiles match on Country -> Zone -> State -> City only | User's choice (2026-10-26) | Not needed; any count-to-area-type rule would be invented |
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
- AI: OPENROUTER_API_KEY and OPENROUTER_MODEL=anthropic/claude-sonnet-5.5 are set (2026-10-26), but the OpenRouter account's guardrails block every model tried ("Model blocked by guardrail"). The owner must allow the model/provider at https://openrouter.ai/workspaces/default/guardrails. Until then the app uses templates.
- Google Places / Geocoding untested with a real key (only the no-key path verified); the Places type names and field masks follow Google's Places API (New) docs but have not been exercised.
- People research untested with a real model; depends on the OpenRouter web plugin being available for the chosen model.
- Without DATABASE_URL the Places daily cap is per server instance (weak on Vercel).
- Email sending (Resend) untested: no key configured; preview-only path verified.
- Without AI, business relevance is "not rated" (0 of 6 points) until the reviewer rates it, and explanations/training plans are English templates (training modules labelled "suggested; brand to confirm").
- Places rate limit and AI rate limit are per server instance (in memory), not global.

## 9. Change Log (newest first)

`YYYY-MM-DD | who/which tool | what changed | why | files touched | follow-ups`

- 2026-10-26 | Claude Code (Opus 5.5) | Checked against the official hackathon guidelines + Case 1 brief PDFs. Chat now handles the judges' Part 2 test without AI: new information is parsed (space found, floor, tenure, size, investment, years, pin, city, language, months) and applied with before/after + Undo; what-ifs stay previews; overview questions (who is on the waitlist, which territory has most applicants); example question chips | Official test: "APP-012 has now found a ground-floor space" must change the decision | src/lib/explain.ts, chat-panel.tsx, guide/page.tsx, engine.test.ts | Deck (8 slides) and 1-minute video still to make

- 2026-10-26 | Claude Code (Opus 5.5) | Removed area type everywhere (applicant tag, profile matching, Settings dropdown, Guide); recorded the deadline (2026-10-26 23:59 IST) in Project | User request | types.ts, settings.ts, engine.ts, settings/page.tsx, reviewer-inputs.tsx, applicant/[id]/page.tsx, guide/page.tsx, CLAUDE.md | none

- 2026-10-26 | Claude Code (Opus 5.5) | Full re-audit against the brief + bug hunt (two independent reviewers). Fixes: manual Good to go reserves its pin (the case rule could be broken); financial profile needs >=2 applicants to compare (entering data could lower a score); rank-based traffic lights; phrase-check note contradictions without AI; template example row skipped; Indian number formats + rupee check; AI assessment keyed to the loaded file with trimmed inputs; offline chat answers territory questions and says "That isn't in the data"; local-timezone dates; paperwork gate locks after start; upload no longer reverts ticks; 4 MB upload check; tab sync; safe localStorage; duplicate store IDs; per-call Places quota + negative cache; AI per-visitor limits; keyboard links in table; computed rescale note; check-in why follows the setting; franchisee preview hides reviewer UI and shows the legal/CA line; Today waitlist tile uses confirmations; Why? on Today, what-if and confirm; row-level validation report; settings blank numbers + fixed-check reasons; demo banner and Guide honest about demo durations; training modules labelled suggested; Go Colors description limited to section 9. NEW: site details (frontage, visibility, rent) asked + shown, not scored. OpenRouter key + model set in Vercel | User asked for a re-audit and site questions | engine.ts, parse.ts, explain.ts, onboarding.ts, types.ts, settings.ts, workspace.ts, export.ts, api/{state,area,upload,ai/*}, server/limit.ts, many components and pages, tests | Owner: allow the model in OpenRouter guardrails; none

- 2026-10-26 | Claude Code (Opus 5.5) | Onboarding page: Gantt chart (row per task, grouped by store) and Task board (kanban columns) with a switch, replacing the list; everything labelled by store (new "Store name" deal field, else "<City> <pin>"); local-timezone today for overdue; dealValue() guards records saved before the new field | User: onboarding must be a Gantt/task manager and name stores, not people | onboarding.ts, onboarding-overview.tsx, onboarding/page.tsx, onboarding/[id]/page.tsx, deal-terms-form.tsx, email-draft.tsx, franchisee/[id]/page.tsx | none

- 2026-10-26 | Claude Code (Opus 5.5) | Fix: browsers that loaded demo-messy.xlsx before the demo flag existed got no onboarding demo cases; demo is now also recognised by file name (flag set + cases added when onboarding is empty) | Reported by user (empty Onboarding page) | src/components/app/providers.tsx | none

- 2026-10-26 | Claude Code (Opus 5.5) | Onboarding page is now a combined Gantt + task list; 3 demo onboarding cases added to the demo data (also added to browsers that already had the demo); new Guide page (how it works, where to find what, statuses, scores, glossary) linked in the nav; plain-language explanations on Settings (traffic lights, launch timing, checks, profiles), Today, Applicants, applicant page and Territories; taskDonePatch helper shared by both Gantts | User: onboarding should look like a Gantt/task manager, needs demo cases, and every term must be explained on the page | src/lib/demo-onboarding.ts (+test), load-demo.ts, providers.tsx, store, onboarding.ts, onboarding-overview.tsx, onboarding/page.tsx, onboarding-gantt.tsx, guide/page.tsx, nav.tsx, settings/page.tsx, page.tsx, results/page.tsx, applicant/[id]/page.tsx, territories/page.tsx | none

- 2026-10-25 | Claude Code (Opus 5.5) | Redesign to V5 Bento Command Center: neutral dark/light tokens, Geist fonts, top nav, new Today bento home (Upload moved to /upload), neutral status tiles, `?status=` filter on Applicants, pointer-following tile glow; removed serif styles | User picked V5 from round 2 | globals.css, layout.tsx, nav.tsx, bento.tsx (new), page.tsx (Today), upload/page.tsx (moved), results/page.tsx, status-counts.tsx, page-header.tsx, many components (style sweep) | none

- 2026-10-25 | Claude Code (Opus 5.5) | Removed the "Load demo data" button and the banner's button: demo data is just pre-loaded, with a small "Demo data" flag | User: no button to initiate demo data | upload-panel.tsx, demo-banner.tsx, page.tsx | none
- 2026-10-25 | Claude Code (Opus 5.5) | Auto-loaded demo now gives way if the person loads a file while it downloads (race fix); browsers holding the retired 10-applicant demo get the 30-applicant one | Bug found in live check | src/lib/load-demo.ts, providers.tsx | none
- 2026-10-25 | Claude Code (Opus 5.5) | Removed the 10-applicant demo workspace (demo-showcase.xlsx, demo-workspace.ts and its test); first visit now auto-loads the 30-applicant demo-messy.xlsx with a "Demo data" banner; "Load demo data" button sets the same banner | User asked to keep only the 30-applicant demo | scripts/make-demo-file.ts, src/lib/load-demo.ts, store, upload-panel.tsx, demo-banner.tsx | none

- 2026-10-25 | Claude Code (Opus 5.5) | Demo workspace: 10 synthetic applicants (demo-showcase.xlsx) with reviewer inputs and 2 onboarding records, auto-loaded on first visit + "Load demo workspace" button + banner; 3 tests; fixed Gantt payment bar colour broken by the earlier colour sweep; vitest config uses import.meta.dirname | User wanted something to review | scripts/make-demo-file.ts, public/samples/demo-showcase.xlsx, src/lib/{demo-workspace,load-demo}.ts, demo-workspace.test.ts, store, providers, layout, demo-banner.tsx, upload-panel.tsx, onboarding-gantt.tsx, vitest.config.mts | none

- 2026-10-25 | Claude Code (Opus 5.5) | Created Neon DB via Vercel integration and applied migration 001; fixed sync losing changes on quick reload/close (push on start, 1 s debounce, flush on pagehide/visibilitychange with keepalive); git-ignored Neon agent-skill files | Neon go-live | src/lib/sync.ts, .gitignore, CLAUDE.md | none

- 2026-10-25 | Claude Code (Opus 5.5) | Replaced Supabase with Neon Postgres (`@neondatabase/serverless`, db/migrations + `npm run db:migrate`) and Vercel Blob for paperwork; franchisee account is now a Neon record; /api/status reports `database` and `files`; env vars DATABASE_URL + BLOB_READ_WRITE_TOKEN replace the three Supabase vars; Vercel Git integration now connected | User chose Neon | src/lib/server/db.ts (new), src/lib/server/supabase.ts (removed), supabase/ (removed), db/migrations/001_init.sql, scripts/migrate.ts, src/app/api/{state,upload,franchisee-account,area,status}, openrouter.ts, use-services, providers, sync, franchisee-account.tsx, .env.example, package.json | Create the Neon resource (accept Neon terms on Vercel), run migrations, optionally add a Blob store

- 2026-10-25 | Claude Code (Opus 5.5) | Redesign to V2 Warm Editorial: dark default + light toggle, Go Colors magenta, Fraunces/Inter/JetBrains Mono, floating sidebar, tinted status tiles, applicant cards with inline reason (table view kept), factor bars on applicant page, GSAP count-up and stagger, colour tokens replace hardcoded Tailwind colours | User found the UI bland; picked V2 of 4 directions | src/app/globals.css, src/app/layout.tsx, src/app/**/page.tsx, src/components/app/* (new: theme-toggle, motion, page-header, applicant-list), package.json (gsap) | none

- 2026-10-25 | Claude Code (Opus 5.5) | Group 3: area snapshot (Google Geocoding + Places New, city check, cache, daily cap) and reviewer-only people research with consent; both on the applicant page, labelled reference only | Prompt section 7 | src/app/api/{area,ai/research}, src/components/app/{area-snapshot,people-research}.tsx, applicant page, .env.example | Set GOOGLE_MAPS_API_KEY and test with a real key

- 2026-10-25 | Claude Code (Opus 5.5) | Group 2 onboarding: confirm -> Awaiting paperwork, paperwork gate with uploads, deal terms + payment schedule, franchisee account + no-login preview, email draft (AI/template, reviewer-only send), Gantt + checklist with Why lines; 7 onboarding tests; aria-labels on checkboxes | Prompt section 6 | src/lib/onboarding*.ts, src/components/app/{confirm-button,paperwork-gate,deal-terms-form,franchisee-account,email-draft,onboarding-gantt}.tsx, src/app/{onboarding,franchisee}, src/app/api/{upload,franchisee-account,ai/email,email/send}, .env.example | Configure Resend if real test sends are wanted

- 2026-10-25 | Claude Code (Opus 5.5) | First production deploy (CLI); recorded live URL; noted Git auto-deploy not connected | Delivery chain | CLAUDE.md | Install Vercel GitHub App, then `vercel git connect`

- 2026-10-25 | Claude Code (Opus 5.5) | Group 1 first build: Next.js 16 + Tailwind + shadcn/ui scaffold; Excel parser; deterministic engine with reason ledger; 28 unit tests; synthetic demo file; screens (upload, results, applicant detail, territories, contested pins, settings, activity, chat with what-if); AI routes with fallbacks; Supabase migration + sync (not yet connected); context file, pre-commit hook and CI check | Hackathon build, prompt sections 0-5, 8, 10 | all files | Connect Supabase via MCP; set OPENROUTER_* in Vercel; Group 2

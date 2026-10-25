# Franchise Partner Engine

MESA Ops Hackathon, Case 1: franchise partner acquisition, geo-selection and onboarding.
Scenario: Go Colors (Go Fashion (India) Ltd) scaling through franchise partners.

- Upload the applications Excel (template format in `data/template.xlsx`) or click **Load sample data**.
- A deterministic engine applies the case rule (never two stores in one pin), territory capacity limits and our editable checks, then scores and explains every applicant in a reason ledger.
- AI (OpenRouter) only rewrites explanations, rates business relevance and powers chat. It never changes a status or score, and the app works fully without it.

Start here: **[CLAUDE.md](CLAUDE.md)** (architecture, decisions, env vars, how to run/deploy, change log).

```bash
npm install
cp .env.example .env.local   # optional: fill in keys
npm run dev
npm test
```

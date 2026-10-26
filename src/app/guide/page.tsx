"use client";
// The Guide: what the site does, how decisions are made, where to find what, and a glossary.
// Written for someone opening the site cold. Keep it in sync with the engine and CLAUDE.md.
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { SourceTag } from "@/components/app/source-tag";
import { TrafficLight } from "@/components/app/traffic-light";
import type { Status } from "@/lib/types";

const STEPS: [string, string][] = [
  ["Read the file", "The Excel file is read in your browser. Columns are found by name. Problems with the file itself (missing sheet, duplicate IDs, text where a number belongs) are listed on the Upload page."],
  ["Run the checks", "Each applicant is checked: are the required fields there, is the pin 6 digits and right for the city, does a territory cover the pin, is a shop space identified, do the details contradict each other? Any failure puts them on Hold: info needed, with a list of what to fix."],
  ["Apply the same-pin rule", "The brand never opens two stores in one pin code (a rule from the case). If a store already exists on the pin: Hold: pin occupied. If two or more qualified applicants want the same free pin: Needs your decision. The tool never picks between them."],
  ["Score", "Everyone is scored out of 100 on four factors: Space (40), Money (20), Experience (20) and Financial profile (20). If no financial profile has been typed in, the other three are scaled up to make 100."],
  ["Fill the slots", "Each territory can take a limited number of new stores (its capacity). The highest scorers get the slots and become Good to go; qualified people beyond capacity go on the Waitlist in score order."],
  ["A human decides", "Every status is a recommendation. You confirm, change any status (with a reason), and decide contested pins. Confirming a Good to go moves them to onboarding."],
];

const PAGES: [string, string, string][] = [
  ["/", "Today", "Start here. What needs your attention now: how many are ready to confirm, contested pins, holds, territory capacity, onboarding. Every tile opens the details."],
  ["/results", "Applicants", "Everyone in the file with their status, one-line reason and score dots. Filter by status, territory or city; search by name, ID or pin. Export to CSV or Excel."],
  ["/applicant/APP-004", "Applicant page", "Opened by clicking any applicant. The full reason ledger, scores, plain-language explanation, training plan, and where you type a financial profile, rate their business, change their status or confirm them."],
  ["/territories", "Territories", "Each territory's open slots, free pins, capacity, who got a slot and who is waiting. Confirm the waitlist order here."],
  ["/contested", "Contested", "Pins wanted by two or more qualified applicants, shown side by side with strengths and concerns. Make the Reviewer's call here."],
  ["/onboarding", "Onboarding", "Everyone you confirmed: a combined timeline (Gantt) and a task list of what is due. Open a person for their paperwork, deal terms, account, email draft and own timeline."],
  ["/settings", "Settings", "The checks and scoring numbers. Case rules are locked; our defaults can be changed and everything is re-scored when you save."],
  ["/activity", "Activity", "A log of everything a reviewer did in this browser: uploads, status changes, confirmations, settings changes."],
  ["/upload", "Upload file", "Bring in the applications Excel file (or the case's sample). Shows a report of what was read and any problems."],
];

const STATUS_HELP: [Status, string, string][] = [
  ["Good to go", "Passed every check and won a slot in their territory.", "Review and confirm. Confirming moves them to paperwork; it is not a final approval."],
  ["Needs your decision", "Two or more qualified applicants want the same free pin, and only one store can open there.", "Open Contested and make the Reviewer's call."],
  ["Hold: info needed", "Something is missing, wrong or contradictory in their application.", "Their page lists exactly what to fix. Contact the applicant."],
  ["Hold: pin occupied", "A Go Colors store already exists on their pin code. Not a rejection.", "Discuss another pin, or a takeover of the existing store."],
  ["Waitlist", "Qualified, but their territory has no slot left.", "Confirm the waitlist order on Territories. They move up if a slot opens."],
  ["Not proceeding", "Only ever set by a reviewer, with a reason. The tool never rejects anyone.", "Nothing; it is recorded in the Activity log."],
];

const GLOSSARY: [string, string][] = [
  ["Activity log", "Every reviewer action in this browser, newest first: uploads, status changes, confirmations, settings."],
  ["AI", "Optional. When switched on it reads the free-text business and notes fields, rewrites explanations in the applicant's language and answers chat questions. It never changes a check, score or status. Without it the site uses written templates and works the same."],
  ["Applicant / Application ID", "One row in the Applications sheet, identified by its Application ID (e.g. APP-004)."],
  ["Area snapshot", "Counts of nearby schools, colleges, stores, clothing stores and restaurants around the applicant's pin, from Google Maps. Reference only; never used in decisions."],
  ["Business relevance", "How relevant the applicant's current or past business is to running an apparel store: High, Medium or Low. Rated by AI when it is on; you can always override it. Part of the Experience score."],
  ["Capacity", "How many new stores a territory can take: the smaller of its open slots and its free pins. A rule from the case."],
  ["Case rule", "A rule written in the case file (the same-pin rule and the capacity limits). It cannot be changed."],
  ["Check-ins", "Reviews of an open store at day 30, 60, 90 and 180, counted from the soft-launch date by default."],
  ["Confirm", "Your action on a Good to go applicant. It moves them to Awaiting paperwork; it is not an approval."],
  ["Contested pin", "A free pin that two or more qualified applicants want. Only one store can open there, so you choose (the Reviewer's call)."],
  ["Day 0", "The day the last paperwork item was completed. Every onboarding date counts from it."],
  ["Deal terms", "Franchise fee, deposit, royalty, term, payment schedule and so on. All blank until the reviewer types them; Go Colors has not published these."],
  ["Demo data", "30 made-up applicants (not real people, not Go Colors data) loaded automatically so the site is not empty, with a few made-up onboarding cases. Uploading a file replaces it."],
  ["Existing store", "A Go Colors store that is already open, from the case file's Existing stores sheet (10 stores)."],
  ["Explanation", "A plain-language summary of an applicant's status, next steps and training plan, written from the reason ledger."],
  ["Factor", "One part of the score: Space (40 points), Money (20), Experience (20), Financial profile (20)."],
  ["Feasibility note", "A note shown when an applicant wants to open sooner than the launch limit set in Settings. Never affects the score or status."],
  ["Financial profile", "Net worth and portfolio (in ₹ lakh), typed by the reviewer because the application does not include them, plus a free-text box for liabilities or past failures."],
  ["Free pin", "A pin code inside a territory that has no existing store on it."],
  ["Gantt / timeline", "The onboarding plan drawn as bars on a calendar: stock arrival, POS set-up, training, soft launch, payments and check-ins. Durations are typed by the brand; the site never fills them in (the 3 demo stores use demo entries, marked on the demo banner)."],
  ["Hold", "A pause, not a rejection. Either information is needed, or the pin is already taken."],
  ["Launch timing (Target launch)", "How many months from now the applicant wants to open. Shown for context, never scored."],
  ["Liabilities", "Loans, past business failures or other issues the reviewer notes. Shown as a warning; never changes the score or status."],
  ["Money", "Investment capacity (₹ lakh), compared with the other applicants in the file. 20 of the 100 points."],
  ["Our choice", "A default we picked because the case did not say (for example the space points or the traffic-light thresholds). Editable in Settings."],
  ["Paperwork gate", "Three items that must be ticked and dated before onboarding starts: franchise agreement signed, GST registration, other legal registrations. The tool does not verify them or give legal advice."],
  ["People research", "An optional web search for public pages about an applicant, shown as unverified possible matches, only with the applicant's knowledge. Never used in decisions."],
  ["Pin code", "The 6-digit Indian postal code. Applicants are matched to territories by pin code only."],
  ["Reason ledger (\"Why?\")", "The complete record behind a status: every check with its input, result and whether it is a case rule or our choice, the score breakdown, rank, slot, and what would change the outcome. Every \"Why?\" link opens it."],
  ["Relative (compared with others)", "Money, experience years, net worth and portfolio are scored against everyone else in the file: the highest gets full points, the lowest none."],
  ["Rescaled score", "When no financial profile is entered, the other three factors are scaled up to total 100 (Space 50, Money 25, Experience 25), and the applicant's page says so."],
  ["Reviewer's call", "Your decision on a contested pin. The chosen applicant competes for a slot by score; the others move to Hold: pin occupied."],
  ["Scoring profile", "A set of scoring numbers for a region. Only \"Default (Karnataka)\" exists; you can add others in Settings."],
  ["Site details", "Frontage (width of the shop front, in feet), visibility (main road, side street, inside a mall) and monthly rent. Not in the application file: the reviewer asks the applicant and records the answers. Shown in the ledger and export as context only; never scored."],
  ["Questions to ask", "A list on each applicant's page of what to ask them next: anything missing or wrong in the application, then site details not yet recorded. Has a Copy button."],
  ["Soft launch", "A quiet first opening of the store before full operation."],
  ["Space", "Whether the applicant owns or rents a shop, its size and its floor. 40 of the 100 points. Stores under about 400 sq ft are marked as small-space risk; 700+ sq ft is preferred (from Go Colors' own statements)."],
  ["Territory", "An area the brand wants to grow in, made up of pin codes, with a number of open slots and a priority. Priority is shown for context only."],
  ["Traffic light", "A coloured dot per factor: green = strong (about the top third), amber = middle, red = weak, hollow = not provided. Lets you read a profile at a glance."],
  ["Waitlist order", "The order in which waitlisted applicants would get a slot: highest score first. You confirm it on Territories."],
  ["What-if", "Ask the chat (Ask / What-if button) something like \"What if APP-004 had a 700 sq ft space?\". It re-runs the engine on a copy and shows before and after; nothing changes unless you apply it."],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function GuidePage() {
  const [q, setQ] = useState("");
  const terms = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? GLOSSARY.filter(([k, v]) => (k + " " + v).toLowerCase().includes(t)) : GLOSSARY;
  }, [q]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Guide"
        sub="What this website does, how it decides, where to find things, and what every term means."
      />
      <nav aria-label="On this page" className="flex flex-wrap gap-2 text-sm">
        {[["what", "What it does"], ["how", "How a decision is made"], ["where", "Where to find what"], ["statuses", "Statuses"], ["scores", "Scores and traffic lights"], ["onboarding", "Onboarding"], ["glossary", "Glossary"]].map(([id, l]) => (
          <a key={id} href={`#${id}`} className="rounded-lg border px-3 py-1.5 hover:bg-muted">{l}</a>
        ))}
      </nav>

      <Panel title="What it does" className="scroll-mt-6">
        <div id="what" className="flex max-w-3xl flex-col gap-2 text-[15px] leading-relaxed">
          <p>
            This is a review desk for choosing franchise partners. The scenario is Go Colors (Go Fashion (India) Ltd) opening new stores through franchisees in Karnataka.
            You upload an Excel file of applications; the site checks every applicant, scores them, matches them to territories by pin code, and recommends a status for each one, with the reasons.
          </p>
          <p>
            It never approves or rejects anyone on its own. You confirm, change or overrule every recommendation, and every action is logged. Once you confirm someone, the site helps you run their onboarding: paperwork, deal terms, and a timeline to opening.
          </p>
        </div>
      </Panel>

      <Panel title="How a decision is made">
        <ol id="how" className="grid gap-3 md:grid-cols-2">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="flex gap-3 rounded-2xl bg-inset p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
              <div><p className="font-semibold">{t}</p><p className="text-muted-foreground">{d}</p></div>
            </li>
          ))}
        </ol>
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Every check is tagged <SourceTag source="Case rule" /> (from the case file, locked) or <SourceTag source="Our choice" /> (our default, editable in Settings).
        </p>
      </Panel>

      <Panel title="Where to find what">
        <div id="where" className="grid gap-2 md:grid-cols-2">
          {PAGES.map(([href, name, d]) => (
            <Link key={name} href={href} className="tile rounded-2xl border p-4">
              <p className="font-semibold">{name} →</p>
              <p className="text-muted-foreground">{d}</p>
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Ask / What-if (bottom right, on every page) answers questions about any applicant from the reason ledger.</p>
      </Panel>

      <Panel title="Statuses">
        <div id="statuses" className="flex flex-col divide-y">
          {STATUS_HELP.map(([s, means, todo]) => (
            <div key={s} className="grid gap-2 py-3 md:grid-cols-[200px_1fr_1fr]">
              <div><StatusBadge status={s} /></div>
              <p>{means}</p>
              <p className="text-muted-foreground"><b className="text-foreground">What to do:</b> {todo}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Scores and traffic lights">
        <div id="scores" className="flex max-w-3xl flex-col gap-3 text-[15px] leading-relaxed">
          <p>
            Each applicant is scored out of 100: <b>Space 40</b> (owned or rented, size, floor), <b>Money 20</b> (investment capacity), <b>Experience 20</b> (years in retail and how relevant their business is)
            and <b>Financial profile 20</b> (net worth and portfolio, typed in by the reviewer). Without a financial profile the other three are scaled up to make 100.
          </p>
          <div className="flex flex-col gap-1.5 rounded-2xl bg-inset p-4 text-sm">
            <p className="font-semibold">The coloured dots (traffic lights): one per factor, in the order Space · Money · Experience · Financial profile</p>
            <p className="flex items-center gap-2"><TrafficLight light="green" /> Green: strong on this factor (two thirds of its points or more; roughly the top third of applicants).</p>
            <p className="flex items-center gap-2"><TrafficLight light="amber" /> Amber: middle.</p>
            <p className="flex items-center gap-2"><TrafficLight light="red" /> Red: weak (less than a third of its points).</p>
            <p className="flex items-center gap-2"><TrafficLight light="none" /> Hollow: not provided yet (usually the financial profile).</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Not scored at all: <b>launch timing</b> (how soon they want to open) and <b>territory priority</b>. Both are shown for context only. Liabilities you note are a warning and never change the score.
          </p>
        </div>
      </Panel>

      <Panel title="Onboarding">
        <div id="onboarding" className="flex max-w-3xl flex-col gap-2 text-[15px] leading-relaxed">
          <p>
            <b>1. Confirm</b> a Good to go applicant. They move to <b>Awaiting paperwork</b>. <b>2. Paperwork gate:</b> tick and date the signed franchise agreement, GST registration and other legal registrations.
            <b> 3. Day 0</b> is the date the last one was done; the timeline starts there: payments, stock arrival, POS software, training, soft launch, then check-ins at day 30, 60, 90 and 180.
          </p>
          <p className="text-sm text-muted-foreground">Durations, fees and terms are typed by the brand; the site never fills them in. (The 3 demo stores have demo durations so the Gantt has something to show; their fees and amounts stay blank.) Each task says why it exists.</p>
        </div>
      </Panel>

      <Panel title="Glossary" aside={<Input aria-label="Search the glossary" placeholder="Search terms…" className="h-9 w-56" value={q} onChange={(e) => setQ(e.target.value)} />}>
        <dl id="glossary" className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {terms.map(([k, v]) => (
            <div key={k} id={slug(k)} className="scroll-mt-6">
              <dt className="font-semibold">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        {terms.length === 0 && <p className="text-muted-foreground">No term matches &quot;{q}&quot;.</p>}
      </Panel>
    </div>
  );
}

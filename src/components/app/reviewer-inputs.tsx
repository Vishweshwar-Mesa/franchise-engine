"use client";
// Reviewer-typed inputs: financial profile, liabilities, business relevance override, site details.
import { useState } from "react";
import type { LedgerEntry } from "@/lib/engine";
import { RELEVANCE, VISIBILITY, type Relevance, type ReviewerInput, type SiteDetails } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "./native-select";

const numOrNull = (s: string) => (s.trim() === "" || isNaN(Number(s)) ? null : Number(s));

export function FinancialProfileForm({ id, input }: { id: string; input: ReviewerInput }) {
  const [nw, setNw] = useState(input.netWorth?.toString() ?? "");
  const [pf, setPf] = useState(input.portfolio?.toString() ?? "");
  const [li, setLi] = useState(input.liabilities ?? "");
  return (
    <form
      className="space-y-2 rounded-[20px] border bg-card p-5 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        useWorkspace.getState().setReviewer(id, { netWorth: numOrNull(nw), portfolio: numOrNull(pf), liabilities: li }, `Financial profile saved (net worth ${nw || "blank"}, portfolio ${pf || "blank"}${li ? ", liabilities noted" : ""}).`);
      }}
    >
      <h3 className="text-base font-semibold">Financial profile (typed by reviewer; not in the case data)</h3>
      <div className="grid grid-cols-2 gap-2">
        <div><Label htmlFor={`nw-${id}`}>Net worth (₹ lakh)</Label><Input id={`nw-${id}`} inputMode="decimal" value={nw} onChange={(e) => setNw(e.target.value)} /></div>
        <div><Label htmlFor={`pf-${id}`}>Portfolio (₹ lakh)</Label><Input id={`pf-${id}`} inputMode="decimal" value={pf} onChange={(e) => setPf(e.target.value)} /></div>
      </div>
      <div>
        <Label htmlFor={`li-${id}`}>Liabilities / previous failures / issues</Label>
        <Textarea id={`li-${id}`} rows={2} value={li} onChange={(e) => setLi(e.target.value)} />
        <p className="text-xs text-muted-foreground">Shown as a warning flag. It does not change the score or status.</p>
      </div>
      <Button type="submit" size="sm">Save financial profile</Button>
    </form>
  );
}

export function RelevanceCard({ entry, input }: { entry: LedgerEntry; input: ReviewerInput }) {
  const noteFlag = entry.flags.find((f) => f.kind === "ai-contradiction");
  const confirmed = entry.checks.find((c) => c.key === "contradiction-notes");
  const set = useWorkspace((s) => s.setReviewer);
  return (
    <div className="space-y-2 rounded-[20px] border bg-card p-5 text-sm">
      <h3 className="text-base font-semibold">Business relevance (part of Experience)</h3>
      <p>
        {entry.relevance.rating ?? "Not rated"} <span className="text-xs text-muted-foreground">({entry.relevance.by})</span>: {entry.relevance.reason}
      </p>
      <div className="flex items-center gap-2">
        <Label htmlFor={`rel-${entry.id}`}>Reviewer override</Label>
        <NativeSelect
          id={`rel-${entry.id}`}
          value={input.relevanceOverride ?? ""}
          onChange={(e) => set(entry.id, { relevanceOverride: (e.target.value || null) as Relevance | null }, `Business relevance override: ${e.target.value || "removed"}.`)}
        >
          <option value="">Use AI rating</option>
          {RELEVANCE.map((r) => <option key={r}>{r}</option>)}
        </NativeSelect>
      </div>
      {(noteFlag || confirmed || input.aiContradiction === "dismissed") && (
        <div className="rounded bg-[var(--tone-info-bg)] p-2 text-xs">
          <p><b>Possible contradiction in the notes:</b> {noteFlag?.text ?? confirmed?.detail ?? "dismissed by reviewer"}</p>
          <p className="text-muted-foreground">Not applied unless you confirm. Current: {input.aiContradiction ?? "undecided"}.</p>
          <div className="mt-1 flex gap-2">
            <Button size="xs" variant="outline" onClick={() => set(entry.id, { aiContradiction: "confirmed" }, "Reviewer confirmed the AI-flagged contradiction (Hold: info needed).")}>Confirm (hold for info)</Button>
            <Button size="xs" variant="outline" onClick={() => set(entry.id, { aiContradiction: "dismissed" }, "Reviewer dismissed the AI-flagged contradiction.")}>Dismiss</Button>
          </div>
        </div>
      )}
    </div>
  );
}


/** Site details asked of the applicant. Shown in the ledger; never scored. */
export function SiteDetailsForm({ id, input, rented }: { id: string; input: ReviewerInput; rented: boolean }) {
  const site = input.site ?? {};
  const [front, setFront] = useState(site.frontageFt?.toString() ?? "");
  const [vis, setVis] = useState<string>(site.visibility ?? "");
  const [rent, setRent] = useState(site.monthlyRent?.toString() ?? "");
  return (
    <form
      className="space-y-2 rounded-[20px] border bg-card p-5 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        useWorkspace.getState().setReviewer(
          id,
          { site: { frontageFt: numOrNull(front), visibility: (vis || null) as SiteDetails["visibility"], monthlyRent: rented ? numOrNull(rent) : null } },
          `Site details saved (frontage ${front || "blank"} ft, visibility ${vis || "blank"}${rented ? `, rent ${rent || "blank"}` : ""}).`,
        );
      }}
    >
      <h3 className="text-base font-semibold">Site details (asked of the applicant; not scored)</h3>
      <p className="text-xs text-muted-foreground">Not in the application file. Record what the applicant tells you; it appears in the reason ledger and the export as context only.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div><Label htmlFor={`front-${id}`}>Frontage (feet)</Label><Input id={`front-${id}`} inputMode="decimal" placeholder="not asked yet" value={front} onChange={(e) => setFront(e.target.value)} /></div>
        <div>
          <Label htmlFor={`vis-${id}`}>Visibility</Label>
          <NativeSelect id={`vis-${id}`} className="w-full" value={vis} onChange={(e) => setVis(e.target.value)}>
            <option value="">Not asked yet</option>
            {VISIBILITY.map((v) => <option key={v}>{v}</option>)}
          </NativeSelect>
        </div>
        {rented && <div><Label htmlFor={`rent-${id}`}>Monthly rent (₹)</Label><Input id={`rent-${id}`} inputMode="decimal" placeholder="not asked yet" value={rent} onChange={(e) => setRent(e.target.value)} /></div>}
      </div>
      <Button type="submit" size="sm">Save site details</Button>
    </form>
  );
}

/** What to ask the applicant next, ready to copy into a message or call notes. */
export function QuestionsCard({ entry }: { entry: LedgerEntry }) {
  const [copied, setCopied] = useState(false);
  if (entry.questions.length === 0) return null;
  return (
    <div className="space-y-2 rounded-[20px] border bg-card p-5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Questions to ask the applicant</h3>
        <Button size="xs" variant="outline" onClick={async () => {
          try { await navigator.clipboard.writeText(entry.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")); setCopied(true); } catch { setCopied(false); }
        }}>{copied ? "Copied" : "Copy"}</Button>
      </div>
      <ol className="ml-5 list-decimal space-y-1">{entry.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
    </div>
  );
}

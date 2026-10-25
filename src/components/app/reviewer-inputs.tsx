"use client";
// Reviewer-typed inputs: financial profile, liabilities, business relevance override, area type.
import { useState } from "react";
import type { LedgerEntry } from "@/lib/engine";
import { AREA_TYPES, RELEVANCE, type AreaType, type Relevance, type ReviewerInput } from "@/lib/types";
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
      className="space-y-2 rounded-3xl border bg-card p-5 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        useWorkspace.getState().setReviewer(id, { netWorth: numOrNull(nw), portfolio: numOrNull(pf), liabilities: li }, `Financial profile saved (net worth ${nw || "blank"}, portfolio ${pf || "blank"}${li ? ", liabilities noted" : ""}).`);
      }}
    >
      <h3 className="font-serif text-lg font-medium">Financial profile (typed by reviewer; not in the case data)</h3>
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

export function RelevanceCard({ entry, input, aiFlag }: { entry: LedgerEntry; input: ReviewerInput; aiFlag: { found: boolean; detail: string } | null }) {
  const set = useWorkspace((s) => s.setReviewer);
  return (
    <div className="space-y-2 rounded-3xl border bg-card p-5 text-sm">
      <h3 className="font-serif text-lg font-medium">Business relevance (part of Experience)</h3>
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
      {aiFlag?.found && (
        <div className="rounded bg-[var(--tone-info-bg)] p-2 text-xs">
          <p><b>AI-flagged possible contradiction in the notes:</b> {aiFlag.detail}</p>
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

export function AreaTypeSelect({ id, value }: { id: string; value: AreaType | null | undefined }) {
  const set = useWorkspace((s) => s.setReviewer);
  return (
    <div className="flex items-center gap-2 text-sm">
      <Label htmlFor={`area-${id}`}>Area type (manual tag, picks the rubric profile)</Label>
      <NativeSelect id={`area-${id}`} value={value ?? ""} onChange={(e) => set(id, { areaType: (e.target.value || null) as AreaType | null }, `Area type set to ${e.target.value || "blank"}.`)}>
        <option value="">Not set</option>
        {AREA_TYPES.map((a) => <option key={a}>{a}</option>)}
      </NativeSelect>
    </div>
  );
}

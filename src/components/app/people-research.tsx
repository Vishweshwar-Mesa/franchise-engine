"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/** Reviewer-only. Links are possible matches, unverified; never stored or used in decisions. */
export function PeopleResearch({ name, city, business }: { name: string; city: string; business: string }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ available: boolean; links: { title: string; url: string; why: string }[] } | null>(null);
  async function run() {
    setBusy(true);
    try {
      setRes(await (await fetch("/api/ai/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, city, business, consent: true }) })).json());
    } catch {
      setRes({ available: false, links: [] });
    }
    setBusy(false);
  }
  return (
    <div className="space-y-2 rounded-xl border p-4 text-sm">
      <h3 className="font-semibold">People research (reviewer only)</h3>
      <label className="flex items-center gap-2 text-xs">
        <Checkbox aria-label="Consent" checked={consent} onCheckedChange={(v) => setConsent(!!v)} />
        Only research an applicant with their knowledge. I confirm the applicant knows.
      </label>
      <Button size="sm" variant="outline" disabled={!consent || busy || name.length < 2} onClick={run}>{busy ? "Searching…" : "Search the web"}</Button>
      {res && !res.available && <p className="text-xs">Not available (AI web search is not configured or failed).</p>}
      {res?.available && res.links.length === 0 && <p className="text-xs">Nothing found.</p>}
      {res?.available && res.links.length > 0 && (
        <ul className="space-y-1 text-xs">
          {res.links.map((l, i) => (
            <li key={i}>
              <span className="rounded bg-amber-100 px-1">possible match, unverified</span>{" "}
              <a href={l.url} target="_blank" rel="noreferrer nofollow" className="underline">{l.title}</a>: {l.why}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Nothing here is stated as fact about the person, and it is never used in any decision or score.</p>
    </div>
  );
}

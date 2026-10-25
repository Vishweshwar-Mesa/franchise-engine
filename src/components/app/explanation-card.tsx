"use client";
// Plain-language explanation, next steps and training plan. The template version is shown
// at once; an AI rewrite (in the applicant's language) replaces it when available.
import { useEffect, useState } from "react";
import type { LedgerEntry } from "@/lib/engine";
import { compactEntry, entryKey, templateExplanation } from "@/lib/explain";
import { fetchServices } from "@/hooks/use-services";
import { useWorkspace } from "@/store/workspace";

export function ExplanationCard({ entry, languages }: { entry: LedgerEntry; languages: string[] }) {
  const language = languages.find((l) => l.toLowerCase() === entry.language.toLowerCase()) ?? "English";
  const key = entryKey(entry, language);
  const cached = useWorkspace((s) => s.explanations[entry.id]);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const fresh = cached && cached.key === key ? cached.data : null;

  useEffect(() => {
    if (fresh) return;
    let cancelled = false;
    (async () => {
      const s = await fetchServices();
      if (!s.ai || cancelled) return;
      setState("loading");
      try {
        const res = await fetch("/api/ai/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entry: compactEntry(entry), language }),
        });
        const body = await res.json();
        if (cancelled) return;
        if (body.available) {
          useWorkspace.getState().setExplanation(entry.id, key, { summary: body.summary, nextSteps: body.nextSteps, training: body.training, language, by: "AI" });
          setState("idle");
        } else setState("failed");
      } catch {
        if (!cancelled) setState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const x = fresh ?? templateExplanation(entry);
  return (
    <div className="space-y-3 rounded-[20px] border bg-card p-5 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Explanation</h3>
        <span className="text-xs text-muted-foreground">
          {x.by === "AI" ? `Written by AI from the ledger, in ${x.language}` : "Template from the ledger (English)"}
          {state === "loading" && " · AI version loading…"}
          {state === "failed" && " · AI unavailable, showing template"}
        </span>
      </div>
      <p>{x.summary}</p>
      <div>
        <h4 className="font-medium">Next steps</h4>
        <ul className="ml-5 list-disc">{x.nextSteps.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </div>
      <div>
        <h4 className="font-medium">Training plan {x.by === "Template" && language !== "English" && <span className="text-xs font-normal text-muted-foreground">(preferred language is {language}; shown in English because AI is not available)</span>}</h4>
        <ul className="ml-5 list-disc">{x.training.map((t, i) => <li key={i}><b>{t.module}</b>: {t.why}</li>)}</ul>
        <p className="text-xs text-muted-foreground">Durations are set by the brand.</p>
      </div>
    </div>
  );
}

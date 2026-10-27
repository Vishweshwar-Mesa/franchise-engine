"use client";
// Chat over the ledger, available on every screen. "Why" questions are answered from the
// ledger (AI if configured, templates otherwise). What-ifs re-run the engine on a copy.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useResults } from "@/hooks/use-results";
import { fetchServices } from "@/hooks/use-services";
import { chatContext, localAnswer, parseUpdate, quickAnswer } from "@/lib/explain";
import { brandAnswer, guard } from "@/lib/guardrails";
import { runWhatIf, sanitizeChanges, type WhatIfOutcome } from "@/lib/whatif";
import { columnLabel } from "@/lib/parse";
import { useWorkspace } from "@/store/workspace";
import { StatusBadge } from "./status-badge";
import { WhyButton } from "./why-button";

interface Msg {
  role: "user" | "assistant";
  content: string;
  by?: "AI" | "Ledger template";
  whatIf?: WhatIfOutcome;
  /** True when the change was new information and has been applied to the real data. */
  applied?: { previous: Record<string, unknown>; assumptions: string[] };
}

export function ChatPanel() {
  const r = useResults();
  const path = usePathname();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  // Keep the newest answer in view.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [msgs, busy]);
  const hidden = path === "/" || path.startsWith("/franchisee");
  const focusId = path.startsWith("/applicant/") ? decodeURIComponent(path.split("/")[2] ?? "") : undefined;

  function whatIf(id: string, changes: Record<string, unknown>): WhatIfOutcome | null {
    const s = useWorkspace.getState();
    if (!s.dataset) return null;
    const clean = sanitizeChanges(changes);
    if (!Object.keys(clean).length) return null;
    return runWhatIf({ dataset: s.dataset, settings: s.settings, reviewer: s.reviewer, ai: s.ai, contests: s.contests }, id, clean);
  }

  async function ask() {
    const typed = q.trim();
    if (!typed || busy) return;
    setQ("");
    const next: Msg[] = [...msgs, { role: "user", content: typed }];
    setMsgs(next);
    if (!r) {
      setMsgs([...next, { role: "assistant", content: "Load a file first (Upload page).", by: "Ledger template" }]);
      return;
    }
    try {
      const g = guard(typed);
      if (g.blocked) {
        setMsgs([...next, { role: "assistant", content: g.reply, by: "Ledger template" }]);
        return;
      }
      // "How can APP-004 pass?" is answered as "What would change APP-004?".
      const question = g.rewrite ?? typed;
      const brand = brandAnswer(question);
      if (brand) {
        setMsgs([...next, { role: "assistant", content: brand, by: "Ledger template" }]);
        return;
      }
      const apps = useWorkspace.getState().dataset?.applications ?? [];
      const local = parseUpdate(question, apps);
      if (local) {
        const w = whatIf(local.id, local.changes as Record<string, unknown>);
        if (w) {
          const desc = describe(w.changes);
          if (local.hypothetical) {
            setMsgs([...next, { role: "assistant", content: `What-if for ${w.id}, re-run on a copy (nothing changed yet):${local.assumptions.length ? `\nAssumed: ${local.assumptions.join(" ")}` : ""}`, by: "Ledger template", whatIf: w }]);
          } else {
            // New information: apply it to the real data (logged, with Undo), and show how the decision moved.
            const app = apps.find((a) => a.id === w.id)!;
            const previous = Object.fromEntries(Object.keys(w.changes).map((k) => [k, app[k as keyof typeof app] ?? null]));
            useWorkspace.getState().updateApplication(w.id, w.changes as Record<string, unknown>, `New information via chat: ${desc}.${local.assumptions.length ? ` Assumed: ${local.assumptions.join(" ")}` : ""}`);
            const a = w.after.ledger[w.id];
            setMsgs([...next, {
              role: "assistant",
              content: `Updated ${w.id}: ${desc}. ${a.status === w.before.ledger[w.id].status ? `Status stays '${a.status}'.` : `Status: '${w.before.ledger[w.id].status}' → '${a.status}'.`} ${a.reason}${local.assumptions.length ? `\nAssumed: ${local.assumptions.join(" ")}` : ""}`,
              by: "Ledger template", whatIf: w, applied: { previous, assumptions: local.assumptions },
            }]);
          }
          return;
        }
      }
      const onboarding = useWorkspace.getState().onboarding;
      const quick = quickAnswer(question, r, apps, onboarding);
      if (quick) {
        setMsgs([...next, { role: "assistant", content: quick, by: "Ledger template" }]);
        return;
      }
      setBusy(true);
      try {
        const services = await fetchServices();
        if (services.ai) {
          const res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: question.slice(0, 1000),
              context: chatContext(r, focusId, question, apps, onboarding),
              // The server accepts up to 2,000 characters per turn; longer answers are cut, never dropped.
              history: msgs.slice(-6).map(({ role, content }) => ({ role, content: content.slice(0, 1900) })),
            }),
            signal: AbortSignal.timeout(30000),
          });
          const body = await res.json();
          if (body.available && typeof body.answer === "string" && body.answer.trim()) {
            let w: WhatIfOutcome | null = null;
            try {
              const id = typeof body.whatIf?.id === "string" ? Object.keys(r.ledger).find((k) => k.toLowerCase() === body.whatIf.id.toLowerCase()) : undefined;
              if (id && body.whatIf.changes && typeof body.whatIf.changes === "object") w = whatIf(id, body.whatIf.changes);
            } catch {
              w = null;
            }
            setMsgs([...next, { role: "assistant", content: body.answer, by: "AI", whatIf: w ?? undefined }]);
            return;
          }
        }
        setMsgs([...next, { role: "assistant", content: localAnswer(question, r), by: "Ledger template" }]);
      } catch {
        setMsgs([...next, { role: "assistant", content: localAnswer(question, r), by: "Ledger template" }]);
      } finally {
        setBusy(false);
      }
  
    } catch {
      // Never leave the chat stuck: anything unexpected falls back to a plain ledger answer.
      setBusy(false);
      setMsgs([...next, { role: "assistant", content: localAnswer(typed, r), by: "Ledger template" }]);
    }
  }

  if (hidden) return null;
  return (
    <Sheet>
      <SheetTrigger render={<Button className="fixed right-5 bottom-5 z-40 h-11 rounded-full px-5 shadow-lg" />}>Ask / What-if</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Ask about the results</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Answers come only from the reason ledger. Ask why, ask &quot;what if&quot; (a preview), or give new information (it updates the applicant; you can undo).
          </p>
        </SheetHeader>
        {msgs.length === 0 && r && (
          <div className="flex flex-wrap gap-1.5 px-4">
            {examples(r).map((ex) => (
              <button key={ex} type="button" onClick={() => setQ(ex)} className="rounded-full border px-3 py-1.5 text-left text-xs hover:bg-muted">{ex}</button>
            ))}
          </div>
        )}
        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "ml-8 rounded-2xl bg-muted px-3 py-2 text-sm" : "mr-4 text-sm"}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.by && <p className="mt-1 text-[10px] text-muted-foreground">Answered by: {m.by}</p>}
              {m.whatIf && <WhatIfCard w={m.whatIf} applied={m.applied} />}
            </div>
          ))}
          {busy && <p className="text-xs text-muted-foreground">Thinking…</p>}
          <div ref={end} />
        </div>
        <form
          className="space-y-2 border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
        >
          <Textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question…" rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} />
          <Button type="submit" disabled={busy || !q.trim()}>Send</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function describe(changes: Record<string, unknown>): string {
  return Object.entries(changes).filter(([k]) => k !== "notes").map(([k, v]) => `${columnLabel(k)} = ${v ?? "blank"}`).join(", ");
}

/** Example questions built from the loaded data, so they always work. */
function examples(r: NonNullable<ReturnType<typeof useResults>>): string[] {
  const all = r.order.map((id) => r.ledger[id]);
  const hold = all.find((e) => e.status === "Hold: info needed");
  const noSpace = all.find((e) => e.checks.some((c) => c.key === "space-identified" && c.result === "fail"));
  const wait = all.find((e) => e.status === "Waitlist");
  const first = all[0];
  return [
    "Summarise the results",
    hold ? `Why is ${hold.id} on hold?` : first && `Why is ${first.id} '${first.status}'?`,
    first && `What would change ${(wait ?? hold ?? first).id}?`,
    noSpace && `${noSpace.id} is now renting a 600 sq ft shop on the ground floor`,
    first && `What if ${(wait ?? first).id} had a 700 sq ft space?`,
    "Who has the highest score?",
    wait && "Who is on the waitlist?",
  ].filter((x): x is string => !!x);
}

function WhatIfCard({ w, applied }: { w: WhatIfOutcome; applied?: Msg["applied"] }) {
  const [state, setState] = useState<"preview" | "applied" | "undone">(applied ? "applied" : "preview");
  const b = w.before.ledger[w.id];
  const a = w.after.ledger[w.id];
  const desc = describe(w.changes);
  if (!b || !a) return null;
  return (
    <div className="mt-2 space-y-2 rounded-lg border p-2 text-xs">
      <p><b>{applied ? "Change applied:" : "Change (copy only):"}</b> {desc}</p>
      <div className="grid grid-cols-2 gap-2">
        <div><p className="font-medium">Before</p><StatusBadge status={b.status} /> <WhyButton entry={b} /><p>Score {b.total}/100</p><p className="text-muted-foreground">{b.reason}</p></div>
        <div><p className="font-medium">After</p><StatusBadge status={a.status} /> <WhyButton entry={a} label="Why? (after)" /><p>Score {a.total}/100</p><p className="text-muted-foreground">{a.reason}</p></div>
      </div>
      {w.knockOn.length > 0 && (
        <p><b>Also changes:</b> {w.knockOn.map((k) => `${k.id}: ${k.from} → ${k.to}`).join("; ")}</p>
      )}
      {state === "applied" && (
        <div className="flex items-center gap-2">
          <p className="text-[var(--tone-good)]">Saved to the real data and logged.</p>
          {applied && (
            <Button size="xs" variant="outline" onClick={() => {
              useWorkspace.getState().updateApplication(w.id, applied.previous, `Undid chat update to ${w.id}.`);
              setState("undone");
            }}>Undo</Button>
          )}
        </div>
      )}
      {state === "undone" && <p className="text-muted-foreground">Undone. The applicant is back to how it was.</p>}
      {state === "preview" && (
        <Button size="xs" variant="outline" onClick={() => {
          if (!window.confirm(`Apply this change to ${w.id} in the real data?`)) return;
          useWorkspace.getState().updateApplication(w.id, w.changes as Record<string, unknown>, `What-if applied by reviewer: ${desc}.`);
          setState("applied");
        }}>Apply to real data</Button>
      )}
    </div>
  );
}

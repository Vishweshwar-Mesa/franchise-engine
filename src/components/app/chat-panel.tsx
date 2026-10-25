"use client";
// Chat over the ledger, available on every screen. "Why" questions are answered from the
// ledger (AI if configured, templates otherwise). What-ifs re-run the engine on a copy.
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useResults } from "@/hooks/use-results";
import { fetchServices } from "@/hooks/use-services";
import { chatContext, localAnswer, parseWhatIf } from "@/lib/explain";
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
}

export function ChatPanel() {
  const r = useResults();
  const path = usePathname();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const hidden = path.startsWith("/franchisee");
  const focusId = path.startsWith("/applicant/") ? decodeURIComponent(path.split("/")[2] ?? "") : undefined;

  function whatIf(id: string, changes: Record<string, unknown>): WhatIfOutcome | null {
    const s = useWorkspace.getState();
    if (!s.dataset) return null;
    const clean = sanitizeChanges(changes);
    if (!Object.keys(clean).length) return null;
    return runWhatIf({ dataset: s.dataset, settings: s.settings, reviewer: s.reviewer, ai: s.ai, contests: s.contests }, id, clean);
  }

  async function ask() {
    const question = q.trim();
    if (!question || busy) return;
    setQ("");
    const next: Msg[] = [...msgs, { role: "user", content: question }];
    setMsgs(next);
    if (!r) {
      setMsgs([...next, { role: "assistant", content: "Load a file first (Upload page).", by: "Ledger template" }]);
      return;
    }
    const apps = useWorkspace.getState().dataset?.applications ?? [];
    const local = parseWhatIf(question, apps);
    if (local) {
      const w = whatIf(local.id, local.changes as Record<string, unknown>);
      if (w) {
        setMsgs([...next, { role: "assistant", content: `What-if for ${w.id}, re-run on a copy:`, by: "Ledger template", whatIf: w }]);
        return;
      }
    }
    setBusy(true);
    try {
      const services = await fetchServices();
      if (services.ai) {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, context: chatContext(r, focusId), history: msgs.slice(-6).map(({ role, content }) => ({ role, content })) }),
        });
        const body = await res.json();
        if (body.available) {
          const w = body.whatIf && r.ledger[body.whatIf.id] ? whatIf(body.whatIf.id, body.whatIf.changes) : null;
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
  }

  if (hidden) return null;
  return (
    <Sheet>
      <SheetTrigger render={<Button className="fixed right-5 bottom-5 z-40 h-11 rounded-full px-5 shadow-lg" />}>Ask / What-if</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Ask about the results</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Answers come only from the reason ledger. Try &quot;Why is APP-004 on hold?&quot; or &quot;What if APP-004 had a 700 sq ft space?&quot;
          </p>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "ml-8 rounded-2xl bg-muted px-3 py-2 text-sm" : "mr-4 text-sm"}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.by && <p className="mt-1 text-[10px] text-muted-foreground">Answered by: {m.by}</p>}
              {m.whatIf && <WhatIfCard w={m.whatIf} />}
            </div>
          ))}
          {busy && <p className="text-xs text-muted-foreground">Thinking…</p>}
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

function WhatIfCard({ w }: { w: WhatIfOutcome }) {
  const [applied, setApplied] = useState(false);
  const b = w.before.ledger[w.id];
  const a = w.after.ledger[w.id];
  const desc = Object.entries(w.changes).map(([k, v]) => `${columnLabel(k)} = ${v ?? "blank"}`).join(", ");
  return (
    <div className="mt-2 space-y-2 rounded-lg border p-2 text-xs">
      <p><b>Change (copy only):</b> {desc}</p>
      <div className="grid grid-cols-2 gap-2">
        <div><p className="font-medium">Before</p><StatusBadge status={b.status} /> <WhyButton entry={b} /><p>Score {b.total}/100</p><p className="text-muted-foreground">{b.reason}</p></div>
        <div><p className="font-medium">After</p><StatusBadge status={a.status} /> <WhyButton entry={a} label="Why? (after)" /><p>Score {a.total}/100</p><p className="text-muted-foreground">{a.reason}</p></div>
      </div>
      {w.knockOn.length > 0 && (
        <p><b>Also changes:</b> {w.knockOn.map((k) => `${k.id}: ${k.from} → ${k.to}`).join("; ")}</p>
      )}
      {applied ? (
        <p className="text-[var(--tone-good)]">Applied to the real data and logged.</p>
      ) : (
        <Button size="xs" variant="outline" onClick={() => {
          if (!window.confirm(`Apply this change to ${w.id} in the real data?`)) return;
          useWorkspace.getState().updateApplication(w.id, w.changes as Record<string, unknown>, `What-if applied by reviewer: ${desc}.`);
          setApplied(true);
        }}>Apply to real data</Button>
      )}
    </div>
  );
}

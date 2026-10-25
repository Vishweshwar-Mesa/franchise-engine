"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DEAL_FIELDS, templateEmail, type Onboarding } from "@/lib/onboarding";
import { useServices } from "@/hooks/use-services";
import { useWorkspace } from "@/store/workspace";

/** Draft in the applicant's language, shown as a preview. Real sending only to the reviewer's own address. */
export function EmailDraft({ id, name, language, o }: { id: string; name: string; language: string; o: Onboarding }) {
  const services = useServices();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (patch: Partial<Onboarding>, log?: string) => useWorkspace.getState().setOnboarding(id, patch, log);

  async function generate() {
    setBusy(true);
    const t = templateEmail(name, id, o);
    let draft = { subject: t.subject, draft: t.body, language: "English", by: "Template" as "AI" | "Template" };
    if (services?.ai) {
      try {
        const facts = {
          applicantName: name, applicationId: id,
          paperwork: ["Franchise agreement (signed)", "GST registration", `Other legal registrations: ${o.gate.other.list || "list to be confirmed by the legal/CA team"}`],
          dealTerms: Object.fromEntries(DEAL_FIELDS.filter(([k]) => o.deal[k].trim()).map(([k, l]) => [l, o.deal[k]])),
        };
        const body = await (await fetch("/api/ai/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language, facts }) })).json();
        if (body.available) draft = { subject: body.subject, draft: body.body, language, by: "AI" };
      } catch {
        /* template stays */
      }
    }
    set({ email: { ...draft } }, `Confirmation email draft generated (${draft.by}, ${draft.language}).`);
    setBusy(false);
  }

  async function sendToReviewer() {
    if (!o.email) return;
    setBusy(true);
    try {
      const body = await (await fetch("/api/email/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: o.email.subject, body: o.email.draft }) })).json();
      setMsg(body.message);
      if (body.sent) set({ email: { ...o.email, sentTo: "reviewer", sentAt: new Date().toISOString() } }, "Test copy of the confirmation email sent to the reviewer's own address.");
    } catch {
      setMsg("Could not reach the email service.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-2 rounded-[20px] border bg-card p-5 text-sm">
      <h3 className="text-base font-semibold">Confirmation email (preview)</h3>
      <Button size="sm" variant="outline" disabled={busy} onClick={generate}>{o.email ? "Regenerate draft" : "Generate draft"}</Button>
      {o.email && (
        <div className="space-y-1 rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">{o.email.by === "AI" ? `Written by AI in ${o.email.language}` : `Template in English${language !== "English" ? ` (preferred language is ${language}; AI not available)` : ""}`}</p>
          <p><b>Subject:</b> {o.email.subject}</p>
          <pre className="font-sans text-sm whitespace-pre-wrap">{o.email.draft}</pre>
        </div>
      )}
      {o.email && services?.email && <Button size="sm" disabled={busy} onClick={sendToReviewer}>Send a test copy to my (reviewer) email</Button>}
      <p className="text-xs text-muted-foreground">
        {services?.email ? "Real sending goes only to the reviewer's own address, never to the applicant." : "Preview only: no email provider is configured. Nothing is ever sent to the applicant."}
      </p>
      {msg && <p className="text-xs">{msg}</p>}
    </div>
  );
}

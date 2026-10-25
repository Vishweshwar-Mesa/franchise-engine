"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Onboarding } from "@/lib/onboarding";
import { useWorkspace } from "@/store/workspace";

export function FranchiseeAccount({ id, name, o }: { id: string; name: string; o: Onboarding }) {
  const [email, setEmail] = useState(o.account?.email ?? "");
  const [busy, setBusy] = useState(false);
  const session = useWorkspace((s) => s.sessionId);
  async function create() {
    setBusy(true);
    let res = { status: "error" as "created" | "not-created" | "error", message: "Not created: the server did not respond." };
    try {
      res = await (await fetch("/api/franchisee-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, appId: id, name, session }) })).json();
    } catch {
      /* keep default */
    }
    useWorkspace.getState().setOnboarding(id, { account: { email, status: res.status, message: res.message } }, `Franchisee account: ${res.message}`);
    setBusy(false);
  }
  return (
    <div className="space-y-2 rounded-[20px] border bg-card p-5 text-sm">
      <h3 className="text-base font-semibold">Franchisee account</h3>
      <div className="flex flex-wrap items-end gap-2">
        <div><Label htmlFor="fr-email" className="text-xs">Franchisee email (entered by reviewer)</Label><Input id="fr-email" type="email" className="w-64" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <Button size="sm" variant="outline" disabled={busy || !email} onClick={create}>Create account</Button>
        <a href={`/franchisee/${encodeURIComponent(id)}`} target="_blank" rel="noreferrer"><Button size="sm">Preview as franchisee</Button></a>
      </div>
      {o.account && <p className="text-xs">{o.account.message}</p>}
      <p className="text-xs text-muted-foreground">The account is recorded in the database; no email is sent and there is no login system. The preview opens the franchisee view with no login.</p>
    </div>
  );
}

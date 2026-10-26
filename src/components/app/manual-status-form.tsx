"use client";
import { useState } from "react";
import type { LedgerEntry } from "@/lib/engine";
import { STATUSES, type Status } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { useResults } from "@/hooks/use-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "./native-select";

/** The reviewer can change any status; a reason is required and the change is logged. */
export function ManualStatusForm({ entry }: { entry: LedgerEntry }) {
  const [status, setStatus] = useState<Status | "">(entry.manual?.status ?? "");
  const [reason, setReason] = useState("");
  const set = useWorkspace((s) => s.setManualStatus);
  const r = useResults();
  // One store per pin: Good to go is not offered on a pin with a store or one already set by hand.
  const storeCheck = entry.checks.find((c) => c.key === "same-pin-store" && c.result === "info");
  const holder = r ? Object.values(r.ledger).find((e) => e.id !== entry.id && e.pin === entry.pin && e.manual?.status === "Good to go") : undefined;
  const blocked = storeCheck ? `Pin ${entry.pin} already has an existing store` : holder ? `${holder.id} is already set to Good to go on pin ${entry.pin}` : null;
  const invalid = status === "Good to go" && !!blocked;
  return (
    <form
      className="space-y-2 rounded-[20px] border bg-card p-5 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason.trim() || invalid) return;
        set(entry.id, status || null, reason.trim());
        setReason("");
      }}
    >
      <h3 className="text-base font-semibold">Change status manually</h3>
      <p className="text-xs text-muted-foreground">Engine says: {entry.engineStatus}. A reason is required (especially for Not proceeding). Every change is logged.</p>
      <div className="flex flex-wrap gap-2">
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as Status | "")}>
          <option value="">Use engine status</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </NativeSelect>
        <Input className="min-w-64 flex-1" placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button type="submit" size="sm" disabled={!reason.trim() || invalid}>Save</Button>
      </div>
      {invalid && <p className="text-xs text-[var(--tone-pin)]">Can&apos;t set Good to go: {blocked}. The rule is one store per pin. Pick another status, or change the pin first.</p>}
    </form>
  );
}

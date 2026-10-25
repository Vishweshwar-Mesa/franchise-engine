"use client";
import { useState } from "react";
import type { LedgerEntry } from "@/lib/engine";
import { STATUSES, type Status } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "./native-select";

/** The reviewer can change any status; a reason is required and the change is logged. */
export function ManualStatusForm({ entry }: { entry: LedgerEntry }) {
  const [status, setStatus] = useState<Status | "">(entry.manual?.status ?? "");
  const [reason, setReason] = useState("");
  const set = useWorkspace((s) => s.setManualStatus);
  return (
    <form
      className="space-y-2 rounded-3xl border bg-card p-5 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        set(entry.id, status || null, reason.trim());
        setReason("");
      }}
    >
      <h3 className="font-serif text-lg font-medium">Change status manually</h3>
      <p className="text-xs text-muted-foreground">Engine says: {entry.engineStatus}. A reason is required (especially for Not proceeding). Every change is logged.</p>
      <div className="flex flex-wrap gap-2">
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as Status | "")}>
          <option value="">Use engine status</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </NativeSelect>
        <Input className="min-w-64 flex-1" placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button type="submit" size="sm" disabled={!reason.trim()}>Save</Button>
      </div>
    </form>
  );
}

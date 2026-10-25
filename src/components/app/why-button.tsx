"use client";
import type { LedgerEntry } from "@/lib/engine";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LedgerView } from "./ledger-view";

/** "Why?" opens the ledger entry behind a status or action. */
export function WhyButton({ entry, label = "Why?" }: { entry: LedgerEntry; label?: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="link" size="xs" className="h-auto px-0" />}>{label}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entry.id} · {entry.name || "name missing"}: reason ledger</DialogTitle>
        </DialogHeader>
        <LedgerView entry={entry} compact />
      </DialogContent>
    </Dialog>
  );
}

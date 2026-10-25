"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEAL_FIELDS, type Onboarding, type PaymentRow } from "@/lib/onboarding";
import { useWorkspace } from "@/store/workspace";

/** Every field is blank until the reviewer enters it. Go Colors has published none of these terms. */
export function DealTermsForm({ id, o }: { id: string; o: Onboarding }) {
  const set = (patch: Partial<Onboarding>) => useWorkspace.getState().setOnboarding(id, patch);
  const setPay = (i: number, patch: Partial<PaymentRow>) => set({ payments: o.payments.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  return (
    <div className="space-y-3 rounded-[20px] border bg-card p-5 text-sm">
      <h3 className="text-base font-semibold">Deal terms</h3>
      <p className="text-xs text-muted-foreground">Blank until you enter them (can be filled during the paperwork gate; they are part of the agreement). Nothing is prefilled: Go Colors has not published franchise fee, royalty, deposit or onboarding terms.</p>
      <div className="grid gap-2 md:grid-cols-2">
        {DEAL_FIELDS.map(([k, label]) => (
          <div key={k}>
            <Label htmlFor={`deal-${k}`} className="text-xs">{label}</Label>
            <Input id={`deal-${k}`} placeholder="not set" value={o.deal[k]} onChange={(e) => set({ deal: { ...o.deal, [k]: e.target.value } })} />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <h4 className="font-medium">Payment schedule</h4>
        {o.payments.length === 0 && <p className="text-xs text-muted-foreground">No payments entered.</p>}
        {o.payments.map((p, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <div><Label htmlFor={`pay-l-${i}`} className="text-xs">What</Label><Input id={`pay-l-${i}`} value={p.label} onChange={(e) => setPay(i, { label: e.target.value })} /></div>
            <div><Label htmlFor={`pay-a-${i}`} className="text-xs">Amount</Label><Input id={`pay-a-${i}`} placeholder="not set" value={p.amount} onChange={(e) => setPay(i, { amount: e.target.value })} /></div>
            <div><Label htmlFor={`pay-d-${i}`} className="text-xs">Due (days after Day 0)</Label><Input id={`pay-d-${i}`} className="w-32" placeholder="not set" value={p.dueDay} onChange={(e) => setPay(i, { dueDay: e.target.value })} /></div>
            <label className="flex items-center gap-1 text-xs"><Checkbox aria-label="Paid" checked={p.done} onCheckedChange={(v) => setPay(i, { done: !!v })} /> Paid</label>
            <Button size="xs" variant="ghost" onClick={() => set({ payments: o.payments.filter((_, j) => j !== i) })}>Remove</Button>
          </div>
        ))}
        <Button size="xs" variant="outline" onClick={() => set({ payments: [...o.payments, { label: "", amount: "", dueDay: "", done: false }] })}>Add payment</Button>
      </div>
    </div>
  );
}

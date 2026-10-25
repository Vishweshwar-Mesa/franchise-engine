"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dayZero, gateComplete, type GateItem, type Onboarding } from "@/lib/onboarding";
import { useWorkspace } from "@/store/workspace";

type Key = keyof Onboarding["gate"];
const ITEMS: { key: Key; label: string; upload: string; link?: { href: string; text: string } }[] = [
  { key: "agreement", label: "Franchise agreement signed", upload: "Upload the signed agreement" },
  { key: "gst", label: "GST registration done", upload: "Upload the GST certificate (optional)", link: { href: "https://www.gst.gov.in/", text: "GST portal (gst.gov.in), the government's official registration site" } },
  { key: "other", label: "Other legal registrations done", upload: "Upload a document (optional)" },
];

/** The tool does not verify any of this, and gives no legal or tax advice. */
export function PaperworkGate({ id, o }: { id: string; o: Onboarding }) {
  const session = useWorkspace((s) => s.sessionId);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const update = (key: Key, patch: Partial<GateItem & { list: string }>, log?: string) =>
    useWorkspace.getState().setOnboarding(id, { gate: { ...o.gate, [key]: { ...o.gate[key], ...patch } } }, log);

  async function upload(key: Key, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("session", session);
    fd.append("appId", id);
    fd.append("item", key);
    let res = { stored: false, path: null as string | null, message: "Upload failed; only the file name is kept." };
    try {
      res = { ...res, ...(await (await fetch("/api/upload", { method: "POST", body: fd })).json()) };
    } catch {
      /* keep defaults */
    }
    update(key, { file: { name: file.name, path: res.path ?? null, stored: res.stored } }, `Document '${file.name}' added to ${key} (${res.stored ? "stored" : "name only"}).`);
    setMsg({ ...msg, [key]: res.message });
  }

  const complete = gateComplete(o);
  return (
    <div className="space-y-3 rounded-xl border p-4 text-sm">
      <h3 className="font-semibold">Paperwork gate</h3>
      <p className="text-xs text-muted-foreground">
        The reviewer ticks these off. The tool does not verify them, does not state tax rates, thresholds or durations, and gives no legal or tax advice.
      </p>
      {ITEMS.map((it) => {
        const item = o.gate[it.key];
        return (
          <div key={it.key} className="space-y-2 rounded-lg border p-3">
            <label className="flex items-center gap-2 font-medium">
              <Checkbox aria-label={it.label} checked={item.done} onCheckedChange={(v) => update(it.key, { done: !!v, date: v ? item.date ?? new Date().toISOString().slice(0, 10) : item.date }, `${it.label}: ${v ? "ticked" : "unticked"}.`)} />
              {it.label}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor={`date-${it.key}`} className="text-xs">Date completed</Label>
              <Input id={`date-${it.key}`} type="date" className="w-44" value={item.date ?? ""} onChange={(e) => update(it.key, { date: e.target.value || null })} />
              <Label htmlFor={`file-${it.key}`} className="text-xs">{it.upload}</Label>
              <input id={`file-${it.key}`} type="file" className="text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(it.key, f); e.target.value = ""; }} />
            </div>
            {item.file && <p className="text-xs">Document: {item.file.name} ({item.file.stored ? "stored privately" : "name only, not stored"})</p>}
            {msg[it.key] && <p className="text-xs text-muted-foreground">{msg[it.key]}</p>}
            {it.key === "other" && (
              <div>
                <Label htmlFor="other-list" className="text-xs">Registrations required (list from the brand&apos;s legal/CA team)</Label>
                <Textarea id="other-list" rows={2} value={o.gate.other.list} onChange={(e) => update("other", { list: e.target.value })} />
              </div>
            )}
            <p className="text-xs text-amber-800">Confirm with the brand&apos;s legal/CA team.</p>
            {it.link && <a className="text-xs underline" href={it.link.href} target="_blank" rel="noreferrer">{it.link.text}</a>}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={!complete || o.stage === "Onboarding"}
          onClick={() => useWorkspace.getState().setOnboarding(id, { stage: "Onboarding", startedAt: new Date().toISOString() }, `Onboarding started. Day 0 = ${dayZero(o)}.`)}
        >
          {o.stage === "Onboarding" ? "Onboarding started" : "Start onboarding"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {complete ? `Day 0 = ${dayZero(o)} (the date the last gate item was completed).` : "Enabled when every item is ticked and dated."}
        </span>
      </div>
    </div>
  );
}

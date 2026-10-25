"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { parseWorkbook } from "@/lib/parse";
import type { ValidationReport } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { loadDemoWorkspace } from "@/lib/load-demo";

/** Upload box plus one-click sample files. Parsing happens in the browser. */
export function UploadPanel({ onReport }: { onReport: (r: ValidationReport) => void }) {
  const [busy, setBusy] = useState(false);
  const hasData = useWorkspace((s) => !!s.dataset);

  function load(buf: ArrayBuffer, name: string) {
    if (hasData && !window.confirm("Replace the current data? Reviewer inputs for the current file will be cleared.")) return;
    let d;
    try {
      d = parseWorkbook(buf, name);
    } catch {
      onReport({ fileName: name, sheetsFound: [], rowsRead: { applications: 0, territories: 0, stores: 0 }, problems: [], fatal: "This file could not be read." });
      return;
    }
    onReport(d.report);
    if (!d.report.fatal) useWorkspace.getState().loadDataset(d);
  }

  async function loadSample(path: string, name: string) {
    setBusy(true);
    try {
      const res = await fetch(path);
      load(await res.arrayBuffer(), name);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5">
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center text-sm transition-colors hover:border-primary hover:bg-muted/50">
        <span className="font-serif text-xl font-medium">Drop or choose the applications file (.xlsx)</span>
        <input
          type="file"
          accept=".xlsx,.xls"
          className="mt-2 block w-full text-xs"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) load(await f.arrayBuffer(), f.name);
            e.target.value = "";
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button className="h-10 rounded-full px-5" disabled={busy} onClick={() => loadSample("/samples/template.xlsx", "template.xlsx (case sample)")}>Load sample data</Button>
        <Button
          variant="outline"
          className="h-10 rounded-full px-5"
          disabled={busy}
          onClick={async () => {
            if (hasData && !window.confirm("Replace the current data with the demo data?")) return;
            setBusy(true);
            await loadDemoWorkspace();
            setBusy(false);
          }}
        >
          Load demo data (30 synthetic applicants with traps)
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Required columns in the Applications sheet: Application ID, Applicant name, City, State, Pin code, Investment capacity (₹ lakh),
        Retail experience (years), Space available. Columns are found by name, so order does not matter. Applicants link to territories by pin code.
        The sample is the case&apos;s template (one example row). The demo data is made up: 30 applicants with deliberate problems to show every check.
      </p>
    </div>
  );
}

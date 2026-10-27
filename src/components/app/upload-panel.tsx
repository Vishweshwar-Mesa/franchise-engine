"use client";
import { parseWorkbook } from "@/lib/parse";
import type { ValidationReport } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";

/** Upload box plus the blank template to fill in. Parsing happens in the browser. */
export function UploadPanel({ onReport }: { onReport: (r: ValidationReport) => void }) {
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

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border bg-card p-5">
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center text-sm transition-colors hover:border-primary hover:bg-muted/50">
        <span className="text-lg font-semibold">Drop or choose the applications file (.xlsx, or .csv for applications only)</span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="mt-2 block w-full text-xs"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) load(await f.arrayBuffer(), f.name);
            e.target.value = "";
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <a href="/samples/template.xlsx" download="Franchise_applications_template.xlsx" className="h-10 rounded-full border px-5 text-sm leading-10 font-semibold transition hover:bg-muted">Download the Excel template</a>
      </div>
      <p className="text-xs text-muted-foreground">
        Required columns in the Applications sheet: Application ID, Applicant name, City, State, Pin code, Investment capacity (₹ lakh),
        Retail experience (years), Space available. Columns are found by name, so order does not matter. Applicants link to territories by pin code.
        The template has the same sheets and headers; its grey example row is skipped when you fill in real rows below it.
      </p>
    </div>
  );
}

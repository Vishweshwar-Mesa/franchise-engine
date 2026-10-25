"use client";
import { useState } from "react";
import Link from "next/link";
import { UploadPanel } from "@/components/app/upload-panel";
import { ValidationReportView } from "@/components/app/validation-report";
import { RowIssues } from "@/components/app/row-issues";
import { StatusCounts } from "@/components/app/status-counts";
import { PageHeader } from "@/components/app/page-header";
import { useResults } from "@/hooks/use-results";
import { useWorkspace } from "@/store/workspace";
import type { ValidationReport } from "@/lib/types";

export default function UploadPage() {
  const stored = useWorkspace((s) => s.dataset?.report ?? null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const r = useResults();
  const shown = report ?? stored;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Start here"
        title="Bring in the applications"
        sub="Upload the applications Excel file, or try the case sample. Until you do, the app shows demo data."
      />
      <UploadPanel onReport={setReport} />
      {shown && <ValidationReportView report={shown} />}
      {r && <RowIssues r={r} />}
      {r && (
        <div className="flex flex-col gap-3">
          <StatusCounts counts={r.counts} />
          <Link href="/results" className="self-start rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Open the applicants →</Link>
        </div>
      )}
    </div>
  );
}

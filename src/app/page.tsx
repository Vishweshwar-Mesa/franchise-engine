"use client";
import { useState } from "react";
import Link from "next/link";
import { UploadPanel } from "@/components/app/upload-panel";
import { ValidationReportView } from "@/components/app/validation-report";
import { StatusCounts } from "@/components/app/status-counts";
import { useResults } from "@/hooks/use-results";
import { useWorkspace } from "@/store/workspace";
import type { ValidationReport } from "@/lib/types";

export default function Home() {
  const stored = useWorkspace((s) => s.dataset?.report ?? null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const r = useResults();
  const shown = report ?? stored;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Upload applications</h1>
      <UploadPanel onReport={setReport} />
      {shown && <ValidationReportView report={shown} />}
      {r && (
        <div className="space-y-2">
          <StatusCounts counts={r.counts} />
          <Link href="/results" className="inline-block text-sm font-medium underline">Open the results dashboard →</Link>
        </div>
      )}
    </div>
  );
}

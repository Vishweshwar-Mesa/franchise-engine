import type { ValidationReport } from "@/lib/types";

export function ValidationReportView({ report }: { report: ValidationReport }) {
  return (
    <div className="space-y-2 rounded-3xl border bg-card p-5 text-sm">
      <h3 className="font-serif text-lg font-medium">Validation report: {report.fileName}</h3>
      {report.fatal ? (
        <p className="rounded bg-[var(--tone-pin-bg)] p-2 text-[var(--tone-pin)]">{report.fatal}</p>
      ) : (
        <p>
          Read {report.rowsRead.applications} applicants, {report.rowsRead.territories} territories, {report.rowsRead.stores} existing stores.
          {report.sheetsFound.length > 0 && <> Sheets: {report.sheetsFound.join(", ")}.</>}
        </p>
      )}
      {report.problems.length > 0 ? (
        <>
          <p className="font-medium">{report.problems.length} file-level note(s):</p>
          <ul className="max-h-64 list-disc overflow-y-auto pl-5 text-xs">
            {report.problems.map((p, i) => (
              <li key={i}>
                {p.sheet}{p.row ? ` row ${p.row}` : ""}{p.id ? ` (${p.id})` : ""}: {p.message}
              </li>
            ))}
          </ul>
        </>
      ) : (
        !report.fatal && <p className="text-xs text-muted-foreground">No file-level problems. Row-level checks are on the Results page.</p>
      )}
    </div>
  );
}

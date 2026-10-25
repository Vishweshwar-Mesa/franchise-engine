// Export results as CSV or XLSX: status, reason and next steps per applicant.
import * as XLSX from "xlsx";
import type { EngineResult } from "./engine";

export function exportRows(r: EngineResult) {
  return r.order.map((id) => {
    const e = r.ledger[id];
    const f = Object.fromEntries(e.factors.map((x) => [x.key, x.provided ? `${x.points}/${x.max} (${x.light})` : "not provided"]));
    return {
      "Application ID": e.id, "Applicant name": e.name, City: e.city, "Pin code": e.pin,
      Territory: e.territory?.id ?? "", Status: e.status, "Engine status": e.engineStatus, Reason: e.reason,
      "Score /100": e.total, "Score rescaled": e.rescaled ? "Yes (financial profile not provided)" : "No",
      Space: f.space, Money: f.money, Experience: f.experience, "Financial profile": f.financial,
      "Rank in territory": e.rank ? `${e.rank} of ${e.rankOf}` : "", "Waitlist position": e.waitlistPosition ?? "",
      "Fixes needed": e.fixes.join(" | "), Flags: e.flags.map((x) => x.text).join(" | "),
      "What would change this": e.whatWouldChange.join(" | "), "Next steps": e.nextSteps.join(" | "),
      "Profile used": e.profile.name,
    };
  });
}

export function downloadExport(r: EngineResult, kind: "csv" | "xlsx") {
  const ws = XLSX.utils.json_to_sheet(exportRows(r));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  XLSX.writeFile(wb, `franchise-results.${kind}`, { bookType: kind });
}

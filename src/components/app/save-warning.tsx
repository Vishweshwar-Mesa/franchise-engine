"use client";
import { useSaveHealth } from "@/lib/save-health";

/** Says so when the work is not being kept: blocked or full browser storage, or a failed database save. */
export function SaveWarning() {
  const { browser, server } = useSaveHealth();
  if (browser && server === "ok") return null;
  const text = !browser
    ? "This browser is not saving your work (private browsing or storage full). It stays while this tab is open; a reload may lose it."
    : server === "too-big"
      ? "This file is too big to back up to the database. Your work is saved in this browser only."
      : "Couldn't back up to the database just now. Your work is still saved in this browser.";
  return <div role="status" className="bg-[var(--tone-info-bg)] px-4 py-2 text-center text-xs font-medium text-[var(--tone-info)]">{text}</div>;
}

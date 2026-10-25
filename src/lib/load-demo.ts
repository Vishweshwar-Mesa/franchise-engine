"use client";
import { parseWorkbook } from "./parse";
import { useWorkspace } from "@/store/workspace";

/**
 * Loads the synthetic 30-applicant demo file (public/samples/demo-messy.xlsx). False if it could not be read.
 * `auto`: the first-visit load; it gives way if the person loaded something else while the file downloaded.
 */
export async function loadDemoWorkspace(auto = false): Promise<boolean> {
  const before = useWorkspace.getState().dataset;
  try {
    const res = await fetch("/samples/demo-messy.xlsx");
    const d = parseWorkbook(await res.arrayBuffer(), "demo-messy.xlsx (synthetic, 30 applicants)");
    if (d.report.fatal) return false;
    if (auto && useWorkspace.getState().dataset !== before) return false;
    useWorkspace.getState().loadDemo(d);
    return true;
  } catch {
    return false;
  }
}

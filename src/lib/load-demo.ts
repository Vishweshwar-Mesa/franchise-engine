"use client";
import { parseWorkbook } from "./parse";
import { useWorkspace } from "@/store/workspace";

/** Loads the synthetic 30-applicant demo file (public/samples/demo-messy.xlsx). False if it could not be read. */
export async function loadDemoWorkspace(): Promise<boolean> {
  try {
    const res = await fetch("/samples/demo-messy.xlsx");
    const d = parseWorkbook(await res.arrayBuffer(), "demo-messy.xlsx (synthetic, 30 applicants)");
    if (d.report.fatal) return false;
    useWorkspace.getState().loadDemo(d);
    return true;
  } catch {
    return false;
  }
}

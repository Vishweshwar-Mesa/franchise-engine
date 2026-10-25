"use client";
import { buildDemoWorkspace } from "./demo-workspace";
import { parseWorkbook } from "./parse";
import { useWorkspace } from "@/store/workspace";

/** Loads the pre-filled demo workspace (synthetic data). Returns false if the file could not be read. */
export async function loadDemoWorkspace(): Promise<boolean> {
  try {
    const res = await fetch("/samples/demo-showcase.xlsx");
    const d = parseWorkbook(await res.arrayBuffer(), "demo-showcase.xlsx (synthetic demo workspace)");
    if (d.report.fatal) return false;
    useWorkspace.getState().loadDemo(buildDemoWorkspace(d));
    return true;
  } catch {
    return false;
  }
}

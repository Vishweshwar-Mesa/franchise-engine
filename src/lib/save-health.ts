"use client";
// Whether this browser and the database are actually keeping the reviewer's work. Read by the
// save warning banner; written by the storage wrapper and the database sync.
import { create } from "zustand";

function browserCanSave(): boolean {
  try {
    localStorage.setItem("fe-probe", "1");
    localStorage.removeItem("fe-probe");
    return true;
  } catch {
    return typeof window === "undefined";
  }
}

export const useSaveHealth = create<{ browser: boolean; server: "ok" | "failed" | "too-big" }>(() => ({ browser: browserCanSave(), server: "ok" }));

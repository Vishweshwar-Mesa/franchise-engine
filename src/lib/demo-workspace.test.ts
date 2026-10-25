import { describe, expect, it } from "vitest";
import * as fs from "fs";
import { buildDemoWorkspace } from "./demo-workspace";
import { runEngine } from "./engine";
import { buildTimeline, gateComplete } from "./onboarding";
import { parseWorkbook } from "./parse";

describe("demo workspace", () => {
  const d = parseWorkbook(new Uint8Array(fs.readFileSync("public/samples/demo-showcase.xlsx")).buffer, "demo-showcase.xlsx");
  const w = buildDemoWorkspace(d, new Date("2026-10-25T00:00:00Z"));
  const r = runEngine({ dataset: w.dataset, settings: w.settings, reviewer: w.reviewer, ai: {}, contests: w.contests });

  it("has 10 applicants covering the main statuses", () => {
    expect(d.applications).toHaveLength(10);
    expect(d.report.problems).toHaveLength(0);
    expect(r.ledger["APP-101"].status).toBe("Good to go");
    expect(r.ledger["APP-102"].status).toBe("Good to go");
    expect(r.ledger["APP-104"].status).toBe("Needs your decision");
    expect(r.ledger["APP-105"].status).toBe("Needs your decision");
    expect(r.ledger["APP-106"].status).toBe("Waitlist");
    expect(r.ledger["APP-107"].status).toBe("Waitlist");
    expect(r.ledger["APP-109"].status).toBe("Hold: info needed");
    expect(r.ledger["APP-110"].status).toBe("Hold: pin occupied");
    expect(r.ledger["APP-106"].flags.some((f) => f.kind === "liabilities")).toBe(true);
  });

  it("has two applicants in onboarding: one running, one awaiting paperwork", () => {
    expect(Object.keys(w.onboarding)).toEqual(["APP-101", "APP-102"]);
    expect(gateComplete(w.onboarding["APP-101"])).toBe(true);
    expect(w.onboarding["APP-101"].stage).toBe("Onboarding");
    expect(buildTimeline(w.onboarding["APP-101"], "softLaunch").tasks.every((t) => t.start !== null)).toBe(true);
    expect(w.onboarding["APP-102"].stage).toBe("Awaiting paperwork");
  });

  it("invents no fees: money terms stay blank", () => {
    for (const o of Object.values(w.onboarding)) {
      expect(o.deal.franchiseFee).toBe("");
      expect(o.deal.royalty).toBe("");
      expect(o.deal.securityDeposit).toBe("");
      expect(o.payments.every((p) => p.amount === "")).toBe(true);
    }
  });
});

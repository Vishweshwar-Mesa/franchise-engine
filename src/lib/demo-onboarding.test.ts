import { describe, expect, it } from "vitest";
import * as fs from "fs";
import { demoOnboarding } from "./demo-onboarding";
import { runEngine } from "./engine";
import { buildTimeline, gateComplete } from "./onboarding";
import { parseWorkbook } from "./parse";
import { DEFAULT_SETTINGS } from "./settings";

describe("demo onboarding cases", () => {
  const { onboarding } = demoOnboarding(new Date("2026-10-25T00:00:00Z"));
  const d = parseWorkbook(new Uint8Array(fs.readFileSync("public/samples/demo-messy.xlsx")).buffer, "demo");
  const r = runEngine({ dataset: d, settings: DEFAULT_SETTINGS, reviewer: {}, ai: {}, contests: {} });

  it("uses applicants who are Good to go in the demo file", () => {
    for (const id of Object.keys(onboarding)) expect(r.ledger[id].status).toBe("Good to go");
  });
  it("has two timelines running and one awaiting paperwork", () => {
    expect(Object.values(onboarding).filter((o) => o.stage === "Onboarding" && gateComplete(o))).toHaveLength(2);
    expect(onboarding["APP-005"].stage).toBe("Awaiting paperwork");
    expect(buildTimeline(onboarding["APP-025"], "softLaunch").tasks.every((t) => t.start !== null)).toBe(true);
  });
  it("invents no money terms", () => {
    for (const o of Object.values(onboarding)) {
      expect([o.deal.franchiseFee, o.deal.royalty, o.deal.securityDeposit]).toEqual(["", "", ""]);
      expect(o.payments.every((p) => p.amount === "")).toBe(true);
    }
  });
});

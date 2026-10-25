import { describe, expect, it } from "vitest";
import { buildTimeline, computedSoftLaunch, dayZero, gateComplete, newOnboarding, templateEmail, type Onboarding } from "./onboarding";

function gated(): Onboarding {
  const o = newOnboarding("2026-10-01T00:00:00Z");
  o.gate.agreement = { done: true, date: "2026-10-05", file: null };
  o.gate.gst = { done: true, date: "2026-10-12", file: null };
  o.gate.other = { done: true, date: "2026-10-08", file: null, list: "Shop licence" };
  o.stage = "Onboarding";
  return o;
}

describe("paperwork gate", () => {
  it("is incomplete until every item is ticked and dated", () => {
    const o = newOnboarding("x");
    expect(gateComplete(o)).toBe(false);
    expect(buildTimeline(o, "softLaunch").tasks).toHaveLength(0);
    o.gate.agreement = { done: true, date: null, file: null };
    expect(gateComplete(o)).toBe(false);
  });
  it("Day 0 = the date the last gate item was completed", () => {
    expect(dayZero(gated())).toBe("2026-10-12");
  });
});

describe("timeline", () => {
  it("prefills no durations and asks for them", () => {
    const { tasks } = buildTimeline(gated(), "softLaunch");
    const phases = tasks.filter((t) => t.kind === "phase");
    expect(phases.every((t) => t.length === null && t.missing === "set duration")).toBe(true);
    expect(tasks.filter((t) => t.kind === "checkin").every((t) => t.missing === "set soft-launch date")).toBe(true);
  });
  it("places phases in order once durations are set", () => {
    const o = gated();
    o.phases.stock.duration = "10";
    o.phases.pos.duration = "5";
    o.phases.training.duration = "7";
    const { tasks } = buildTimeline(o, "softLaunch");
    expect(tasks.find((t) => t.id === "training")?.start).toBe(15);
    expect(tasks.find((t) => t.id === "softLaunch")?.start).toBe(22);
    expect(computedSoftLaunch(o)).toBe("2026-11-03");
  });
  it("counts check-ins from the soft-launch date by default, or from Day 0 if chosen", () => {
    const o = gated();
    o.softLaunchDate = "2026-11-01";
    expect(buildTimeline(o, "softLaunch").tasks.find((t) => t.id === "checkin-30")?.start).toBe(20 + 30);
    expect(buildTimeline(o, "day0").tasks.find((t) => t.id === "checkin-30")?.start).toBe(30);
  });
  it("places payments by their due day", () => {
    const o = gated();
    o.payments = [{ label: "Fee", amount: "", dueDay: "3", done: false }, { label: "Deposit", amount: "", dueDay: "", done: false }];
    const t = buildTimeline(o, "softLaunch").tasks;
    expect(t[0].start).toBe(3);
    expect(t[1].missing).toBe("set due day");
  });
  it("email template states no invented terms", () => {
    const e = templateEmail("Ravi", "APP-001", gated());
    expect(e.body).not.toMatch(/₹|\d+%/);
  });
});

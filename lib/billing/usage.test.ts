import { describe, expect, it } from "vitest";
import { currentMonthlyUsage, daysLeftInMonthlyPeriod } from "./usage";

describe("currentMonthlyUsage", () => {
  it("returns the raw count when the period start is the current calendar month", () => {
    const profile = { monthly_analyses_used: 7, monthly_period_start: "2026-08-01" };
    expect(currentMonthlyUsage(profile, new Date("2026-08-15T12:00:00.000Z"))).toBe(7);
  });

  it("returns 0 when the stored period is a stale prior month (not yet rolled over)", () => {
    const profile = { monthly_analyses_used: 42, monthly_period_start: "2026-07-01" };
    expect(currentMonthlyUsage(profile, new Date("2026-08-15T12:00:00.000Z"))).toBe(0);
  });
});

describe("daysLeftInMonthlyPeriod", () => {
  it("counts the days remaining until the first of next month", () => {
    expect(daysLeftInMonthlyPeriod(new Date("2026-08-01T00:00:00.000Z"))).toBe(31);
    expect(daysLeftInMonthlyPeriod(new Date("2026-08-30T00:00:00.000Z"))).toBe(2);
  });

  it("is never negative, and a fresh month boundary starts a new full count", () => {
    // The last moment of August has ~0 days left in *that* month...
    expect(daysLeftInMonthlyPeriod(new Date("2026-08-31T23:59:00.000Z"))).toBeGreaterThanOrEqual(0);
    // ...but the instant the clock rolls into September, "now"'s month is
    // September, which has its own 30 days left — not a leftover 0.
    expect(daysLeftInMonthlyPeriod(new Date("2026-09-01T00:00:00.000Z"))).toBe(30);
  });

  it("handles a short month (February, not a leap year in 2026) correctly", () => {
    expect(daysLeftInMonthlyPeriod(new Date("2026-02-27T00:00:00.000Z"))).toBe(2);
  });
});

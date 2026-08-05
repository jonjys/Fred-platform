import { describe, expect, it } from "vitest";
import { calculateMargin, calculateMarginGap, calculateROI } from "./roi";

describe("calculateROI", () => {
  it("computes positive ROI and a bounded payback period", () => {
    const result = calculateROI({
      investmentCost: 1200,
      expectedMonthlyBenefit: 200,
      horizonMonths: 12,
    });

    // total benefit over 12mo = 2400, net = 2400 - 1200 = 1200
    expect(result.netBenefit).toBe(1200);
    expect(result.roiPercentage).toBe(100);
    expect(result.paybackPeriodMonths).toBe(6);
  });

  it("returns null payback when benefit never covers the investment within the horizon", () => {
    const result = calculateROI({
      investmentCost: 10000,
      expectedMonthlyBenefit: 100,
      horizonMonths: 12,
    });

    expect(result.paybackPeriodMonths).toBeNull();
    expect(result.netBenefit).toBeLessThan(0);
  });

  it("returns null payback and 0% ROI when there is no monetized benefit", () => {
    const result = calculateROI({
      investmentCost: 500,
      expectedMonthlyBenefit: 0,
      horizonMonths: 12,
    });

    expect(result.paybackPeriodMonths).toBeNull();
    expect(result.roiPercentage).toBe(-100);
  });
});

describe("calculateMargin", () => {
  it("computes margin percentage", () => {
    expect(calculateMargin(1000, 700)).toBe(30);
  });

  it("returns 0 for zero revenue instead of dividing by zero", () => {
    expect(calculateMargin(0, 700)).toBe(0);
  });
});

describe("calculateMarginGap", () => {
  it("computes the gap between actual and target margin", () => {
    expect(calculateMarginGap(25, 30)).toBe(-5);
    expect(calculateMarginGap(35, 30)).toBe(5);
  });
});

import { describe, expect, it } from "vitest";
import { buildCostBreakdown, calculateTCO, calculateVAT, compareCostAlternatives } from "./cost";
import type { CostLineItem } from "./types";

describe("calculateVAT", () => {
  it("computes VAT on a VAT-exclusive subtotal", () => {
    expect(calculateVAT(1000, 0.21)).toBe(210);
  });

  it("returns 0 for a 0% VAT rate", () => {
    expect(calculateVAT(1000, 0)).toBe(0);
  });
});

describe("buildCostBreakdown", () => {
  it("only applies VAT to vatApplicable line items", () => {
    const lineItems: CostLineItem[] = [
      { label: "Subscription", amount: 100, category: "subscription", recurring: true, vatApplicable: true },
      { label: "Government stamp duty", amount: 50, category: "other", recurring: false, vatApplicable: false },
    ];

    const breakdown = buildCostBreakdown(lineItems, 0.21, "EUR");

    expect(breakdown.subtotalExclVat).toBe(150);
    expect(breakdown.vatAmount).toBe(21); // 21% of 100 only
    expect(breakdown.totalInclVat).toBe(171);
  });
});

describe("calculateTCO", () => {
  it("projects recurring costs across 1-year and 3-year horizons", () => {
    const result = calculateTCO({
      currency: "EUR",
      vatRate: 0.21,
      oneOffItems: [
        { label: "Setup fee", amount: 500, category: "setup", recurring: false, vatApplicable: true },
      ],
      recurringMonthlyItems: [
        { label: "Subscription", amount: 100, category: "subscription", recurring: true, vatApplicable: true },
      ],
      contractLengthMonths: 0, // month-to-month, no early termination
    });

    // year1: 500 setup + 100*12 = 1700 excl VAT
    expect(result.year1.subtotalExclVat).toBe(1700);
    expect(result.year1.totalInclVat).toBe(2057); // 1700 * 1.21

    // year3: 500 setup + 100*36 = 4100 excl VAT
    expect(result.year3.subtotalExclVat).toBe(4100);

    expect(result.monthlyRecurringCost).toBe(100);
  });

  it("keeps accruing recurring cost past the initial contract term (assumes renewal)", () => {
    const result = calculateTCO({
      currency: "EUR",
      vatRate: 0,
      oneOffItems: [],
      recurringMonthlyItems: [
        { label: "Subscription", amount: 100, category: "subscription", recurring: true, vatApplicable: false },
      ],
      contractLengthMonths: 6, // initial term is 6 months, but the subscription continues beyond it
    });

    // year1 horizon is 12 months — a 6-month initial term doesn't cap it
    expect(result.year1.subtotalExclVat).toBe(1200);
    // year3 horizon is 36 months
    expect(result.year3.subtotalExclVat).toBe(3600);
  });

  it("surfaces hidden fees separately in the result", () => {
    const result = calculateTCO({
      currency: "EUR",
      vatRate: 0,
      oneOffItems: [
        { label: "Mystery integration fee", amount: 250, category: "hidden_fee", recurring: false, vatApplicable: false },
      ],
      recurringMonthlyItems: [],
      contractLengthMonths: 12,
    });

    expect(result.hiddenFeesTotal).toBe(250);
  });
});

describe("compareCostAlternatives", () => {
  it("flags the cheapest option and computes deltas relative to it", () => {
    const comparison = compareCostAlternatives([
      { id: "vendor-a", label: "Vendor A", totalCost: 1000 },
      { id: "vendor-b", label: "Vendor B", totalCost: 830 },
    ]);

    const vendorA = comparison.find((c) => c.id === "vendor-a")!;
    const vendorB = comparison.find((c) => c.id === "vendor-b")!;

    expect(vendorB.isCheapest).toBe(true);
    expect(vendorA.isCheapest).toBe(false);
    expect(vendorA.deltaFromCheapest).toBe(170);
    // Vendor A is ~20.48% more expensive than Vendor B
    expect(vendorA.deltaFromCheapestPercentage).toBeCloseTo(20.48, 1);
  });

  it("returns an empty array for no alternatives", () => {
    expect(compareCostAlternatives([])).toEqual([]);
  });
});

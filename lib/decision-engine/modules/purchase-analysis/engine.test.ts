import { describe, expect, it } from "vitest";
import { calculatePurchaseMetrics } from "./engine";
import type { PurchaseAnalysisInput, PurchaseOffer } from "./types";
import type { CompanyContext } from "../../types";

// Note: "negative margin" isn't a scenario purchase-analysis's deterministic
// engine has an opinion on — CompanyContext.targetMargin flows only into
// the AI prompt (prompt.ts) as qualitative context for Claude, never into
// calculateMetrics. calculateMargin/calculateMarginGap (roi.ts), the
// primitives a margin-aware module would use, already have their own
// negative/zero-edge-case coverage in roi.test.ts.

function baseOffer(overrides: Partial<PurchaseOffer> = {}): PurchaseOffer {
  return {
    vendorName: "Acme SaaS",
    upfrontCost: 0,
    monthlyCost: 0,
    hiddenFees: 0,
    contractLengthMonths: 12,
    ...overrides,
  };
}

function baseContext(overrides: Partial<CompanyContext> = {}): CompanyContext {
  return {
    id: "company-1",
    companyName: "Test Co",
    industry: null,
    country: "SE",
    currency: "EUR",
    vatRate: 0.25,
    targetMargin: null,
    budget: null,
    softwareStack: [],
    preferences: {},
    ...overrides,
  };
}

function baseInput(overrides: Partial<PurchaseAnalysisInput> = {}): PurchaseAnalysisInput {
  return {
    decisionTitle: "Test decision",
    primaryOffer: baseOffer(),
    alternativeOffers: [],
    ...overrides,
  };
}

describe("calculatePurchaseMetrics — zero cost", () => {
  it("produces an all-zero TCO with no VAT and no ROI, rather than dividing by zero anywhere", () => {
    const metrics = calculatePurchaseMetrics(baseInput(), baseContext());

    expect(metrics.primary.tco.year1.totalInclVat).toBe(0);
    expect(metrics.primary.tco.year3.totalInclVat).toBe(0);
    expect(metrics.primary.tco.year1.vatAmount).toBe(0);
    expect(metrics.primary.roi).toBeNull();
  });
});

describe("calculatePurchaseMetrics — VAT", () => {
  it("applies the company's default VAT rate to VAT-applicable costs", () => {
    const input = baseInput({ primaryOffer: baseOffer({ upfrontCost: 1000, monthlyCost: 0 }) });
    const metrics = calculatePurchaseMetrics(input, baseContext({ vatRate: 0.25 }));

    expect(metrics.primary.tco.year1.subtotalExclVat).toBe(1000);
    expect(metrics.primary.tco.year1.vatAmount).toBe(250);
    expect(metrics.primary.tco.year1.totalInclVat).toBe(1250);
  });

  it("prefers an explicit per-decision vatRate override over the company default", () => {
    const input = baseInput({ primaryOffer: baseOffer({ upfrontCost: 1000 }), vatRate: 0.1 });
    const metrics = calculatePurchaseMetrics(input, baseContext({ vatRate: 0.25 }));

    expect(metrics.primary.tco.year1.vatAmount).toBe(100);
  });
});

describe("calculatePurchaseMetrics — 3-year (36 month) horizon", () => {
  it("accrues recurring cost for the full 36 months regardless of a shorter contract length", () => {
    // Regression case for the earlier bug where year3 == year1 for any
    // contract shorter than 36 months (projectHorizon incorrectly stopped
    // accruing recurring cost at contractLengthMonths instead of the
    // requested horizon).
    const input = baseInput({
      primaryOffer: baseOffer({ upfrontCost: 0, monthlyCost: 100, contractLengthMonths: 12 }),
    });
    const metrics = calculatePurchaseMetrics(input, baseContext({ vatRate: 0 }));

    expect(metrics.primary.tco.year1.totalInclVat).toBe(1200); // 100 * 12
    expect(metrics.primary.tco.year3.totalInclVat).toBe(3600); // 100 * 36, NOT 100 * 12
    expect(metrics.primary.tco.year3.totalInclVat).not.toBe(metrics.primary.tco.year1.totalInclVat);
  });
});

describe("calculatePurchaseMetrics — rounding", () => {
  it("keeps 3-year totals exact to 2 decimals for costs prone to float drift", () => {
    // 19.99 * 36 = 719.64 exactly, but naive floating point multiplication
    // (or summing 36 individually-rounded months) can drift by fractions of
    // a cent — assert the exact value, not just "close to."
    const input = baseInput({
      primaryOffer: baseOffer({ upfrontCost: 0, monthlyCost: 19.99, contractLengthMonths: 36 }),
    });
    const metrics = calculatePurchaseMetrics(input, baseContext({ vatRate: 0 }));

    expect(metrics.primary.tco.year3.subtotalExclVat).toBe(719.64);
    expect(Number.isInteger(metrics.primary.tco.year3.subtotalExclVat * 100)).toBe(true);
  });

  it("keeps VAT-inclusive totals exact to 2 decimals with a non-round VAT rate", () => {
    const input = baseInput({ primaryOffer: baseOffer({ upfrontCost: 33.33, monthlyCost: 0 }) });
    const metrics = calculatePurchaseMetrics(input, baseContext({ vatRate: 0.21 }));

    // 33.33 * 0.21 = 6.9993 -> rounds to 7.00
    expect(metrics.primary.tco.year1.vatAmount).toBe(7);
    expect(metrics.primary.tco.year1.totalInclVat).toBe(40.33);
  });
});

describe("calculatePurchaseMetrics — budget fit", () => {
  it("is null/unknown when the company has no budget configured", () => {
    const metrics = calculatePurchaseMetrics(baseInput(), baseContext({ budget: null }));
    expect(metrics.budgetFit.withinBudget).toBeNull();
  });

  it("flags over-budget against a monthly budget using the monthly recurring cost", () => {
    const input = baseInput({ primaryOffer: baseOffer({ monthlyCost: 500 }) });
    const metrics = calculatePurchaseMetrics(
      input,
      baseContext({ budget: { amount: 400, period: "monthly" } }),
    );

    expect(metrics.budgetFit.withinBudget).toBe(false);
    expect(metrics.budgetFit.relevantCost).toBe(500);
  });

  it("flags within-budget when the primary offer fits", () => {
    const input = baseInput({ primaryOffer: baseOffer({ monthlyCost: 300 }) });
    const metrics = calculatePurchaseMetrics(
      input,
      baseContext({ budget: { amount: 400, period: "monthly" } }),
    );

    expect(metrics.budgetFit.withinBudget).toBe(true);
  });
});

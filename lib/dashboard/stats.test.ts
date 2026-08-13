import { describe, expect, it } from "vitest";
import { computeDashboardStats, computeSavingsTrend } from "./stats";
import type { DecisionRow } from "@/lib/database/repositories/decisions";

const NOW = new Date("2026-08-12T12:00:00.000Z");

function decision(overrides: Partial<DecisionRow>): DecisionRow {
  return {
    id: "d1",
    company_id: "c1",
    created_by: "u1",
    module_key: "purchase-analysis",
    module_version: "1",
    title: "Test",
    status: "completed",
    input_data: {},
    deterministic_metrics: null,
    ai_analysis: null,
    verdict_code: null,
    verdict_confidence: null,
    verdict: null,
    risks: [],
    recommended_actions: [],
    final_decision: null,
    final_decision_notes: null,
    decided_at: null,
    outcome: null,
    outcome_recorded_at: null,
    error: null,
    created_at: "2026-08-10T00:00:00.000Z",
    updated_at: "2026-08-10T00:00:00.000Z",
    ...overrides,
  };
}

function withRoi(roiPercentage: number, netBenefit: number, currency = "EUR") {
  return {
    primary: {
      vendorName: "Acme",
      tco: { currency, year1: {}, year3: {}, monthlyRecurringCost: 0, hiddenFeesTotal: 0 },
      roi: { roiPercentage, netBenefit, paybackPeriodMonths: 6 },
    },
    alternatives: [],
    comparison: [],
    budgetFit: { withinBudget: null, budgetAmount: null, relevantCost: 0 },
  };
}

describe("computeDashboardStats", () => {
  it("counts decisions from the last 30 days across every module", () => {
    const decisions = [
      decision({ created_at: "2026-08-11T00:00:00.000Z", module_key: "purchase-analysis" }),
      decision({ created_at: "2026-06-01T00:00:00.000Z", module_key: "purchase-analysis" }),
    ];
    expect(computeDashboardStats(decisions, NOW).decisionsLast30Days).toBe(1);
  });

  it("returns nulls for ROI stats when no decision has ROI computed", () => {
    const stats = computeDashboardStats([decision({})], NOW);
    expect(stats.avgRoiPercentage).toBeNull();
    expect(stats.totalNetBenefit).toBeNull();
  });

  it("averages ROI and sums net benefit across purchase-analysis decisions", () => {
    const decisions = [
      decision({ deterministic_metrics: withRoi(20, 1000) as never }),
      decision({ deterministic_metrics: withRoi(40, 2000) as never }),
    ];
    const stats = computeDashboardStats(decisions, NOW);
    expect(stats.avgRoiPercentage).toBe(30);
    expect(stats.totalNetBenefit).toBe(3000);
    expect(stats.totalNetBenefitCurrency).toBe("EUR");
  });

  it("only sums net benefit for the majority currency, not mixed currencies", () => {
    const decisions = [
      decision({ deterministic_metrics: withRoi(20, 1000, "EUR") as never }),
      decision({ deterministic_metrics: withRoi(20, 1000, "EUR") as never }),
      decision({ deterministic_metrics: withRoi(20, 500, "SEK") as never }),
    ];
    const stats = computeDashboardStats(decisions, NOW);
    expect(stats.totalNetBenefit).toBe(2000);
    expect(stats.totalNetBenefitCurrency).toBe("EUR");
  });

  it("ignores decisions from other modules when computing ROI stats", () => {
    const decisions = [decision({ module_key: "debt-optimization", deterministic_metrics: withRoi(20, 1000) as never })];
    const stats = computeDashboardStats(decisions, NOW);
    expect(stats.avgRoiPercentage).toBeNull();
  });

  describe("totalSaved", () => {
    it("excludes negative-net-benefit decisions rather than netting them against positive ones", () => {
      const decisions = [
        decision({ deterministic_metrics: withRoi(20, 1000) as never }),
        decision({ deterministic_metrics: withRoi(-10, -500) as never }),
      ];
      const stats = computeDashboardStats(decisions, NOW);

      // totalNetBenefit is the true (possibly negative) figure...
      expect(stats.totalNetBenefit).toBe(500);
      // ...totalSaved only ever counts the positive contributions.
      expect(stats.totalSaved).toBe(1000);
    });

    it("is null when every decision has a negative or zero net benefit", () => {
      const decisions = [decision({ deterministic_metrics: withRoi(-10, -500) as never })];
      const stats = computeDashboardStats(decisions, NOW);

      expect(stats.totalNetBenefit).toBe(-500);
      expect(stats.totalSaved).toBeNull();
    });
  });
});

describe("computeSavingsTrend", () => {
  it("sums only the last 30 days into currentPeriod, excluding older decisions", () => {
    const decisions = [
      decision({ created_at: "2026-08-10T00:00:00.000Z", deterministic_metrics: withRoi(20, 1000) as never }),
      decision({ created_at: "2026-05-01T00:00:00.000Z", deterministic_metrics: withRoi(20, 5000) as never }),
    ];
    const trend = computeSavingsTrend(decisions, NOW);
    expect(trend.currentPeriod.total).toBe(1000);
  });

  it("sums days 31-60 back into previousPeriod", () => {
    const decisions = [
      decision({ created_at: "2026-06-20T00:00:00.000Z", deterministic_metrics: withRoi(20, 2000) as never }),
    ];
    const trend = computeSavingsTrend(decisions, NOW);
    expect(trend.previousPeriod.total).toBe(2000);
  });

  it("computes a positive trend percentage when current beats previous", () => {
    const decisions = [
      decision({ created_at: "2026-08-10T00:00:00.000Z", deterministic_metrics: withRoi(20, 1500) as never }),
      decision({ created_at: "2026-06-20T00:00:00.000Z", deterministic_metrics: withRoi(20, 1000) as never }),
    ];
    const trend = computeSavingsTrend(decisions, NOW);
    expect(trend.trendPercentage).toBe(50);
  });

  it("is null when there is no previous-period data to compare against", () => {
    const decisions = [
      decision({ created_at: "2026-08-10T00:00:00.000Z", deterministic_metrics: withRoi(20, 1000) as never }),
    ];
    const trend = computeSavingsTrend(decisions, NOW);
    expect(trend.trendPercentage).toBeNull();
  });

  it("is null rather than dividing by zero when the previous period total is zero", () => {
    // netBenefit <= 0 entries are excluded entirely, so a previous period
    // with only a loss has no positive total to divide by — not a 0.
    const decisions = [
      decision({ created_at: "2026-08-10T00:00:00.000Z", deterministic_metrics: withRoi(20, 1000) as never }),
      decision({ created_at: "2026-06-20T00:00:00.000Z", deterministic_metrics: withRoi(-5, -200) as never }),
    ];
    const trend = computeSavingsTrend(decisions, NOW);
    expect(trend.trendPercentage).toBeNull();
  });

  it("is null when the two periods' majority currencies differ", () => {
    const decisions = [
      decision({ created_at: "2026-08-10T00:00:00.000Z", deterministic_metrics: withRoi(20, 1000, "SEK") as never }),
      decision({ created_at: "2026-06-20T00:00:00.000Z", deterministic_metrics: withRoi(20, 1000, "EUR") as never }),
    ];
    const trend = computeSavingsTrend(decisions, NOW);
    expect(trend.trendPercentage).toBeNull();
  });
});

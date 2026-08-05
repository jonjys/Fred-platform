/**
 * Layer 1 — Deterministic ROI / margin engine.
 *
 * Same rules as cost.ts: pure functions, no AI, fully unit-testable, and
 * generic over "an investment with a monetized benefit" rather than tied to
 * purchase-analysis specifically.
 */
import type { ROIResult } from "./types";
import { round2 } from "./math";

export interface CalculateROIParams {
  /** Total amount committed (e.g. year-1 TCO, or a project's upfront investment). */
  investmentCost: number;
  /** Monetized benefit expected per month (cost savings, revenue gain, efficiency gain). */
  expectedMonthlyBenefit: number;
  /** Evaluation horizon in months, used to bound payback period and total benefit. */
  horizonMonths: number;
}

export function calculateROI(params: CalculateROIParams): ROIResult {
  const { investmentCost, expectedMonthlyBenefit, horizonMonths } = params;

  const totalBenefit = expectedMonthlyBenefit * horizonMonths;
  const netBenefit = round2(totalBenefit - investmentCost);
  const roiPercentage = investmentCost !== 0 ? round2((netBenefit / investmentCost) * 100) : 0;

  const rawPaybackMonths = expectedMonthlyBenefit > 0 ? Math.ceil(investmentCost / expectedMonthlyBenefit) : null;
  const paybackPeriodMonths = rawPaybackMonths !== null && rawPaybackMonths <= horizonMonths ? rawPaybackMonths : null;

  return { roiPercentage, netBenefit, paybackPeriodMonths };
}

/** Standard margin percentage: (revenue - cost) / revenue. */
export function calculateMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return round2(((revenue - cost) / revenue) * 100);
}

/** Difference between a company's target margin and an actual margin, in
 * percentage points. Positive = actual margin exceeds target. */
export function calculateMarginGap(actualMarginPercentage: number, targetMarginPercentage: number): number {
  return round2(actualMarginPercentage - targetMarginPercentage);
}

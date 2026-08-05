/**
 * Layer 1 — Deterministic Cost Engine.
 *
 * Pure TypeScript. No AI, no network calls, no I/O. Every function here is a
 * plain (input) => output computation and is fully unit-testable in
 * isolation (see cost.test.ts).
 *
 * These functions are intentionally generic — "TCO of a set of cost line
 * items" — rather than "TCO of a purchase". The purchase-analysis module
 * (lib/decision-engine/modules/purchase-analysis/engine.ts) composes them
 * into `calculatePurchaseMetrics()`; a future module (e.g. procurement
 * comparing multiple suppliers) composes the exact same functions without
 * this file changing at all.
 */
import type { CostLineItem, CurrencyCode, TCOBreakdown, TCOResult } from "./types";
import { round2, sum } from "./math";

/** VAT amount for a VAT-exclusive subtotal. */
export function calculateVAT(subtotalExclVat: number, vatRate: number): number {
  return round2(subtotalExclVat * vatRate);
}

/**
 * Aggregates a flat list of cost line items into a VAT-aware breakdown.
 * VAT is only applied to items flagged `vatApplicable`.
 */
export function buildCostBreakdown(
  lineItems: CostLineItem[],
  vatRate: number,
  currency: CurrencyCode,
): TCOBreakdown {
  const subtotalExclVat = round2(sum(lineItems.map((item) => item.amount)));
  const vatableBase = sum(lineItems.filter((item) => item.vatApplicable).map((item) => item.amount));
  const vatAmount = calculateVAT(vatableBase, vatRate);
  const totalInclVat = round2(subtotalExclVat + vatAmount);

  return {
    currency,
    lineItems,
    subtotalExclVat,
    vatAmount,
    vatRate,
    totalInclVat,
  };
}

export interface CalculateTCOParams {
  currency: CurrencyCode;
  /** 0..1, e.g. 0.21 for 21%. */
  vatRate: number;
  /** Costs charged once, at the start (setup fees, upfront licence cost, one-time hidden fees). */
  oneOffItems: CostLineItem[];
  /** Costs charged every month for as long as the contract is active. */
  recurringMonthlyItems: CostLineItem[];
  /** Length of the committed contract in months. `0` or negative is treated
   * as month-to-month (recurring costs run for the full evaluation horizon). */
  contractLengthMonths: number;
}

const YEAR1_HORIZON_MONTHS = 12;
const YEAR3_HORIZON_MONTHS = 36;

/**
 * Projects Total Cost of Ownership over the two horizons the product always
 * reports: 1 year and 3 years. Recurring costs accrue for
 * min(horizon, contractLengthMonths) months — if a contract ends before the
 * horizon, we never invent a renewal cost.
 */
export function calculateTCO(params: CalculateTCOParams): TCOResult {
  const { currency, vatRate, oneOffItems, recurringMonthlyItems, contractLengthMonths } = params;

  const year1 = projectHorizon(oneOffItems, recurringMonthlyItems, contractLengthMonths, YEAR1_HORIZON_MONTHS, vatRate, currency);
  const year3 = projectHorizon(oneOffItems, recurringMonthlyItems, contractLengthMonths, YEAR3_HORIZON_MONTHS, vatRate, currency);

  const monthlyRecurringCost = round2(sum(recurringMonthlyItems.map((item) => item.amount)));
  const hiddenFeesTotal = round2(
    sum(year1.lineItems.filter((item) => item.category === "hidden_fee").map((item) => item.amount)),
  );

  return { currency, year1, year3, monthlyRecurringCost, hiddenFeesTotal };
}

function projectHorizon(
  oneOffItems: CostLineItem[],
  recurringMonthlyItems: CostLineItem[],
  contractLengthMonths: number,
  horizonMonths: number,
  vatRate: number,
  currency: CurrencyCode,
): TCOBreakdown {
  const activeMonths = contractLengthMonths > 0 ? Math.min(horizonMonths, contractLengthMonths) : horizonMonths;

  const projectedRecurring: CostLineItem[] = recurringMonthlyItems.map((item) => ({
    ...item,
    label: `${item.label} (${activeMonths} mo)`,
    amount: round2(item.amount * activeMonths),
  }));

  return buildCostBreakdown([...oneOffItems, ...projectedRecurring], vatRate, currency);
}

export interface CostAlternative {
  id: string;
  label: string;
  totalCost: number;
}

export interface CostAlternativeComparison extends CostAlternative {
  isCheapest: boolean;
  deltaFromCheapest: number;
  deltaFromCheapestPercentage: number;
}

/**
 * Ranks a set of cost totals (e.g. Vendor A vs Vendor B's 3-year TCO) against
 * the cheapest option. Generic over what an "alternative" represents, so it
 * powers today's "Vendor A vs Vendor B" comparison and tomorrow's
 * Supplier Comparison module identically.
 */
export function compareCostAlternatives(alternatives: CostAlternative[]): CostAlternativeComparison[] {
  if (alternatives.length === 0) return [];

  const cheapest = Math.min(...alternatives.map((alt) => alt.totalCost));

  return alternatives.map((alt) => {
    const deltaFromCheapest = round2(alt.totalCost - cheapest);
    const deltaFromCheapestPercentage = cheapest !== 0 ? round2((deltaFromCheapest / cheapest) * 100) : 0;

    return {
      ...alt,
      isCheapest: alt.totalCost === cheapest,
      deltaFromCheapest,
      deltaFromCheapestPercentage,
    };
  });
}

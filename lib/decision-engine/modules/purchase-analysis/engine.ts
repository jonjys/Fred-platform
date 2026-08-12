/**
 * Purchase-analysis's Layer 1 entry point. This is the only file where
 * "purchase" business logic lives — it composes the generic primitives in
 * cost.ts / roi.ts rather than reimplementing TCO or ROI math.
 */
import { calculateTCO, compareCostAlternatives } from "../../cost";
import type { DecisionEngine } from "../../engine-interface";
import { calculateROI } from "../../roi";
import type { CompanyContext } from "../../types";
import { purchaseAnalysisInputSchema } from "./schemas";
import type { PurchaseAnalysisInput, PurchaseAnalysisMetrics, PurchaseOffer, PurchaseOfferMetrics } from "./types";

function calculateOfferMetrics(
  offer: PurchaseOffer,
  vatRate: number,
  context: CompanyContext,
  expectedMonthlyBenefit: number | undefined,
): PurchaseOfferMetrics {
  const tco = calculateTCO({
    currency: context.currency,
    vatRate,
    oneOffItems: [
      { label: "Upfront cost", amount: offer.upfrontCost, category: "upfront", recurring: false, vatApplicable: true },
      ...(offer.hiddenFees > 0
        ? [{ label: "Hidden / undisclosed fees", amount: offer.hiddenFees, category: "hidden_fee" as const, recurring: false, vatApplicable: true }]
        : []),
    ],
    recurringMonthlyItems: [
      { label: "Subscription", amount: offer.monthlyCost, category: "subscription", recurring: true, vatApplicable: true },
    ],
    contractLengthMonths: offer.contractLengthMonths,
  });

  const roi =
    expectedMonthlyBenefit !== undefined
      ? calculateROI({
          investmentCost: tco.year1.totalInclVat,
          expectedMonthlyBenefit,
          horizonMonths: 12,
        })
      : null;

  return { vendorName: offer.vendorName, tco, roi };
}

export function calculatePurchaseMetrics(
  input: PurchaseAnalysisInput,
  context: CompanyContext,
): PurchaseAnalysisMetrics {
  const vatRate = input.vatRate ?? context.vatRate;

  const primary = calculateOfferMetrics(input.primaryOffer, vatRate, context, input.expectedMonthlyBenefit);
  const alternatives = input.alternativeOffers.map((offer) =>
    calculateOfferMetrics(offer, vatRate, context, input.expectedMonthlyBenefit),
  );

  const comparison = compareCostAlternatives(
    [primary, ...alternatives].map((offerMetrics) => ({
      id: offerMetrics.vendorName,
      label: offerMetrics.vendorName,
      totalCost: offerMetrics.tco.year3.totalInclVat,
    })),
  );

  const budgetFit = resolveBudgetFit(primary, context);

  return { primary, alternatives, comparison, budgetFit };
}

function resolveBudgetFit(
  primary: PurchaseOfferMetrics,
  context: CompanyContext,
): PurchaseAnalysisMetrics["budgetFit"] {
  if (!context.budget) {
    return { withinBudget: null, budgetAmount: null, relevantCost: primary.tco.year1.totalInclVat };
  }

  const relevantCost =
    context.budget.period === "monthly" ? primary.tco.monthlyRecurringCost : primary.tco.year1.totalInclVat;

  return {
    withinBudget: relevantCost <= context.budget.amount,
    budgetAmount: context.budget.amount,
    relevantCost,
  };
}

/**
 * The portable `DecisionEngine` wrapper around `calculatePurchaseMetrics`
 * above — same computation, unchanged. `calculate` requires `context`
 * (unlike the interface's optional second parameter) because every part of
 * this calculation is currency/VAT/budget-aware; there's no meaningful
 * context-free purchase-analysis result.
 */
export const purchaseAnalysisEngine: DecisionEngine<PurchaseAnalysisInput, PurchaseAnalysisMetrics> = {
  id: "purchase-analysis",
  name: "Purchase Analysis Engine",
  version: "1",
  validate: (input) => {
    const parsed = purchaseAnalysisInputSchema.safeParse(input);
    if (!parsed.success) {
      return { valid: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`) };
    }
    return { valid: true, data: parsed.data };
  },
  calculate: (input, context) => {
    if (!context) {
      throw new Error("purchaseAnalysisEngine.calculate requires a CompanyContext (currency/VAT/budget-dependent).");
    }
    return { result: calculatePurchaseMetrics(input, context) };
  },
  getMetadata: () => ({
    id: "purchase-analysis",
    name: "Purchase Analysis Engine",
    version: "1",
    description: "Deterministic TCO, ROI, and budget-fit calculation for a purchase decision.",
  }),
};

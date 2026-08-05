import type { CostAlternativeComparison } from "../../cost";
import type { ROIResult, TCOResult } from "../../types";

export interface PurchaseOffer {
  vendorName: string;
  upfrontCost: number;
  monthlyCost: number;
  /** One-off fees not disclosed in the headline price (integration, onboarding, mandatory add-ons...). */
  hiddenFees: number;
  /** 0 = month-to-month / no commitment. */
  contractLengthMonths: number;
  notes?: string;
}

export interface PurchaseAnalysisInput {
  decisionTitle: string;
  primaryOffer: PurchaseOffer;
  /** Competing offers the user wants compared against the primary one — the
   * "Supplier alternatives" surfaced in the product spec. May be empty. */
  alternativeOffers: PurchaseOffer[];
  /** Overrides the company's default VAT rate for this specific decision. */
  vatRate?: number;
  /** Monetized monthly benefit (savings, revenue impact) — enables the ROI
   * calculation. Optional because it isn't always knowable up front. */
  expectedMonthlyBenefit?: number;
  /** Raw extracted text from uploaded documents, passed through for the AI
   * layer's contract-risk and hidden-fee reasoning. Never used by the
   * deterministic engine. */
  documentText?: string;
}

export interface PurchaseOfferMetrics {
  vendorName: string;
  tco: TCOResult;
  roi: ROIResult | null;
}

export interface PurchaseAnalysisMetrics {
  primary: PurchaseOfferMetrics;
  alternatives: PurchaseOfferMetrics[];
  /** All offers (primary + alternatives) ranked by 3-year TCO. */
  comparison: CostAlternativeComparison[];
  budgetFit: {
    withinBudget: boolean | null;
    budgetAmount: number | null;
    relevantCost: number;
  };
}

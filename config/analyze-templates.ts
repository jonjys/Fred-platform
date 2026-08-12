/**
 * Starting points offered from the dashboard's empty state — purely UI
 * prefill data (decision title / notes / whether to add an alternative
 * offer slot), read via the `template` query param on /analyze. No
 * calculation logic, no server round-trip.
 */
export interface AnalyzeTemplate {
  decisionTitle: string;
  notes?: string;
  addAlternativeOffer?: boolean;
}

export const ANALYZE_TEMPLATES: Record<string, AnalyzeTemplate> = {
  "saas-purchase": {
    decisionTitle: "New SaaS subscription",
  },
  "compare-suppliers": {
    decisionTitle: "Supplier comparison",
    addAlternativeOffer: true,
  },
  "contract-renewal": {
    decisionTitle: "Contract renewal review",
    notes: "Compare the renewal terms against what you're paying today.",
  },
};

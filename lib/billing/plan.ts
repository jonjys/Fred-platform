/**
 * The single paid plan this milestone ships. Deliberately just constants —
 * when a second tier exists, this becomes a small registry the same way
 * config/tools.ts registers Decision Modules, rather than branching logic
 * scattered across the checkout route and billing page.
 */
export const UPGRADE_PLAN = {
  name: "FRED Pro",
  description: "50 analyser per månad",
  currency: "sek",
  /** In öre (SEK's minor unit), matching Stripe's integer-minor-unit convention. */
  unitAmount: 49900,
  interval: "month" as const,
  /** Single source of truth for the Pro usage cap — consumed by both the
   * /api/analyze gate and the billing page's usage display. */
  monthlyAnalysisLimit: 50,
};

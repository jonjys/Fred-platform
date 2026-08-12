import type { DecisionRow } from "@/lib/database/repositories/decisions";
import type { PurchaseAnalysisMetrics } from "@/lib/decision-engine/modules/purchase-analysis/types";

export interface DashboardStats {
  decisionsLast30Days: number;
  /** Average of roiPercentage across decisions where ROI was computed (an
   * optional part of purchase-analysis, present only when the user provided
   * expectedMonthlyBenefit). Null when no decision has one yet. */
  avgRoiPercentage: number | null;
  /** Sum of netBenefit across decisions sharing the most common currency
   * among ROI-bearing decisions — deliberately not summed across mismatched
   * currencies (a company could plausibly run analyses in more than one).
   * Null when no decision has ROI computed. */
  totalNetBenefit: number | null;
  totalNetBenefitCurrency: string | null;
}

/**
 * Pure, module-scoped aggregation for the dashboard's stat tiles. Reads
 * only from data every purchase-analysis decision already has
 * (deterministic_metrics) — no schema change, no new query shape. Other
 * Decision Modules are simply skipped for the ROI/net-benefit figures since
 * their metrics shape is module-defined and unknown here; decisionsLast30Days
 * counts every module.
 */
export function computeDashboardStats(decisions: DecisionRow[], now: Date = new Date()): DashboardStats {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const decisionsLast30Days = decisions.filter((decision) => new Date(decision.created_at) >= thirtyDaysAgo).length;

  const roiEntries = decisions
    .filter((decision) => decision.module_key === "purchase-analysis")
    .map((decision) => (decision.deterministic_metrics as PurchaseAnalysisMetrics | null)?.primary)
    .filter((primary): primary is PurchaseAnalysisMetrics["primary"] => primary != null && primary.roi != null)
    .map((primary) => ({
      roiPercentage: primary.roi!.roiPercentage,
      netBenefit: primary.roi!.netBenefit,
      currency: primary.tco.currency,
    }));

  if (roiEntries.length === 0) {
    return { decisionsLast30Days, avgRoiPercentage: null, totalNetBenefit: null, totalNetBenefitCurrency: null };
  }

  const avgRoiPercentage = roiEntries.reduce((sum, entry) => sum + entry.roiPercentage, 0) / roiEntries.length;

  const currencyCounts = new Map<string, number>();
  for (const entry of roiEntries) currencyCounts.set(entry.currency, (currencyCounts.get(entry.currency) ?? 0) + 1);
  const [primaryCurrency] = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null];

  const matchingEntries = primaryCurrency ? roiEntries.filter((entry) => entry.currency === primaryCurrency) : [];
  const totalNetBenefit = matchingEntries.length > 0 ? matchingEntries.reduce((sum, e) => sum + e.netBenefit, 0) : null;

  return {
    decisionsLast30Days,
    avgRoiPercentage,
    totalNetBenefit,
    totalNetBenefitCurrency: totalNetBenefit != null ? primaryCurrency : null,
  };
}

import type { DecisionRow } from "@/lib/database/repositories/decisions";
import type { PurchaseAnalysisMetrics } from "@/lib/decision-engine/modules/purchase-analysis/types";

export interface DashboardStats {
  decisionsLast30Days: number;
  /** Average of roiPercentage across decisions where ROI was computed (an
   * optional part of purchase-analysis, present only when the user provided
   * expectedMonthlyBenefit). Null when no decision has one yet. */
  avgRoiPercentage: number | null;
  /** The true net figure — can be negative. Kept around (unused by the
   * dashboard's stat tile, which shows `totalSaved` instead) rather than
   * deleted, since collapsing it into a positive-only number would corrupt
   * the underlying data model, not just its presentation. */
  totalNetBenefit: number | null;
  totalNetBenefitCurrency: string | null;
  /** Sum of netBenefit across only the decisions where it was positive —
   * this is what the dashboard leads with ("Total Saved"), since a mixed
   * positive/negative net figure is a confusing headline number and a
   * literal negative one reads as "this product loses you money." Every
   * decision (including ones with a negative outcome) still shows its real
   * numbers on its own detail page — this only changes what the dashboard
   * highlights, not what data exists. */
  totalSaved: number | null;
  totalSavedCurrency: string | null;
}

interface RoiEntry {
  roiPercentage: number;
  netBenefit: number;
  currency: string;
}

/** Sums `netBenefit` across entries sharing the most common currency in the
 * set — deliberately not summed across mismatched currencies (a company
 * could plausibly run analyses in more than one). Null if the set is empty. */
function sumByMajorityCurrency(entries: RoiEntry[]): { total: number | null; currency: string | null } {
  if (entries.length === 0) return { total: null, currency: null };

  const currencyCounts = new Map<string, number>();
  for (const entry of entries) currencyCounts.set(entry.currency, (currencyCounts.get(entry.currency) ?? 0) + 1);
  const [primaryCurrency] = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null];

  const matchingEntries = primaryCurrency ? entries.filter((entry) => entry.currency === primaryCurrency) : [];
  const total = matchingEntries.length > 0 ? matchingEntries.reduce((sum, e) => sum + e.netBenefit, 0) : null;

  return { total, currency: total != null ? primaryCurrency : null };
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

  const roiEntries: RoiEntry[] = decisions
    .filter((decision) => decision.module_key === "purchase-analysis")
    .map((decision) => (decision.deterministic_metrics as PurchaseAnalysisMetrics | null)?.primary)
    .filter((primary): primary is PurchaseAnalysisMetrics["primary"] => primary != null && primary.roi != null)
    .map((primary) => ({
      roiPercentage: primary.roi!.roiPercentage,
      netBenefit: primary.roi!.netBenefit,
      currency: primary.tco.currency,
    }));

  if (roiEntries.length === 0) {
    return {
      decisionsLast30Days,
      avgRoiPercentage: null,
      totalNetBenefit: null,
      totalNetBenefitCurrency: null,
      totalSaved: null,
      totalSavedCurrency: null,
    };
  }

  const avgRoiPercentage = roiEntries.reduce((sum, entry) => sum + entry.roiPercentage, 0) / roiEntries.length;
  const { total: totalNetBenefit, currency: totalNetBenefitCurrency } = sumByMajorityCurrency(roiEntries);
  const { total: totalSaved, currency: totalSavedCurrency } = sumByMajorityCurrency(
    roiEntries.filter((entry) => entry.netBenefit > 0),
  );

  return {
    decisionsLast30Days,
    avgRoiPercentage,
    totalNetBenefit,
    totalNetBenefitCurrency,
    totalSaved,
    totalSavedCurrency,
  };
}

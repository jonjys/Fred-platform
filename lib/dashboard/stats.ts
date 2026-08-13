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
  createdAt: Date;
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

/** Shared extraction — every ROI-aware stat (all-time totals, 30-day trend)
 * starts from this same set of purchase-analysis decisions that actually
 * have a computed ROI. */
function extractRoiEntries(decisions: DecisionRow[]): RoiEntry[] {
  return decisions
    .filter((decision) => decision.module_key === "purchase-analysis")
    .map((decision) => ({
      primary: (decision.deterministic_metrics as PurchaseAnalysisMetrics | null)?.primary,
      createdAt: new Date(decision.created_at),
    }))
    .filter(
      (entry): entry is { primary: PurchaseAnalysisMetrics["primary"]; createdAt: Date } =>
        entry.primary != null && entry.primary.roi != null,
    )
    .map((entry) => ({
      roiPercentage: entry.primary.roi!.roiPercentage,
      netBenefit: entry.primary.roi!.netBenefit,
      currency: entry.primary.tco.currency,
      createdAt: entry.createdAt,
    }));
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

  const roiEntries = extractRoiEntries(decisions);

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

export interface SavingsTrend {
  currentPeriod: { total: number | null; currency: string | null };
  previousPeriod: { total: number | null; currency: string | null };
  /** (current - previous) / previous * 100. Null whenever the two periods
   * aren't comparable: no previous-period data, a previous total of zero
   * (division by zero), or a different majority currency between the two
   * windows — a percentage change across currencies isn't a real number. */
  trendPercentage: number | null;
}

/**
 * The dashboard's "Sparade pengar" card wants a 30-day figure with a trend
 * against the prior 30 days, not the "since start" total `totalSaved`
 * already shows elsewhere — this is a separate computation rather than a
 * breaking change to computeDashboardStats' existing contract.
 */
export function computeSavingsTrend(decisions: DecisionRow[], now: Date = new Date()): SavingsTrend {
  const periodMs = 30 * 24 * 60 * 60 * 1000;
  const currentPeriodStart = new Date(now.getTime() - periodMs);
  const previousPeriodStart = new Date(now.getTime() - 2 * periodMs);

  const roiEntries = extractRoiEntries(decisions).filter((entry) => entry.netBenefit > 0);

  const currentEntries = roiEntries.filter((entry) => entry.createdAt >= currentPeriodStart && entry.createdAt <= now);
  const previousEntries = roiEntries.filter(
    (entry) => entry.createdAt >= previousPeriodStart && entry.createdAt < currentPeriodStart,
  );

  const currentPeriod = sumByMajorityCurrency(currentEntries);
  const previousPeriod = sumByMajorityCurrency(previousEntries);

  let trendPercentage: number | null = null;
  if (
    currentPeriod.total != null &&
    previousPeriod.total != null &&
    previousPeriod.total !== 0 &&
    currentPeriod.currency === previousPeriod.currency
  ) {
    trendPercentage = ((currentPeriod.total - previousPeriod.total) / previousPeriod.total) * 100;
  }

  return { currentPeriod, previousPeriod, trendPercentage };
}

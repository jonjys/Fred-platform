import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PurchaseAnalysisMetrics } from "@/lib/decision-engine/modules/purchase-analysis/types";
import { formatCurrency, formatPercentage } from "@/lib/utils";

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="space-y-1 rounded-lg border border-border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/**
 * Purchase-analysis-specific display of the deterministic metrics Layer 1
 * produced — every number here comes straight from
 * `calculatePurchaseMetrics`, never from the AI layer.
 */
export function FinancialMetricsBreakdown({ metrics }: { metrics: PurchaseAnalysisMetrics }) {
  const { primary, comparison, budgetFit } = metrics;
  const currency = primary.tco.currency;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Year 1 total" value={formatCurrency(primary.tco.year1.totalInclVat, currency)} sub="incl. VAT" />
        <StatTile label="3-year TCO" value={formatCurrency(primary.tco.year3.totalInclVat, currency)} sub="incl. VAT" />
        <StatTile
          label="Effective monthly cost"
          value={formatCurrency(primary.tco.monthlyRecurringCost, currency)}
        />
        <StatTile label="Hidden fees" value={formatCurrency(primary.tco.hiddenFeesTotal, currency)} />
      </div>

      {budgetFit.budgetAmount !== null && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={budgetFit.withinBudget ? "secondary" : "destructive"}>
            {budgetFit.withinBudget ? "Within budget" : "Over budget"}
          </Badge>
          <span className="text-muted-foreground">
            {formatCurrency(budgetFit.relevantCost, currency)} vs. {formatCurrency(budgetFit.budgetAmount, currency)} budget
          </span>
        </div>
      )}

      {comparison.length > 1 && (
        <Card>
          <CardContent className="pt-4">
            <div className="mb-3 text-sm font-medium">3-year cost comparison</div>
            <div className="space-y-2">
              {comparison
                .slice()
                .sort((a, b) => a.deltaFromCheapest - b.deltaFromCheapest)
                .map((alt) => (
                  <div key={alt.id} className="flex items-center justify-between text-sm">
                    <span className={alt.isCheapest ? "font-medium" : ""}>
                      {alt.label} {alt.isCheapest && <Badge className="ml-2 align-middle">Cheapest</Badge>}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(alt.totalCost, currency)}
                      {!alt.isCheapest && ` (+${formatPercentage(alt.deltaFromCheapestPercentage, 1)})`}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

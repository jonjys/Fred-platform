import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/dashboard/stats";
import { formatCurrency } from "@/lib/utils";

/**
 * Stat tiles for the dashboard — decisions run recently, and the ROI/net-
 * benefit figures where they're computable (purchase-analysis decisions
 * that had an expected monthly benefit entered). No chart here: recharts
 * isn't an installed dependency yet, so this is numbers-only for now.
 */
export function SavingsCard({ stats }: { stats: DashboardStats }) {
  const tiles = [
    { label: "Decisions (last 30 days)", value: String(stats.decisionsLast30Days) },
    {
      label: "Avg ROI",
      value: stats.avgRoiPercentage != null ? `${stats.avgRoiPercentage.toFixed(0)}%` : "—",
    },
    {
      label: "Total net benefit",
      value:
        stats.totalNetBenefit != null && stats.totalNetBenefitCurrency
          ? formatCurrency(stats.totalNetBenefit, stats.totalNetBenefitCurrency)
          : "—",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="space-y-1 pt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{tile.label}</p>
            <p className="text-2xl font-semibold">{tile.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

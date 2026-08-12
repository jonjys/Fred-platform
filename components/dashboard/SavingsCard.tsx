import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/dashboard/stats";
import { formatCurrency } from "@/lib/utils";

/**
 * Stat tiles for the dashboard — decisions run recently, and the ROI/
 * savings figures where they're computable (purchase-analysis decisions
 * that had an expected monthly benefit entered). No chart here: recharts
 * isn't an installed dependency yet, so this is numbers-only for now.
 *
 * Leads with `totalSaved` (positive-only) rather than the true net-benefit
 * figure, which can be negative — a negative headline number on the page a
 * customer sees most often reads as "this product loses you money," even
 * when it's actually reporting one bad decision among several good ones.
 * The true net figure isn't hidden anywhere else — every decision still
 * shows its own real numbers on its detail page.
 */
export function SavingsCard({ stats }: { stats: DashboardStats }) {
  const tiles = [
    { label: "Decisions (last 30 days)", value: String(stats.decisionsLast30Days) },
    {
      label: "Avg ROI",
      value: stats.avgRoiPercentage != null ? `${stats.avgRoiPercentage.toFixed(0)}%` : "—",
    },
    {
      label: "Total Saved",
      value:
        stats.totalSaved != null && stats.totalSavedCurrency
          ? formatCurrency(stats.totalSaved, stats.totalSavedCurrency)
          : "—",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="space-y-1 p-4 pt-4 sm:p-6 sm:pt-4">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{tile.label}</p>
            <p className="text-2xl font-semibold">{tile.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

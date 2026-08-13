import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import { RecentDecisionsList } from "@/components/dashboard/RecentDecisionsList";
import { StatCard } from "@/components/dashboard/StatCard";
import { listDecisionsForUser, type DecisionRow } from "@/lib/database/repositories/decisions";
import { computeDashboardStats } from "@/lib/dashboard/stats";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { formatCurrency } from "@/lib/utils";

const RECENT_LIMIT = 5;
// Bounds the stats computation to a reasonable window rather than every
// decision the account has ever run — 100 is generous for "since start"
// aggregates without an unbounded query.
const STATS_LIMIT = 100;

async function loadDecisions(): Promise<{ decisions: DecisionRow[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const decisions = await listDecisionsForUser(supabase, { limit: STATS_LIMIT });
    return { decisions, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load recent decisions for the dashboard.", error);
    return { decisions: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function DashboardPage() {
  const { decisions, error } = await loadDecisions();

  if (error) {
    return <ConfigErrorNotice title="Kunde inte ladda dina beslut" />;
  }

  if (decisions.length === 0) {
    return <EmptyDashboard />;
  }

  const stats = computeDashboardStats(decisions);
  const recentDecisions = decisions.slice(0, RECENT_LIMIT);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total besparing"
          value={
            stats.totalSaved != null && stats.totalSavedCurrency
              ? formatCurrency(stats.totalSaved, stats.totalSavedCurrency)
              : "—"
          }
          subtext="Sedan start"
        />
        <StatCard
          label="Genomsnittlig ROI"
          value={stats.avgRoiPercentage != null ? `${stats.avgRoiPercentage.toFixed(1)}%` : "—"}
          valueClassName={stats.avgRoiPercentage != null && stats.avgRoiPercentage > 0 ? "text-green-500" : undefined}
        />
        <StatCard label="Antal beslut" value={String(stats.decisionsLast30Days)} subtext="Senaste 30 dagar" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2>Senaste beslut</h2>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/history">Visa alla</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/analyze">Ny analys</Link>
            </Button>
          </div>
        </div>
        <RecentDecisionsList decisions={recentDecisions} />
      </div>
    </div>
  );
}

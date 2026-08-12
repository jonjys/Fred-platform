import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { DecisionCard } from "@/components/dashboard/DecisionCard";
import { DecisionCardGrid } from "@/components/dashboard/DecisionCardGrid";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import { SavingsCard } from "@/components/dashboard/SavingsCard";
import { listDecisionsForUser, type DecisionRow } from "@/lib/database/repositories/decisions";
import { computeDashboardStats } from "@/lib/dashboard/stats";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

const RECENT_LIMIT = 6;
// Bounds the stats computation to a reasonable window rather than every
// decision the account has ever run — 100 is generous for "last 30 days"
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
  const recentDecisions = decisions.slice(0, RECENT_LIMIT);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1>
        <p className="text-muted-foreground">Should you BUY, NEGOTIATE, or REJECT?</p>
      </div>

      {!error && decisions.length > 0 && <SavingsCard stats={computeDashboardStats(decisions)} />}

      {!error && decisions.length > 0 && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent decisions</h2>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/history">View all</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/analyze">New analysis</Link>
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <ConfigErrorNotice title="Couldn't load recent decisions" />
      ) : decisions.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <DecisionCardGrid>
          {recentDecisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} />
          ))}
        </DecisionCardGrid>
      )}
    </div>
  );
}

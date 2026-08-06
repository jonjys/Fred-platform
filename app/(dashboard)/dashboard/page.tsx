import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { DecisionCard } from "@/components/dashboard/DecisionCard";
import { listDecisionsForUser, type DecisionRow } from "@/lib/database/repositories/decisions";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

const RECENT_LIMIT = 6;

async function loadRecentDecisions(): Promise<{ decisions: DecisionRow[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const decisions = await listDecisionsForUser(supabase, { limit: RECENT_LIMIT });
    return { decisions, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load recent decisions for the dashboard.", error);
    return { decisions: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function DashboardPage() {
  const { decisions, error } = await loadRecentDecisions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Should you BUY, NEGOTIATE, or REJECT?</p>
      </div>

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

      {error ? (
        <ConfigErrorNotice title="Couldn't load recent decisions" />
      ) : decisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No decisions yet. Head to <span className="font-medium text-foreground">Analyze</span> to run your first
          one.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} />
          ))}
        </div>
      )}
    </div>
  );
}

import { unstable_rethrow } from "next/navigation";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { DecisionCard } from "@/components/dashboard/DecisionCard";
import { listDecisionsForUser, type DecisionRow } from "@/lib/database/repositories/decisions";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

const PAGE_SIZE = 50;

async function loadDecisions(): Promise<{ decisions: DecisionRow[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const decisions = await listDecisionsForUser(supabase, { limit: PAGE_SIZE });
    return { decisions, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load decision history.", error);
    return { decisions: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function HistoryPage() {
  const { decisions, error } = await loadDecisions();

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">History</h1>
        <ConfigErrorNotice title="Couldn't load your decision history" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">History</h1>
        <p className="text-muted-foreground">Every decision you&apos;ve run — the Decision Graph.</p>
      </div>

      {decisions.length === 0 ? (
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

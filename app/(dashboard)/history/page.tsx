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
    return <ConfigErrorNotice title="Kunde inte ladda din beslutshistorik" />;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">Alla beslut du har kört.</p>

      {decisions.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Inga beslut ännu. Gå till <span className="font-medium text-zinc-50">Analysera</span> för att köra ditt
          första.
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

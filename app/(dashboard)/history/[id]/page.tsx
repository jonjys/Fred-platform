import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { DecisionOutcomeForm } from "@/components/history/DecisionOutcomeForm";
import { ResultsView, toPurchaseDecisionResult } from "@/components/results/ResultsView";
import { getDecisionById, type DecisionRow } from "@/lib/database/repositories/decisions";
import { isStalledProcessing } from "@/lib/decisions/status";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

async function loadDecision(id: string): Promise<{ decision: DecisionRow | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const decision = await getDecisionById(supabase, id);
    return { decision, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load decision detail.", error);
    return { decision: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function DecisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { decision, error } = await loadDecision(id);

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ConfigErrorNotice title="Couldn't load this decision" />
      </div>
    );
  }

  // RLS returns null for both "doesn't exist" and "not yours" — either way,
  // this is a 404 from the requester's point of view.
  if (!decision) notFound();

  return (
    <div className="max-w-3xl space-y-4">
      <BackLink />
      <div>
        <h1 className="text-2xl font-semibold">{decision.title}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(decision.created_at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      <DecisionBody decision={decision} />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/history" className="text-sm text-muted-foreground hover:text-foreground">
      ← Back to history
    </Link>
  );
}

function DecisionBody({ decision }: { decision: DecisionRow }) {
  if (decision.status === "processing" || decision.status === "draft") {
    if (isStalledProcessing(decision)) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          This analysis has been running for longer than expected and likely stalled (the AI request probably timed
          out). It won&apos;t complete on its own —{" "}
          <Link href="/analyze" className="underline underline-offset-4">
            run it again
          </Link>
          .
        </div>
      );
    }
    return <p className="text-sm text-muted-foreground">This analysis is still running — check back shortly.</p>;
  }

  if (decision.status === "failed") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Analysis failed: {decision.error ?? "Unknown error"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DecisionResult decision={decision} />
      {/* final_decision/outcome are module-agnostic (see schema.sql), so this
       * form is available for any completed decision, not just
       * purchase-analysis. */}
      <DecisionOutcomeForm decision={decision} />
    </div>
  );
}

function DecisionResult({ decision }: { decision: DecisionRow }) {
  if (decision.module_key === "purchase-analysis") {
    const result = toPurchaseDecisionResult(decision);
    if (!result) {
      return <p className="text-sm text-muted-foreground">This decision is missing its result data.</p>;
    }
    return <ResultsView result={result} />;
  }

  return (
    <p className="text-sm text-muted-foreground">
      No result view is available yet for the &quot;{decision.module_key}&quot; module.
    </p>
  );
}

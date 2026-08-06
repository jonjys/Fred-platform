import type { Risk, RecommendedAction, Verdict } from "@/lib/decision-engine/types";
import type { PurchaseAnalysisMetrics } from "@/lib/decision-engine/modules/purchase-analysis/types";
import type { PurchaseAnalysisAiOutput } from "@/lib/decision-engine/modules/purchase-analysis/schemas";
import { VerdictBanner } from "./VerdictBanner";
import { FinancialMetricsBreakdown } from "./FinancialMetricsBreakdown";
import { RiskCards } from "./RiskCards";
import { NegotiationActionPlan } from "./NegotiationActionPlan";

export interface PurchaseDecisionResult {
  verdict: Verdict;
  metrics: PurchaseAnalysisMetrics;
  aiAnalysis: PurchaseAnalysisAiOutput;
  risks: Risk[];
  recommendedActions: RecommendedAction[];
}

/** Structural shape shared by a `decisions` DB row and the JSON
 * `POST /api/analyze` returns (the latter is just the former, serialized) —
 * lets both the analyze form's fetch response and the history pages' server-
 * fetched rows go through the same mapping. */
export interface PurchaseDecisionResultSource {
  verdict: unknown;
  deterministic_metrics: unknown;
  ai_analysis: unknown;
  risks: unknown;
  recommended_actions: unknown;
}

/** Returns `null` when the decision hasn't completed yet (still processing,
 * or failed) — those states have no verdict/metrics/AI analysis to show. */
export function toPurchaseDecisionResult(source: PurchaseDecisionResultSource): PurchaseDecisionResult | null {
  if (!source.verdict || !source.deterministic_metrics || !source.ai_analysis) return null;

  return {
    verdict: source.verdict as Verdict,
    metrics: source.deterministic_metrics as PurchaseAnalysisMetrics,
    aiAnalysis: source.ai_analysis as PurchaseAnalysisAiOutput,
    risks: (source.risks ?? []) as Risk[],
    recommendedActions: (source.recommended_actions ?? []) as RecommendedAction[],
  };
}

/** Composes the generic result primitives (verdict/risks/actions) with the
 * purchase-analysis-specific financial breakdown into one result screen. */
export function ResultsView({ result }: { result: PurchaseDecisionResult }) {
  return (
    <div className="space-y-6">
      <VerdictBanner verdict={result.verdict} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Financial breakdown</h2>
        <FinancialMetricsBreakdown metrics={result.metrics} />
      </section>

      {result.aiAnalysis.summary && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
          <p className="text-sm leading-relaxed">{result.aiAnalysis.summary}</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contract &amp; vendor risks</h2>
        <RiskCards risks={result.risks} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Negotiation action plan</h2>
        <NegotiationActionPlan actions={result.recommendedActions} />
      </section>
    </div>
  );
}

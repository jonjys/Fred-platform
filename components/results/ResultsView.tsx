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

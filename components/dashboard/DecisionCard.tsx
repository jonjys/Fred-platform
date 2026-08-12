import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VerdictBadge } from "@/components/results/VerdictBadge";
import type { PurchaseAnalysisMetrics } from "@/lib/decision-engine/modules/purchase-analysis/types";
import type { PurchaseAnalysisInputParsed } from "@/lib/decision-engine/modules/purchase-analysis/schemas";
import type { Verdict } from "@/lib/decision-engine/types";
import type { DecisionRow } from "@/lib/database/repositories/decisions";
import { isStalledProcessing } from "@/lib/decisions/status";
import { formatCurrency } from "@/lib/utils";

const STATUS_LABEL: Record<DecisionRow["status"], string> = {
  draft: "Draft",
  processing: "Processing…",
  completed: "Completed",
  failed: "Failed",
  archived: "Archived",
};

/**
 * A single Decision Graph node summarized as a card — used by both
 * `/history` and the dashboard's recent-decisions list. The date/title/
 * verdict/status portion is module-agnostic (works for any future module);
 * the vendor + TCO figures are explicitly purchase-analysis-specific,
 * matching the same scoping already used in FinancialMetricsBreakdown.
 */
export function DecisionCard({ decision }: { decision: DecisionRow }) {
  const isPurchaseAnalysis = decision.module_key === "purchase-analysis";
  const verdict = decision.verdict as Verdict | null;
  const metrics = decision.deterministic_metrics as PurchaseAnalysisMetrics | null;
  const input = decision.input_data as Partial<PurchaseAnalysisInputParsed> | null;
  const stalled = isStalledProcessing(decision);

  const vendorName = isPurchaseAnalysis ? input?.primaryOffer?.vendorName : null;
  const currency = metrics?.primary.tco.currency;

  return (
    <Link href={`/history/${decision.id}`}>
      <Card className="transition-colors hover:bg-secondary/40">
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium">{decision.title}</div>
              {vendorName && <div className="text-sm text-muted-foreground">{vendorName}</div>}
            </div>
            {verdict ? (
              <VerdictBadge verdict={verdict} />
            ) : (
              <Badge variant={decision.status === "failed" || stalled ? "destructive" : "secondary"}>
                {stalled ? "Stalled" : STATUS_LABEL[decision.status]}
              </Badge>
            )}
          </div>

          {isPurchaseAnalysis && metrics && currency && (
            <div className="flex gap-4 text-sm">
              <span>
                <span className="text-muted-foreground">Year 1: </span>
                {formatCurrency(metrics.primary.tco.year1.totalInclVat, currency)}
              </span>
              <span>
                <span className="text-muted-foreground">3-year: </span>
                {formatCurrency(metrics.primary.tco.year3.totalInclVat, currency)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {new Date(decision.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            {decision.final_decision && (
              <span className="flex items-center gap-1 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Outcome logged
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

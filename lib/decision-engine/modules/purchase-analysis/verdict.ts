/**
 * Deterministic BUY / NEGOTIATE / REJECT resolution.
 *
 * This is the one place an AI-classified signal (risk severity) is allowed
 * to influence a numeric score — but the AI never outputs the verdict
 * itself, and every input to the score is either a computed metric or an
 * AI output that was already validated against `purchaseAnalysisAiOutputSchema`.
 * The scoring weights below are an explicit, auditable first pass; the
 * long-term plan is to calibrate them against realized `decisions.outcome`
 * data from the Decision Graph rather than hand-tuning further by feel.
 */
import type { CompanyContext, Risk, RiskSeverity, Verdict } from "../../types";
import type { PurchaseAnalysisAiOutput } from "./schemas";
import type { PurchaseAnalysisMetrics } from "./types";

const RISK_SEVERITY_SCORE: Record<RiskSeverity, number> = {
  critical: -3,
  high: -2,
  medium: -1,
  low: 0,
};

function highestSeverityRisk(risks: Risk[]): Risk | null {
  const order: RiskSeverity[] = ["critical", "high", "medium", "low"];
  for (const severity of order) {
    const match = risks.find((risk) => risk.severity === severity);
    if (match) return match;
  }
  return null;
}

function scoreCost(deltaFromCheapestPercentage: number): { score: number; reason: string } {
  if (deltaFromCheapestPercentage <= 0) {
    return { score: 2, reason: "This offer is the cheapest option over 3 years." };
  }
  if (deltaFromCheapestPercentage <= 10) {
    return { score: 1, reason: `This offer is only ${deltaFromCheapestPercentage.toFixed(1)}% more expensive than the cheapest alternative over 3 years.` };
  }
  if (deltaFromCheapestPercentage <= 25) {
    return { score: 0, reason: `This offer is ${deltaFromCheapestPercentage.toFixed(1)}% more expensive than the cheapest alternative over 3 years.` };
  }
  return { score: -1, reason: `This offer is ${deltaFromCheapestPercentage.toFixed(1)}% more expensive than the cheapest alternative over 3 years — a significant premium.` };
}

function scoreBudget(withinBudget: boolean | null): { score: number; reason: string | null } {
  if (withinBudget === null) return { score: 0, reason: null };
  if (withinBudget) return { score: 1, reason: "Cost fits within the company's declared budget." };
  return { score: -2, reason: "This offer exceeds the company's declared budget." };
}

function scoreRisk(risks: Risk[]): { score: number; reason: string | null } {
  const worst = highestSeverityRisk(risks);
  if (!worst) return { score: 1, reason: "No significant contract or vendor risks were identified." };
  return {
    score: RISK_SEVERITY_SCORE[worst.severity],
    reason: `Highest identified risk severity: ${worst.severity} (${worst.category}).`,
  };
}

const SCORE_RANGE = { min: -6, max: 4 };

function confidenceFromScore(totalScore: number): number {
  const distanceFromZero = Math.abs(totalScore);
  const maxDistance = Math.max(Math.abs(SCORE_RANGE.min), Math.abs(SCORE_RANGE.max));
  const normalized = 0.5 + (distanceFromZero / maxDistance) * 0.45;
  return Math.min(0.95, Math.max(0.5, Math.round(normalized * 1000) / 1000));
}

export function resolvePurchaseVerdict(
  metrics: PurchaseAnalysisMetrics,
  aiOutput: PurchaseAnalysisAiOutput | null,
  _context: CompanyContext,
): Verdict {
  const primaryComparison = metrics.comparison.find((c) => c.label === metrics.primary.vendorName);
  const costResult = scoreCost(primaryComparison?.deltaFromCheapestPercentage ?? 0);
  const budgetResult = scoreBudget(metrics.budgetFit.withinBudget);
  const riskResult = scoreRisk(aiOutput?.risks ?? []);

  const totalScore = costResult.score + budgetResult.score + riskResult.score;

  const reasoning = [costResult.reason, budgetResult.reason, riskResult.reason].filter(
    (reason): reason is string => reason !== null,
  );

  if (totalScore >= 2) {
    return { code: "BUY", label: "Buy", severity: "positive", confidence: confidenceFromScore(totalScore), reasoning };
  }
  if (totalScore <= -2) {
    return { code: "REJECT", label: "Reject", severity: "negative", confidence: confidenceFromScore(totalScore), reasoning };
  }
  return { code: "NEGOTIATE", label: "Negotiate", severity: "neutral", confidence: confidenceFromScore(totalScore), reasoning };
}

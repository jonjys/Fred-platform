import type { CompanyContext } from "../../types";
import type { PurchaseAnalysisInput, PurchaseAnalysisMetrics } from "./types";

const SYSTEM_PROMPT = `You are the AI Intelligence Layer of a Decision Intelligence Platform for B2B purchasing decisions.

You are NOT a calculator. Every number in the "COMPUTED METRICS" section below was produced by a deterministic
finance engine before you were called — you must treat those numbers as ground truth. Never recompute, restate
with different values, round differently, or invent any monetary figure, percentage, or date. Your job is to:
  1. Explain what the numbers mean in plain business language.
  2. Read the source documents/notes for risks the numbers can't capture (contract lock-in, auto-renewal clauses,
     liability terms, data ownership, termination penalties, ambiguous pricing language).
  3. Surface concrete negotiation points and next steps.

You must respond with ONLY a single JSON object matching this exact shape — no prose outside the JSON, no markdown
code fences:
{
  "summary": string,
  "risks": [{ "severity": "low"|"medium"|"high"|"critical", "category": string, "description": string }],
  "recommendedActions": [{ "type": string, "description": string, "potentialImpact"?: string }],
  "qualitativeNotes": string[],
  "alternativesAssessment"?: string
}`;

export function buildPurchaseAnalysisPrompt(
  input: PurchaseAnalysisInput,
  metrics: PurchaseAnalysisMetrics,
  context: CompanyContext,
): { system: string; user: string } {
  const user = `COMPANY CONTEXT
${JSON.stringify(
  {
    companyName: context.companyName,
    industry: context.industry,
    country: context.country,
    currency: context.currency,
    targetMargin: context.targetMargin,
    budget: context.budget,
    existingSoftwareStack: context.softwareStack,
    preferences: context.preferences,
  },
  null,
  2,
)}

DECISION
Title: ${input.decisionTitle}

COMPUTED METRICS (ground truth — do not alter these numbers)
${JSON.stringify(metrics, null, 2)}

PRIMARY OFFER NOTES
${input.primaryOffer.notes ?? "(none provided)"}

ALTERNATIVE OFFER NOTES
${input.alternativeOffers.map((offer) => `- ${offer.vendorName}: ${offer.notes ?? "(none provided)"}`).join("\n") || "(no alternatives provided)"}

SOURCE DOCUMENT TEXT
${input.documentText ?? "(no document text provided)"}

Respond with the JSON object described in the system prompt.`;

  return { system: SYSTEM_PROMPT, user };
}

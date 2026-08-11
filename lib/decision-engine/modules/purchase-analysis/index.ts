import type { DecisionModule } from "../../types";
import { calculatePurchaseMetrics } from "./engine";
import { extractPurchaseEntities } from "./entities";
import { extractPurchaseInputFromText } from "./extract";
import { buildPurchaseAnalysisPrompt } from "./prompt";
import { purchaseAnalysisAiOutputSchema, purchaseAnalysisInputSchema } from "./schemas";
import type { PurchaseAnalysisAiOutput, PurchaseAnalysisInputParsed } from "./schemas";
import type { PurchaseAnalysisMetrics } from "./types";
import { resolvePurchaseVerdict } from "./verdict";

export const purchaseAnalysisModule: DecisionModule<
  PurchaseAnalysisInputParsed,
  PurchaseAnalysisMetrics,
  PurchaseAnalysisAiOutput
> = {
  key: "purchase-analysis",
  version: "1",
  label: "AI Purchase Analyzer",
  description:
    "Analyzes a purchase decision — real 1yr/3yr cost, hidden fees, contract risk, and supplier alternatives — and recommends BUY, NEGOTIATE, or REJECT.",
  inputSchema: purchaseAnalysisInputSchema,
  aiOutputSchema: purchaseAnalysisAiOutputSchema,
  calculateMetrics: calculatePurchaseMetrics,
  buildPrompt: buildPurchaseAnalysisPrompt,
  resolveVerdict: resolvePurchaseVerdict,
  extractInput: extractPurchaseInputFromText,
  extractEntities: extractPurchaseEntities,
};

export * from "./types";
export * from "./schemas";

import { z } from "zod";
import { baseAiOutputSchema } from "../../schemas";

const purchaseOfferSchema = z.object({
  vendorName: z.string().min(1),
  upfrontCost: z.number().min(0),
  monthlyCost: z.number().min(0),
  hiddenFees: z.number().min(0).default(0),
  contractLengthMonths: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export const purchaseAnalysisInputSchema = z.object({
  decisionTitle: z.string().min(1),
  primaryOffer: purchaseOfferSchema,
  alternativeOffers: z.array(purchaseOfferSchema).default([]),
  vatRate: z.number().min(0).max(1).optional(),
  expectedMonthlyBenefit: z.number().min(0).optional(),
  documentText: z.string().optional(),
});

export type PurchaseAnalysisInputParsed = z.infer<typeof purchaseAnalysisInputSchema>;

/**
 * Purchase-analysis extends the shared base AI output — it doesn't redefine
 * risks/recommendedActions, it only adds what's specific to evaluating a
 * purchase decision.
 */
export const purchaseAnalysisAiOutputSchema = baseAiOutputSchema.extend({
  /** Short, human-readable framing of how the alternatives stack up — the
   * AI explains the comparison; the numbers themselves come from
   * `calculatePurchaseMetrics` / `compareCostAlternatives`. */
  alternativesAssessment: z.string().optional(),
});

export type PurchaseAnalysisAiOutput = z.infer<typeof purchaseAnalysisAiOutputSchema>;

const extractedOfferSchema = z.object({
  vendorName: z.string().optional(),
  upfrontCost: z.number().min(0).optional(),
  monthlyCost: z.number().min(0).optional(),
  hiddenFees: z.number().min(0).optional(),
  contractLengthMonths: z.number().int().min(0).optional(),
});

/**
 * Shape of candidate values `extractPurchaseInputFromText` may pull out of a
 * document. Every field is optional — a document rarely states everything a
 * full `PurchaseAnalysisInput` needs, and the API pipeline fills gaps from
 * explicit user-submitted fields, never the other way around.
 */
export const purchaseAnalysisExtractionSchema = z.object({
  primaryOffer: extractedOfferSchema.optional(),
  alternativeOffers: z.array(extractedOfferSchema).optional(),
  vatRate: z.number().min(0).max(1).optional(),
});

export type PurchaseAnalysisExtraction = z.infer<typeof purchaseAnalysisExtractionSchema>;

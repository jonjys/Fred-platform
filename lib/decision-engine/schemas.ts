/**
 * Zod schemas mirroring the generic contracts in types.ts.
 *
 * These are the shared building blocks every module composes into its own
 * input/AI-output schemas (see lib/decision-engine/modules/purchase-analysis
 * /schemas.ts for an example). Keeping them here means a new module never
 * redefines what a Risk or a Verdict looks like — it only adds what's
 * specific to it.
 */
import { z } from "zod";

export const currencyCodeSchema = z
  .string()
  .length(3)
  .transform((v) => v.toUpperCase());

export const costCategorySchema = z.enum([
  "upfront",
  "subscription",
  "usage",
  "hidden_fee",
  "setup",
  "support",
  "termination",
  "other",
]);

export const costLineItemSchema = z.object({
  label: z.string().min(1),
  amount: z.number(),
  category: costCategorySchema,
  recurring: z.boolean(),
  vatApplicable: z.boolean(),
});

export const tcoBreakdownSchema = z.object({
  currency: currencyCodeSchema,
  lineItems: z.array(costLineItemSchema),
  subtotalExclVat: z.number(),
  vatAmount: z.number(),
  vatRate: z.number().min(0).max(1),
  totalInclVat: z.number(),
});

export const tcoResultSchema = z.object({
  currency: currencyCodeSchema,
  year1: tcoBreakdownSchema,
  year3: tcoBreakdownSchema,
  monthlyRecurringCost: z.number(),
  hiddenFeesTotal: z.number(),
});

export const roiResultSchema = z.object({
  roiPercentage: z.number(),
  netBenefit: z.number(),
  paybackPeriodMonths: z.number().nullable(),
});

export const verdictSeveritySchema = z.enum(["positive", "neutral", "negative"]);

export const verdictSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  severity: verdictSeveritySchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.array(z.string()),
});

export const riskSeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export const riskSchema = z.object({
  severity: riskSeveritySchema,
  category: z.string().min(1),
  description: z.string().min(1),
});

export const recommendedActionSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  potentialImpact: z.string().optional(),
});

export const companyBudgetSchema = z.object({
  amount: z.number().min(0),
  period: z.enum(["monthly", "annual"]),
});

export const companyContextSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string(),
  industry: z.string().nullable(),
  country: z.string().nullable(),
  currency: currencyCodeSchema,
  vatRate: z.number().min(0).max(1),
  targetMargin: z.number().min(0).max(1).nullable(),
  budget: companyBudgetSchema.nullable(),
  softwareStack: z.array(z.unknown()),
  preferences: z.record(z.unknown()),
});

/**
 * The minimum shape every module's `aiOutputSchema` must be a superset of.
 * Modules extend this with `.extend({...})` rather than redefining risks /
 * recommendedActions / summary from scratch — see
 * modules/purchase-analysis/schemas.ts.
 */
export const baseAiOutputSchema = z.object({
  summary: z.string().min(1),
  risks: z.array(riskSchema),
  recommendedActions: z.array(recommendedActionSchema),
  /** Free-text reasoning bullets the AI contributes on top of the
   * deterministically-derived Verdict.reasoning — kept separate so it's
   * always clear which explanation came from numbers vs. from the model. */
  qualitativeNotes: z.array(z.string()).default([]),
});
export type BaseAiOutput = z.infer<typeof baseAiOutputSchema>;

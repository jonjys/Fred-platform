/**
 * Decision Module Registry.
 *
 * This is the single extensibility seam of the platform: adding a new
 * Decision Module — Supplier Comparison, Contract Intelligence, Procurement,
 * Investment Analysis, Pricing Intelligence, Due Diligence, Vendor
 * Management, ... — means writing a new folder under
 * lib/decision-engine/modules/<module-key>/ that implements the
 * `DecisionModule` contract (lib/decision-engine/types.ts), then adding one
 * line to `DECISION_MODULES` below.
 *
 * Nothing else in the platform changes: the database schema doesn't need a
 * migration (decisions.module_key is a free-text column), the API pipeline
 * (app/api/analyze) looks the module up by key and drives it through the
 * same five stages for every module, and generic UI components render any
 * module's Verdict/Risk/RecommendedAction without module-specific branching.
 *
 * If you're tempted to add an `if (moduleKey === "purchase-analysis")`
 * branch anywhere outside of this file and the module's own folder, that's
 * a sign the logic belongs inside the module instead.
 */
import { purchaseAnalysisModule } from "@/lib/decision-engine/modules/purchase-analysis";
import type { AnyDecisionModule } from "@/lib/decision-engine/types";

export const DECISION_MODULES = {
  [purchaseAnalysisModule.key]: purchaseAnalysisModule,
  // Future modules register here, e.g.:
  // [supplierComparisonModule.key]: supplierComparisonModule,
  // [contractIntelligenceModule.key]: contractIntelligenceModule,
} satisfies Record<string, AnyDecisionModule>;

export type DecisionModuleKey = keyof typeof DECISION_MODULES;

export function getDecisionModule(key: string): AnyDecisionModule | undefined {
  return DECISION_MODULES[key as DecisionModuleKey];
}

export function listDecisionModules(): AnyDecisionModule[] {
  return Object.values(DECISION_MODULES);
}

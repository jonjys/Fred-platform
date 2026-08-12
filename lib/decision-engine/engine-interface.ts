/**
 * The portable, module-agnostic contract a Decision Engine implements — the
 * pure calculation core, with zero knowledge of AI, prompts, or verdicts
 * (those stay one layer up, on `DecisionModule`). This is what lets an
 * engine be built, tested, and versioned as a fully standalone package with
 * no dependency on FRED, Claude, or any AI-output schema — e.g. a future
 * debt-optimization engine developed and verified in its own repo, then
 * wrapped by a `DecisionModule` here without ever needing to know about
 * this platform.
 */
import type { CompanyContext } from "./types";

export interface ValidationResult<TInput> {
  valid: boolean;
  /** Present only when valid. */
  data?: TInput;
  errors?: string[];
}

export interface CalculationResult<TResult> {
  result: TResult;
}

export interface EngineMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
}

export interface DecisionEngine<TInput = unknown, TResult = unknown> {
  id: string;
  name: string;
  version: string;

  validate: (input: unknown) => ValidationResult<TInput>;
  /**
   * `context` is optional and engine-specific. Most engines (loan/debt
   * math, pure interest/amortization arithmetic) never need company-level
   * context and can ignore the parameter entirely. Engines whose
   * calculation genuinely depends on it (e.g. purchase-analysis needs
   * currency, VAT rate, and budget) accept it as a second argument.
   */
  calculate: (input: TInput, context?: CompanyContext) => CalculationResult<TResult>;
  getMetadata: () => EngineMetadata;
}

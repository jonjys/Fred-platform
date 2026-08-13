// Kommer från debt-optimizer-standalone när P0-buggar är gröna.
//
// Deliberately throws on every call — no calculation logic lives here.
// debt-optimizer-standalone still has 5 open P0 bugs (one-time payment not
// updating the debt-free date, auto-cascade reinvesting without asking,
// fees/insurance counted as amortization, annuity treated as fixed
// amortization); this stub exists only so the API route and future UI have
// something typed to call against `DecisionEngine` (../../engine-interface)
// until the real engine is ported in.
import type { CalculationResult, DecisionEngine, EngineMetadata, ValidationResult } from "../../engine-interface";
import type { DebtOptimizationInput, DebtOptimizationResult } from "./types";

const NOT_IMPLEMENTED =
  "DebtOptimizationEngine not implemented yet. Waiting for debt-optimizer-standalone P0 fixes.";

export class DebtOptimizationEngine implements DecisionEngine<DebtOptimizationInput, DebtOptimizationResult> {
  id = "debt-optimization";
  name = "Skuldoptimering";
  version = "0.0.0-stub";

  validate(_input: unknown): ValidationResult<DebtOptimizationInput> {
    throw new Error(NOT_IMPLEMENTED);
  }

  calculate(_input: DebtOptimizationInput): CalculationResult<DebtOptimizationResult> {
    throw new Error(NOT_IMPLEMENTED);
  }

  getMetadata(): EngineMetadata {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: "Placeholder — the real engine ships from debt-optimizer-standalone once its P0 bugs are fixed.",
    };
  }
}

const debtOptimizationEngine = new DebtOptimizationEngine();
export default debtOptimizationEngine;

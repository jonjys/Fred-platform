import { describe, expect, it } from "vitest";
import { DebtOptimizationEngine } from "./engine";
import type { DebtOptimizationInput } from "./types";

describe("DebtOptimizationEngine (stub — real engine ships from debt-optimizer-standalone)", () => {
  it("calculate() throws 'not implemented' rather than fabricating a result", () => {
    const engine = new DebtOptimizationEngine();

    expect(() => engine.calculate({} as DebtOptimizationInput)).toThrow(/not implemented/i);
  });

  it("validate() also throws 'not implemented' — no partial validation without the real engine", () => {
    const engine = new DebtOptimizationEngine();

    expect(() => engine.validate({})).toThrow(/not implemented/i);
  });

  it("exposes stable metadata even while unimplemented", () => {
    const engine = new DebtOptimizationEngine();

    expect(engine.getMetadata()).toMatchObject({ id: "debt-optimization" });
  });
});

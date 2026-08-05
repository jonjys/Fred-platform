/**
 * Shared arithmetic helpers for the deterministic engine. Deliberately tiny
 * and dependency-free — every financial function in cost.ts / roi.ts
 * composes these instead of re-implementing rounding/summing.
 */

/** Rounds to 2 decimal places using a cent-safe integer round to avoid the
 * classic 0.1 + 0.2 floating point drift in currency math. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

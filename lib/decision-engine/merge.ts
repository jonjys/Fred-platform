/**
 * Generic deep-merge used by the API pipeline to combine AI-extracted
 * candidate input (from a document) with explicit input the caller
 * submitted. Not module-specific: any module implementing `extractInput`
 * relies on this same merge with the same precedence rule.
 *
 * Precedence: `override` (explicit, caller-submitted) always wins over
 * `base` (AI-extracted) at the leaf level. Extraction only ever fills gaps
 * the caller left empty — it can never silently replace a value the user
 * (or an upstream form) actually provided.
 */
export function deepMergePreferOverride<T>(base: T, override: T): T {
  if (override === undefined || override === null) return base;
  if (base === undefined || base === null) return override;

  if (Array.isArray(base) || Array.isArray(override)) {
    // Arrays are replaced wholesale by the override, not merged element-wise
    // — merging alternative-offer lists positionally would silently splice
    // AI-guessed and user-provided offers together.
    return override;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const merged: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
      merged[key] = deepMergePreferOverride(
        (base as Record<string, unknown>)[key],
        (override as Record<string, unknown>)[key],
      );
    }
    return merged as T;
  }

  return override;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

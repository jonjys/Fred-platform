import { describe, expect, it } from "vitest";
import { deepMergePreferOverride } from "./merge";

describe("deepMergePreferOverride", () => {
  it("fills gaps from base without touching fields the override provides", () => {
    const extracted = { primaryOffer: { vendorName: "Acme", upfrontCost: 500 } };
    const explicit = { primaryOffer: { upfrontCost: 750 } };

    const result = deepMergePreferOverride(extracted, explicit);

    expect(result).toEqual({ primaryOffer: { vendorName: "Acme", upfrontCost: 750 } });
  });

  it("replaces arrays wholesale rather than merging element-wise", () => {
    const extracted = { alternativeOffers: [{ vendorName: "Vendor B" }] };
    const explicit = { alternativeOffers: [{ vendorName: "Vendor C" }, { vendorName: "Vendor D" }] };

    const result = deepMergePreferOverride(extracted, explicit);

    expect(result.alternativeOffers).toEqual([{ vendorName: "Vendor C" }, { vendorName: "Vendor D" }]);
  });

  it("returns base untouched when override is undefined", () => {
    expect(deepMergePreferOverride({ a: 1 }, undefined)).toEqual({ a: 1 });
  });
});

import { describe, expect, it } from "vitest";
import { extractPurchaseEntities } from "./entities";
import type { PurchaseAnalysisInputParsed } from "./schemas";

function baseOffer(vendorName: string) {
  return { vendorName, upfrontCost: 0, monthlyCost: 0, hiddenFees: 0, contractLengthMonths: 12 };
}

describe("extractPurchaseEntities", () => {
  it("returns the primary offer's vendor as a primary_option candidate", () => {
    const input = {
      decisionTitle: "Test",
      primaryOffer: baseOffer("Acme Inc."),
      alternativeOffers: [],
    } as PurchaseAnalysisInputParsed;

    expect(extractPurchaseEntities(input)).toEqual([
      { name: "Acme Inc.", entityType: "vendor", role: "primary_option" },
    ]);
  });

  it("includes alternative offers as alternative candidates", () => {
    const input = {
      decisionTitle: "Test",
      primaryOffer: baseOffer("Acme Inc."),
      alternativeOffers: [baseOffer("Vendor B"), baseOffer("Vendor C")],
    } as PurchaseAnalysisInputParsed;

    expect(extractPurchaseEntities(input)).toEqual([
      { name: "Acme Inc.", entityType: "vendor", role: "primary_option" },
      { name: "Vendor B", entityType: "vendor", role: "alternative" },
      { name: "Vendor C", entityType: "vendor", role: "alternative" },
    ]);
  });

  it("skips offers with a blank vendor name", () => {
    const input = {
      decisionTitle: "Test",
      primaryOffer: baseOffer("  "),
      alternativeOffers: [baseOffer("Vendor B")],
    } as PurchaseAnalysisInputParsed;

    expect(extractPurchaseEntities(input)).toEqual([{ name: "Vendor B", entityType: "vendor", role: "alternative" }]);
  });
});

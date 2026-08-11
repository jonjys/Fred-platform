import type { EntityCandidate } from "../../types";
import type { PurchaseAnalysisInputParsed } from "./schemas";

/** Every named vendor in a purchase decision — the primary offer plus any
 * alternatives — is a candidate `decision_entities` row, so a supplier's
 * full evaluation history can be surfaced on the next analysis that
 * mentions them. */
export function extractPurchaseEntities(input: PurchaseAnalysisInputParsed): EntityCandidate[] {
  const entities: EntityCandidate[] = [];

  if (input.primaryOffer.vendorName.trim()) {
    entities.push({ name: input.primaryOffer.vendorName.trim(), entityType: "vendor", role: "primary_option" });
  }

  for (const offer of input.alternativeOffers) {
    if (offer.vendorName.trim()) {
      entities.push({ name: offer.vendorName.trim(), entityType: "vendor", role: "alternative" });
    }
  }

  return entities;
}

import { extractStructuredData } from "@/lib/ai/claude";
import type { CompanyContext, DeepPartial } from "../../types";
import { purchaseAnalysisExtractionSchema } from "./schemas";
import type { PurchaseAnalysisInputParsed } from "./schemas";

const EXTRACTION_INSTRUCTIONS =
  "the primary vendor's name, upfront/setup cost, monthly subscription cost, any hidden or one-off fees, and the " +
  "contract length in months — and the same fields for any competing offers mentioned. Only include a field if the " +
  "document explicitly states it; omit fields that require calculation or inference.";

const OFFER_SHAPE = `{ "vendorName"?: string, "upfrontCost"?: number, "monthlyCost"?: number, "hiddenFees"?: number, "contractLengthMonths"?: number }`;

const EXTRACTION_OUTPUT_SHAPE = `{
  "primaryOffer"?: ${OFFER_SHAPE},
  "alternativeOffers"?: [${OFFER_SHAPE}, ...one entry per competing offer explicitly mentioned],
  "vatRate"?: number (as a decimal fraction, e.g. 0.21 for 21% — only if a VAT/tax rate is explicitly stated)
}`;

export async function extractPurchaseInputFromText(
  text: string,
  _context: CompanyContext,
): Promise<DeepPartial<PurchaseAnalysisInputParsed>> {
  return extractStructuredData({
    text,
    instructions: EXTRACTION_INSTRUCTIONS,
    outputShape: EXTRACTION_OUTPUT_SHAPE,
    schema: purchaseAnalysisExtractionSchema,
    label: "purchase-analysis:extract",
  });
}

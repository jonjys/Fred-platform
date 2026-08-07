import { extractStructuredData } from "@/lib/ai/claude";
import type { CompanyContext, DeepPartial } from "../../types";
import { purchaseAnalysisExtractionSchema } from "./schemas";
import type { PurchaseAnalysisInputParsed } from "./schemas";

const EXTRACTION_INSTRUCTIONS =
  "the primary vendor's name, upfront/setup cost, monthly subscription cost, any hidden or one-off fees, and the " +
  "contract length in months — and the same fields for any competing offers mentioned. Only include a field if the " +
  "document explicitly states it; omit fields that require calculation or inference.";

export async function extractPurchaseInputFromText(
  text: string,
  _context: CompanyContext,
): Promise<DeepPartial<PurchaseAnalysisInputParsed>> {
  return extractStructuredData({
    text,
    instructions: EXTRACTION_INSTRUCTIONS,
    schema: purchaseAnalysisExtractionSchema,
    label: "purchase-analysis:extract",
  });
}

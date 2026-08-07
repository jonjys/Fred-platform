/**
 * Document Parser — mechanical text extraction only.
 *
 * This file never interprets meaning: it turns an uploaded file or pasted
 * text into a flat string. Turning that string into structured candidate
 * numbers (upfront cost, monthly cost, contract length...) is a distinct,
 * explicitly AI-assisted step — see `lib/ai/claude.ts#extractStructuredData`
 * and each module's own `extractInput` implementation — kept separate so
 * it's always clear which numbers were *read* from a document (candidates a
 * human should confirm) versus *calculated* (Layer 1, always trustworthy).
 */

export type DocumentSourceKind = "file" | "pasted_text";

export interface ParsedDocument {
  sourceKind: DocumentSourceKind;
  fileName: string | null;
  fileType: string | null;
  text: string;
}

const SUPPORTED_PDF_MIME_TYPES = new Set(["application/pdf"]);
const SUPPORTED_TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown", "text/csv"]);

export interface ParseFileInput {
  buffer: Buffer;
  fileName: string;
  fileType: string;
}

/**
 * Parses an uploaded file into raw text. Supports PDF and plain-text
 * formats today; unsupported types throw a descriptive error rather than
 * silently returning empty text, since a silent empty extraction would feed
 * the deterministic engine (via the extraction step) misleadingly clean
 * "no data found" input.
 */
export async function parseFile(input: ParseFileInput): Promise<ParsedDocument> {
  const { buffer, fileName, fileType } = input;

  if (SUPPORTED_PDF_MIME_TYPES.has(fileType)) {
    const text = await parsePdfBuffer(buffer);
    return { sourceKind: "file", fileName, fileType, text };
  }

  if (SUPPORTED_TEXT_MIME_TYPES.has(fileType)) {
    return { sourceKind: "file", fileName, fileType, text: buffer.toString("utf-8") };
  }

  throw new UnsupportedDocumentTypeError(fileType);
}

export function parsePastedText(text: string): ParsedDocument {
  return { sourceKind: "pasted_text", fileName: null, fileType: "text/plain", text };
}

export class UnsupportedDocumentTypeError extends Error {
  constructor(public readonly fileType: string) {
    super(`Unsupported document type: ${fileType}. Supported types: PDF, plain text, markdown, CSV.`);
    this.name = "UnsupportedDocumentTypeError";
  }
}

/** A file had the right MIME type but pdf-parse (pdfjs-dist under the hood)
 * couldn't actually read it — corrupted, password-protected, or using a
 * compression/encoding pdf.js doesn't support. Distinct from
 * `UnsupportedDocumentTypeError` (wrong kind of file) so callers can give an
 * accurate message instead of letting the raw pdfjs exception crash the
 * request with an uncaught 500. */
export class UnparsablePdfError extends Error {
  constructor(cause: unknown) {
    super(
      `This PDF could not be read (${cause instanceof Error ? cause.message : String(cause)}). It may be corrupted, password-protected, or use an unsupported encoding — try re-exporting/re-saving it, or paste the text instead.`,
    );
    this.name = "UnparsablePdfError";
  }
}

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  // Lazily imported so pdf-parse (a Node-only dependency) is never pulled
  // into any bundle that isn't actually parsing a PDF.
  const pdfParse = (await import("pdf-parse")).default;
  try {
    const result = await pdfParse(buffer);
    return result.text;
  } catch (error) {
    throw new UnparsablePdfError(error);
  }
}

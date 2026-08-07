/**
 * Layer 2 — AI Intelligence Layer.
 *
 * This is the only place in the codebase that talks to Claude. It never
 * performs a financial calculation itself: it sends already-computed
 * deterministic metrics to the model for *explanation* and asks the model
 * to contribute qualitative judgment (risks, recommended actions) — then
 * validates every byte of the response against the calling module's Zod
 * schema before anything downstream is allowed to trust it.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import type { CompanyContext, DecisionModule } from "@/lib/decision-engine/types";
import { withPlatformGuardrails } from "./prompts";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_RETRIES = 2;

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Configure it in your environment before calling the AI layer.");
  }

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

/** Thrown when Claude's response cannot be coerced into the module's
 * expected schema even after retries. Distinct from a generic Error so API
 * routes can map it to a specific HTTP status / user-facing message. */
export class AiOutputValidationError extends Error {
  constructor(message: string, public readonly issues: unknown) {
    super(message);
    this.name = "AiOutputValidationError";
  }
}

export interface RunStructuredAnalysisParams<T> {
  system: string;
  user: string;
  schema: ZodType<T>;
  maxRetries?: number;
  maxTokens?: number;
  /** Short tag included in diagnostic logs (e.g. "purchase-analysis:extract")
   * so multiple structured calls within one request are distinguishable in
   * Vercel logs. */
  label?: string;
}

/**
 * Sends a single prompt to Claude and guarantees the result matches `schema`
 * — or throws. On a parse/validation failure, re-prompts Claude with the
 * specific validation issues (bounded by `maxRetries`) rather than silently
 * falling back to unvalidated data.
 */
export async function runStructuredAnalysis<T>(params: RunStructuredAnalysisParams<T>): Promise<T> {
  const { system, user, schema, maxRetries = DEFAULT_MAX_RETRIES, maxTokens = DEFAULT_MAX_TOKENS, label = "claude" } = params;
  const anthropic = getClient();

  let lastError: unknown;
  let currentUserMessage = user;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: currentUserMessage }],
    });

    const rawText = extractText(response);
    // The single most useful diagnostic line when a structured call
    // "succeeds" but returns less than expected — a schema with every field
    // optional (like extraction's) can't distinguish "found nothing" from
    // "found everything" without seeing what Claude actually said.
    console.log(`[${label}] attempt ${attempt} stop_reason=${response.stop_reason} raw response: ${rawText}`);

    const parsed = tryParseJson(rawText);

    if (parsed === undefined) {
      lastError = new Error("AI response was not valid JSON.");
      currentUserMessage = `${user}\n\nYour previous response could not be parsed as JSON. Respond again with ONLY the JSON object — no prose, no markdown code fences.`;
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    console.log(`[${label}] attempt ${attempt} schema validation failed: ${JSON.stringify(result.error.issues)}`);
    lastError = new AiOutputValidationError("AI response failed schema validation.", result.error.issues);
    currentUserMessage = `${user}\n\nYour previous response failed validation with these issues:\n${JSON.stringify(
      result.error.issues,
      null,
      2,
    )}\n\nRespond again with a corrected JSON object that matches the required schema exactly.`;
  }

  throw lastError instanceof Error ? lastError : new Error("AI structured analysis failed after retries.");
}

function extractText(response: Anthropic.Message): string {
  const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
  return textBlock?.text ?? "";
}

function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  // Claude occasionally wraps JSON in a markdown fence despite instructions not to.
  const withoutFences = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(withoutFences);
  } catch {
    return undefined;
  }
}

export interface ExtractStructuredDataParams<T> {
  /** Raw text extracted from a document (see lib/documents/parser.ts). */
  text: string;
  /** What to look for, in plain language — module-authored, e.g. "the
   * vendor's upfront cost, monthly subscription cost, and contract length
   * in months." */
  instructions: string;
  schema: ZodType<T>;
  /** Diagnostic log tag, e.g. "purchase-analysis:extract". */
  label?: string;
}

const EXTRACTION_SYSTEM_PROMPT = `You extract structured data that is explicitly stated in a document. You never
calculate, infer, estimate, or round a value that is not directly stated in the text. If a field is not present in
the text, omit it rather than guessing. Respond with ONLY a single JSON object matching the required schema — no
prose, no markdown code fences.

The document text may be mechanically extracted from a PDF, in which case it can lose its original layout: tables,
columns, and line items are sometimes flattened into run-on or interleaved lines, numbers may be separated from
their labels or currency symbols by unrelated text, and whitespace/line breaks do not reliably reflect the visual
structure. Read the whole text carefully before concluding a value is absent — a price is still "explicitly stated"
even if formatting around it looks mangled, and plenty of documents (including plain pasted text) state values in
simple, direct sentences like "Upfront cost: 500 EUR" that should be extracted immediately. Only omit a field if the
value truly cannot be found anywhere in the text.`;

/**
 * Generic AI-assisted extraction: turns raw document text into structured
 * *candidate* values a module's deterministic engine can consume. This is
 * deliberately a separate code path from `runModuleAiAnalysis` — extraction
 * reads what a document says; it must never perform arithmetic or produce
 * the qualitative analysis/verdict.
 */
export async function extractStructuredData<T>(params: ExtractStructuredDataParams<T>): Promise<T> {
  const { text, instructions, schema, label = "extract" } = params;

  return runStructuredAnalysis({
    system: EXTRACTION_SYSTEM_PROMPT,
    user: `Extract the following from the document text below: ${instructions}\n\nDOCUMENT TEXT\n${text}`,
    schema,
    label,
  });
}

/**
 * The single call site every Decision Module's AI step goes through. Generic
 * over the module's input/metrics/AI-output types, so app/api/analyze never
 * needs module-specific branching to invoke Claude.
 */
export async function runModuleAiAnalysis<TInput, TMetrics, TAiOutput>(
  module: DecisionModule<TInput, TMetrics, TAiOutput>,
  input: TInput,
  metrics: TMetrics,
  context: CompanyContext,
): Promise<TAiOutput> {
  const { system, user } = module.buildPrompt(input, metrics, context);

  return runStructuredAnalysis({
    system: withPlatformGuardrails(system),
    user,
    schema: module.aiOutputSchema,
    label: `${module.key}:analyze`,
  });
}

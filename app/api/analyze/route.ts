/**
 * POST /api/analyze — the generic Decision Pipeline entry point.
 *
 * User Input -> Document Parser -> Extract structured values -> Deterministic
 * Engine -> Claude Analysis -> Zod validation -> Save Decision Node -> Return
 * Analysis Result.
 *
 * This route is deliberately module-agnostic: it resolves a `DecisionModule`
 * from the registry by `moduleKey` and drives it through the same pipeline
 * regardless of which module it is. Adding a new module never requires
 * touching this file.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDecisionModule } from "@/config/tools";
import { AiOutputValidationError, runModuleAiAnalysis } from "@/lib/ai/claude";
import { toCompanyContext, getCompanyById } from "@/lib/database/repositories/companies";
import { createDecision, updateDecision } from "@/lib/database/repositories/decisions";
import { createDecisionDocument } from "@/lib/database/repositories/documents";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { parseFile, parsePastedText, UnsupportedDocumentTypeError } from "@/lib/documents/parser";
import { deepMergePreferOverride } from "@/lib/decision-engine/merge";

export const runtime = "nodejs";

const requestEnvelopeSchema = z.object({
  moduleKey: z.string().min(1),
  companyId: z.string().uuid(),
  title: z.string().min(1),
  /** Module-specific structured input, as a JSON string. May be partial —
   * missing fields are filled from document extraction where possible. */
  input: z.string(),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const envelope = requestEnvelopeSchema.safeParse({
    moduleKey: formData.get("moduleKey"),
    companyId: formData.get("companyId"),
    title: formData.get("title"),
    input: formData.get("input"),
  });

  if (!envelope.success) {
    return NextResponse.json({ error: "Invalid request", issues: envelope.error.issues }, { status: 400 });
  }

  const { moduleKey, companyId, title } = envelope.data;

  let explicitInput: unknown;
  try {
    explicitInput = JSON.parse(envelope.data.input);
  } catch {
    return NextResponse.json({ error: "`input` must be valid JSON" }, { status: 400 });
  }

  // --- Resolve module (the single generic dispatch point) ------------------
  const decisionModule = getDecisionModule(moduleKey);
  if (!decisionModule) {
    return NextResponse.json({ error: `Unknown decision module: "${moduleKey}"` }, { status: 400 });
  }

  // --- Resolve company (AI Wallet) + authorize ------------------------------
  const companyRow = await getCompanyById(supabase, companyId);
  if (!companyRow || companyRow.user_id !== user.id) {
    // RLS already prevents cross-user reads; this check turns that into an
    // explicit, intention-revealing 404 instead of a bare null-shaped bug.
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  const companyContext = toCompanyContext(companyRow);

  // --- Document parsing (mechanical text extraction only) -------------------
  const file = formData.get("file");
  const pastedText = formData.get("text");

  let documentText: string | undefined;
  let parsedDocument: Awaited<ReturnType<typeof parseFile>> | ReturnType<typeof parsePastedText> | null = null;

  try {
    if (file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      parsedDocument = await parseFile({ buffer, fileName: file.name, fileType: file.type });
      documentText = parsedDocument.text;
    } else if (typeof pastedText === "string" && pastedText.trim().length > 0) {
      parsedDocument = parsePastedText(pastedText);
      documentText = parsedDocument.text;
    }
  } catch (error) {
    if (error instanceof UnsupportedDocumentTypeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  // --- Extract structured candidate values (AI-assisted, read-not-compute) --
  let mergedInput = explicitInput;
  let extractedFields: unknown = null;
  if (documentText && decisionModule.extractInput) {
    extractedFields = await decisionModule.extractInput(documentText, companyContext);
    mergedInput = deepMergePreferOverride(extractedFields, explicitInput);
  }

  // --- Validate the merged input before it reaches the deterministic engine -
  const inputResult = decisionModule.inputSchema.safeParse(mergedInput);
  if (!inputResult.success) {
    return NextResponse.json(
      { error: "Input failed validation", issues: inputResult.error.issues },
      { status: 400 },
    );
  }
  const validatedInput = inputResult.data;

  // --- Persist the decision node up front (status: processing) --------------
  let decision = await createDecision(supabase, {
    company_id: companyId,
    created_by: user.id,
    module_key: decisionModule.key,
    module_version: decisionModule.version,
    title,
    status: "processing",
    input_data: validatedInput as never,
  });

  if (parsedDocument) {
    await createDecisionDocument(supabase, {
      decision_id: decision.id,
      file_name: parsedDocument.fileName ?? "pasted-text",
      file_type: parsedDocument.fileType ?? "text/plain",
      source_kind: parsedDocument.sourceKind,
      raw_text: parsedDocument.text,
      parsed_data: (extractedFields ?? {}) as never,
    });
  }

  try {
    // --- Layer 1: deterministic engine (no AI) -------------------------------
    const metrics = decisionModule.calculateMetrics(validatedInput, companyContext);

    decision = await updateDecision(supabase, decision.id, {
      deterministic_metrics: metrics as never,
    });

    // --- Layer 2: AI intelligence layer (Zod-validated) ----------------------
    const aiOutput = await runModuleAiAnalysis(decisionModule, validatedInput, metrics, companyContext);

    // --- Deterministic verdict resolution ------------------------------------
    const verdict = decisionModule.resolveVerdict(metrics, aiOutput, companyContext);

    decision = await updateDecision(supabase, decision.id, {
      status: "completed",
      ai_analysis: aiOutput as never,
      verdict: verdict as never,
      verdict_code: verdict.code,
      verdict_confidence: verdict.confidence,
      risks: ((aiOutput as { risks?: unknown }).risks ?? []) as never,
      recommended_actions: ((aiOutput as { recommendedActions?: unknown }).recommendedActions ?? []) as never,
    });

    return NextResponse.json({ decision }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error during analysis";

    decision = await updateDecision(supabase, decision.id, {
      status: "failed",
      error: message,
    });

    const status = error instanceof AiOutputValidationError ? 502 : 500;
    return NextResponse.json({ error: message, decision }, { status });
  }
}

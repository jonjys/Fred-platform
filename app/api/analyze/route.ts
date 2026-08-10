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
import { UPGRADE_PLAN } from "@/lib/billing/plan";
import { currentMonthlyUsage } from "@/lib/billing/usage";
import { toCompanyContext, getCompanyById } from "@/lib/database/repositories/companies";
import { createDecision, updateDecision } from "@/lib/database/repositories/decisions";
import { createDecisionDocument } from "@/lib/database/repositories/documents";
import { consumeMonthlyAnalysis, decrementTrialCredit, getOrCreateProfile } from "@/lib/database/repositories/profiles";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { parseFile, parsePastedText, UnparsablePdfError, UnsupportedDocumentTypeError } from "@/lib/documents/parser";
import { deepMergePreferOverride } from "@/lib/decision-engine/merge";

export const runtime = "nodejs";
// This pipeline makes up to two sequential Claude calls (extraction, then
// the main analysis), each retried up to twice on validation failure —
// comfortably past Vercel's default serverless timeout (10-15s) on a slow
// run, which kills the function mid-request and surfaces to the browser as
// an opaque fetch/network error rather than a real response.
export const maxDuration = 60;

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

  // --- Usage gate — before any AI-consuming work, not just before the AI
  // calls, so a gated request never pays for document parsing either. -------
  const profile = await getOrCreateProfile(supabase, user.id);
  const isSubscriptionActive = profile.subscription_status === "active";
  if (isSubscriptionActive) {
    if (currentMonthlyUsage(profile) >= UPGRADE_PLAN.monthlyAnalysisLimit) {
      return NextResponse.json(
        { error: `Monthly limit reached (${UPGRADE_PLAN.monthlyAnalysisLimit} analyses) — resets next month.`, billingUrl: "/settings/billing" },
        { status: 402 },
      );
    }
  } else if (profile.trial_credits <= 0) {
    return NextResponse.json(
      { error: "No credits left", billingUrl: "/settings/billing" },
      { status: 402 },
    );
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
    if (error instanceof UnsupportedDocumentTypeError || error instanceof UnparsablePdfError) {
      console.error(`[analyze] Document parsing failed: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  // --- Extract structured candidate values (AI-assisted, read-not-compute) --
  let mergedInput = explicitInput;
  let extractedFields: unknown = null;
  if (documentText) {
    console.log(
      `[analyze] Parsed ${documentText.length} chars of document text. Preview: ${JSON.stringify(documentText.slice(0, 300))}`,
    );

    if (decisionModule.extractInput) {
      extractedFields = await decisionModule.extractInput(documentText, companyContext);
      console.log(`[analyze] Extraction result: ${JSON.stringify(extractedFields)}`);
    }

    // The raw parsed text is folded in as a fallback default (a module's
    // buildPrompt uses `input.documentText` for qualitative reasoning, e.g.
    // contract-risk detection) — explicit input always still wins, so a
    // caller-provided documentText is never silently overwritten.
    const extractedWithDocumentText = deepMergePreferOverride({ documentText }, extractedFields ?? {});
    mergedInput = deepMergePreferOverride(extractedWithDocumentText, explicitInput);
  }

  // --- Validate the merged input before it reaches the deterministic engine -
  const inputResult = decisionModule.inputSchema.safeParse(mergedInput);
  if (!inputResult.success) {
    // Numbers must come from either the document or the user, never a
    // guess — so a validation failure after extraction ran isn't a bug,
    // it's the module correctly declining to invent what it couldn't find.
    // Say so explicitly rather than surfacing a bare Zod dump.
    const extractionNote = documentText
      ? " Claude could not find these values in the attached document — please enter them manually, or check that the document contains selectable text (not a scanned image)."
      : "";

    return NextResponse.json(
      { error: `Input failed validation.${extractionNote}`, issues: inputResult.error.issues },
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

    // Spend usage only now that the analysis actually succeeded — a failed
    // run should never cost the user anything. Active subscribers are
    // metered against the monthly cap instead of trial_credits.
    if (isSubscriptionActive) {
      await consumeMonthlyAnalysis(supabase, user.id, UPGRADE_PLAN.monthlyAnalysisLimit);
    } else {
      await decrementTrialCredit(supabase, user.id);
    }

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

import { NextResponse } from "next/server";
import { z } from "zod";
import { getDecisionById, updateDecision } from "@/lib/database/repositories/decisions";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

const paramsSchema = z.object({ id: z.string().uuid() });

const outcomeSchema = z.object({
  satisfaction: z.number().int().min(1).max(5).nullable().optional(),
  realizedCost: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const recordOutcomeSchema = z.object({
  finalDecision: z.string().min(1).nullable().optional(),
  finalDecisionNotes: z.string().nullable().optional(),
  outcome: outcomeSchema.nullable().optional(),
});

/** GET /api/decisions/:id — a single Decision Graph node, any module. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid decision id" }, { status: 400 });
  }

  const decision = await getDecisionById(supabase, params.data.id);
  if (!decision) {
    return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  }

  return NextResponse.json({ decision });
}

/**
 * PATCH /api/decisions/:id — records what the user actually decided and
 * (later) how it turned out. Module-agnostic: `final_decision`/`outcome`
 * are free-form per the schema, not tied to purchase-analysis's BUY /
 * NEGOTIATE / REJECT vocabulary, so this route never branches on module_key.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid decision id" }, { status: 400 });
  }

  // RLS (decisions_select_own) makes this return null for a decision the
  // caller doesn't own, giving a clean 404 instead of updateDecision's
  // zero-rows-updated error.
  const existing = await getDecisionById(supabase, params.data.id);
  if (!existing) {
    return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = recordOutcomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const { finalDecision, finalDecisionNotes, outcome } = parsed.data;
  const now = new Date().toISOString();

  const decision = await updateDecision(supabase, params.data.id, {
    ...(finalDecision !== undefined && {
      final_decision: finalDecision,
      decided_at: finalDecision !== null ? now : null,
    }),
    ...(finalDecisionNotes !== undefined && { final_decision_notes: finalDecisionNotes }),
    ...(outcome !== undefined && {
      outcome: outcome ?? null,
      outcome_recorded_at: outcome !== null ? now : null,
    }),
  });

  return NextResponse.json({ decision });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCompanyById } from "@/lib/database/repositories/companies";
import { searchEntitiesWithHistory } from "@/lib/database/repositories/entities";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import type { Verdict } from "@/lib/decision-engine/types";

const querySchema = z.object({
  companyId: z.string().uuid(),
  q: z.string().min(2),
});

/**
 * GET /api/entities?companyId=...&q=... — supplier-history lookup behind
 * the analyzer form's "you've evaluated this vendor before" panel. Matches
 * decision_entities by partial name and returns each match's full decision
 * history (verdict, final_decision, outcome), most recent first.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    companyId: searchParams.get("companyId"),
    q: searchParams.get("q"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  // RLS already prevents cross-user reads; this turns that into an explicit
  // 404 instead of a bare-null-shaped bug, matching /api/analyze's pattern.
  const company = await getCompanyById(supabase, parsed.data.companyId);
  if (!company || company.user_id !== user.id) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const entities = await searchEntitiesWithHistory(supabase, { companyId: parsed.data.companyId, query: parsed.data.q });

  return NextResponse.json({
    entities: entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      entityType: entity.entityType,
      decisions: entity.decisions.map((decision) => ({
        id: decision.id,
        title: decision.title,
        createdAt: decision.created_at,
        moduleKey: decision.module_key,
        role: decision.role,
        verdict: decision.verdict as Verdict | null,
        finalDecision: decision.final_decision,
        finalDecisionNotes: decision.final_decision_notes,
        decidedAt: decision.decided_at,
        outcome: decision.outcome,
        outcomeRecordedAt: decision.outcome_recorded_at,
      })),
    })),
  });
}

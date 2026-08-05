import { NextResponse } from "next/server";
import { z } from "zod";
import { listDecisions } from "@/lib/database/repositories/decisions";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

const listQuerySchema = z.object({
  companyId: z.string().uuid(),
  moduleKey: z.string().optional(),
  status: z.enum(["draft", "processing", "completed", "failed", "archived"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/decisions?companyId=...&moduleKey=...&status=...
 *
 * Lists decisions for a company — the Decision Graph history view. Works
 * identically for every module: it's a listing over the generic `decisions`
 * table, filtered by `module_key` when the caller wants a single module's
 * history (e.g. the AI Purchase Analyzer's history page).
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
  const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }

  // Row Level Security scopes this to companies the signed-in user owns;
  // an id for a company that isn't theirs simply returns an empty list.
  const decisions = await listDecisions(supabase, parsed.data);

  return NextResponse.json({ decisions });
}

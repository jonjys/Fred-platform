import { NextResponse } from "next/server";
import { z } from "zod";
import { getDecisionById } from "@/lib/database/repositories/decisions";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

const paramsSchema = z.object({ id: z.string().uuid() });

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

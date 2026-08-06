import { NextResponse } from "next/server";
import { z } from "zod";
import { createCompany, listCompaniesForUser } from "@/lib/database/repositories/companies";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

/** GET /api/companies — the signed-in user's AI Wallets. */
export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await listCompaniesForUser(supabase, user.id);
  return NextResponse.json({ companies });
}

const createCompanySchema = z.object({
  companyName: z.string().min(1),
  industry: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  currency: z.string().length(3).default("EUR"),
  vatRate: z.number().min(0).max(1).default(0),
});

/** POST /api/companies — create a new AI Wallet for the signed-in user. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const company = await createCompany(supabase, {
    user_id: user.id,
    company_name: parsed.data.companyName,
    industry: parsed.data.industry ?? null,
    country: parsed.data.country ?? null,
    currency: parsed.data.currency.toUpperCase(),
    vat_rate: parsed.data.vatRate,
  });

  return NextResponse.json({ company }, { status: 201 });
}

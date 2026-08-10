import { NextResponse } from "next/server";
import { z } from "zod";
import { getCompanyById, updateCompany } from "@/lib/database/repositories/companies";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

const paramsSchema = z.object({ id: z.string().uuid() });

const budgetSchema = z.object({
  amount: z.number().min(0),
  period: z.enum(["monthly", "annual"]),
});

const updateCompanySchema = z.object({
  companyName: z.string().min(1).optional(),
  industry: z.string().min(1).nullable().optional(),
  country: z.string().min(1).nullable().optional(),
  currency: z.string().length(3).optional(),
  vatRate: z.number().min(0).max(1).optional(),
  targetMargin: z.number().min(0).max(1).nullable().optional(),
  budget: budgetSchema.nullable().optional(),
});

/** GET /api/companies/:id — a single AI Wallet. */
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
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  // RLS (companies_select_own) makes this return null for a company the
  // caller doesn't own, not just one that doesn't exist.
  const company = await getCompanyById(supabase, params.data.id);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ company });
}

/** PATCH /api/companies/:id — update the AI Wallet's profile (budget, currency, VAT rate, target margin, ...). */
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
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  // Confirm ownership up front (via RLS) so a mismatched id gets a clean
  // 404 instead of `updateCompany`'s zero-rows-updated error.
  const existing = await getCompanyById(supabase, params.data.id);
  if (!existing) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const { companyName, industry, country, currency, vatRate, targetMargin, budget } = parsed.data;
  const company = await updateCompany(supabase, params.data.id, {
    ...(companyName !== undefined && { company_name: companyName }),
    ...(industry !== undefined && { industry }),
    ...(country !== undefined && { country }),
    ...(currency !== undefined && { currency: currency.toUpperCase() }),
    ...(vatRate !== undefined && { vat_rate: vatRate }),
    ...(targetMargin !== undefined && { target_margin: targetMargin }),
    // The `budget` column is NOT NULL — "no budget set" is represented as
    // `{}`, not SQL null (mirrors how toCompanyContext already reads it).
    ...(budget !== undefined && { budget: budget ?? {} }),
  });

  return NextResponse.json({ company });
}

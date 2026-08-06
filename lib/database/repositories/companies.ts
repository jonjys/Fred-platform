import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyContext } from "@/lib/decision-engine/types";
import type { Database } from "../types";

export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];

export async function getCompanyById(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<CompanyRow | null> {
  const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCompaniesForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CompanyRow[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCompany(
  supabase: SupabaseClient<Database>,
  company: CompanyInsert,
): Promise<CompanyRow> {
  const { data, error } = await supabase.from("companies").insert(company).select().single();
  if (error) throw error;
  return data;
}

/**
 * Maps a persisted `companies` row onto the `CompanyContext` the decision
 * engine and every module expect — the one place DB-shape details (JSONB
 * budget, string/number coercion) are translated into the domain type.
 */
export function toCompanyContext(row: CompanyRow): CompanyContext {
  const budget = row.budget as { amount?: number; period?: "monthly" | "annual" } | null;
  const hasValidBudget = budget != null && typeof budget.amount === "number" && budget.period != null;

  return {
    id: row.id,
    companyName: row.company_name,
    industry: row.industry,
    country: row.country,
    currency: row.currency,
    vatRate: Number(row.vat_rate),
    targetMargin: row.target_margin !== null ? Number(row.target_margin) : null,
    budget: hasValidBudget ? { amount: budget!.amount!, period: budget!.period! } : null,
    softwareStack: Array.isArray(row.software_stack) ? row.software_stack : [],
    preferences: (row.preferences as Record<string, unknown>) ?? {},
  };
}

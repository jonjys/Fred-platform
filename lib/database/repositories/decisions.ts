import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DecisionStatus } from "../types";

export type DecisionRow = Database["public"]["Tables"]["decisions"]["Row"];
export type DecisionInsert = Database["public"]["Tables"]["decisions"]["Insert"];
export type DecisionUpdate = Database["public"]["Tables"]["decisions"]["Update"];

export async function createDecision(
  supabase: SupabaseClient<Database>,
  decision: DecisionInsert,
): Promise<DecisionRow> {
  const { data, error } = await supabase.from("decisions").insert(decision).select().single();
  if (error) throw error;
  return data;
}

export async function updateDecision(
  supabase: SupabaseClient<Database>,
  decisionId: string,
  update: DecisionUpdate,
): Promise<DecisionRow> {
  const { data, error } = await supabase.from("decisions").update(update).eq("id", decisionId).select().single();
  if (error) throw error;
  return data;
}

export async function getDecisionById(
  supabase: SupabaseClient<Database>,
  decisionId: string,
): Promise<DecisionRow | null> {
  const { data, error } = await supabase.from("decisions").select("*").eq("id", decisionId).maybeSingle();
  if (error) throw error;
  return data;
}

export interface ListDecisionsParams {
  companyId: string;
  moduleKey?: string;
  status?: DecisionStatus;
  limit?: number;
  offset?: number;
}

export async function listDecisions(
  supabase: SupabaseClient<Database>,
  params: ListDecisionsParams,
): Promise<DecisionRow[]> {
  const { companyId, moduleKey, status, limit = 20, offset = 0 } = params;

  let query = supabase
    .from("decisions")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (moduleKey) query = query.eq("module_key", moduleKey);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export interface ListDecisionsForUserParams {
  moduleKey?: string;
  status?: DecisionStatus;
  limit?: number;
  offset?: number;
}

/**
 * Lists decisions across every company the signed-in user owns, without
 * requiring a `companyId` — relies entirely on the `decisions_select_own`
 * RLS policy (scoped via the owning company's `user_id`) rather than an
 * explicit filter. Use this for account-wide views like `/history` and the
 * dashboard's recent-decisions list; use `listDecisions` when the caller
 * already knows which single company it cares about.
 */
export async function listDecisionsForUser(
  supabase: SupabaseClient<Database>,
  params: ListDecisionsForUserParams = {},
): Promise<DecisionRow[]> {
  const { moduleKey, status, limit = 20, offset = 0 } = params;

  let query = supabase
    .from("decisions")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (moduleKey) query = query.eq("module_key", moduleKey);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

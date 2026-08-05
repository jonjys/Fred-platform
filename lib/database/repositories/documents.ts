import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

export type DecisionDocumentRow = Database["public"]["Tables"]["decision_documents"]["Row"];
export type DecisionDocumentInsert = Database["public"]["Tables"]["decision_documents"]["Insert"];

export async function createDecisionDocument(
  supabase: SupabaseClient<Database>,
  document: DecisionDocumentInsert,
): Promise<DecisionDocumentRow> {
  const { data, error } = await supabase.from("decision_documents").insert(document).select().single();
  if (error) throw error;
  return data;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DecisionEntityType } from "../types";
import type { DecisionRow } from "./decisions";

export type EntityRow = Database["public"]["Tables"]["decision_entities"]["Row"];
export type EntityLinkRow = Database["public"]["Tables"]["decision_entity_links"]["Row"];

/**
 * Finds the existing `decision_entities` row for this company/type/name, or
 * creates one. Matches on `normalized_name` (a generated `lower(trim(name))`
 * column), the same normalization the table's unique index enforces, so
 * "Acme Inc." and "acme inc." resolve to the same entity.
 */
export async function findOrCreateEntity(
  supabase: SupabaseClient<Database>,
  params: { companyId: string; entityType: DecisionEntityType; name: string },
): Promise<EntityRow> {
  const { companyId, entityType, name } = params;
  const normalizedName = name.trim().toLowerCase();

  const existing = await findEntityByNormalizedName(supabase, companyId, entityType, normalizedName);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("decision_entities")
    .insert({ company_id: companyId, entity_type: entityType, name: name.trim() })
    .select()
    .single();

  if (error) {
    // Unique-violation race: a concurrent request created the same entity
    // between our lookup and this insert — re-fetch rather than fail the
    // whole analysis over a harmless dedupe race.
    if (error.code === "23505") {
      const retried = await findEntityByNormalizedName(supabase, companyId, entityType, normalizedName);
      if (retried) return retried;
    }
    throw error;
  }
  return data;
}

async function findEntityByNormalizedName(
  supabase: SupabaseClient<Database>,
  companyId: string,
  entityType: DecisionEntityType,
  normalizedName: string,
): Promise<EntityRow | null> {
  const { data, error } = await supabase
    .from("decision_entities")
    .select("*")
    .eq("company_id", companyId)
    .eq("entity_type", entityType)
    .eq("normalized_name", normalizedName)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Links a decision to an entity it involved. Idempotent — re-linking the
 * same decision/entity pair (unique-indexed) is treated as a no-op rather
 * than an error. */
export async function createEntityLink(
  supabase: SupabaseClient<Database>,
  params: { decisionId: string; entityId: string; role: string },
): Promise<void> {
  const { error } = await supabase.from("decision_entity_links").insert({
    decision_id: params.decisionId,
    entity_id: params.entityId,
    role: params.role,
  });
  if (error && error.code !== "23505") throw error;
}

export interface EntityWithHistory {
  id: string;
  name: string;
  entityType: DecisionEntityType;
  decisions: Array<DecisionRow & { role: string }>;
}

/**
 * Powers the analyzer form's supplier-history lookup: matches entities by a
 * partial name (for live "as you type" search) and returns each match's
 * full decision history, most recent first. Two flat queries joined in
 * application code rather than a nested PostgREST select, matching this
 * repository layer's existing style (see listDecisionsForUser) and
 * sidestepping the hand-maintained Database type's lack of relationship
 * metadata.
 */
export async function searchEntitiesWithHistory(
  supabase: SupabaseClient<Database>,
  params: { companyId: string; query: string; limit?: number },
): Promise<EntityWithHistory[]> {
  const { companyId, query, limit = 5 } = params;
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const { data: entities, error: entitiesError } = await supabase
    .from("decision_entities")
    .select("*")
    .eq("company_id", companyId)
    .ilike("normalized_name", `%${normalizedQuery}%`)
    .limit(limit);
  if (entitiesError) throw entitiesError;
  if (!entities || entities.length === 0) return [];

  const entityIds = entities.map((entity) => entity.id);
  const { data: links, error: linksError } = await supabase
    .from("decision_entity_links")
    .select("*")
    .in("entity_id", entityIds);
  if (linksError) throw linksError;

  const decisionIds = [...new Set((links ?? []).map((link) => link.decision_id))];
  const { data: decisions, error: decisionsError } =
    decisionIds.length > 0
      ? await supabase.from("decisions").select("*").in("id", decisionIds)
      : { data: [] as DecisionRow[], error: null };
  if (decisionsError) throw decisionsError;

  const decisionsById = new Map((decisions ?? []).map((decision) => [decision.id, decision]));

  return entities.map((entity) => {
    const entityLinks = (links ?? []).filter((link) => link.entity_id === entity.id);
    const decisionsForEntity = entityLinks
      .map((link) => {
        const decision = decisionsById.get(link.decision_id);
        return decision ? { ...decision, role: link.role } : null;
      })
      .filter((decision): decision is DecisionRow & { role: string } => decision !== null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      id: entity.id,
      name: entity.name,
      entityType: entity.entity_type,
      decisions: decisionsForEntity,
    };
  });
}

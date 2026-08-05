-- =============================================================================
-- AI Business Decision OS — Core Database Schema
-- =============================================================================
--
-- ARCHITECTURAL INTENT
-- ---------------------------------------------------------------------------
-- This schema is deliberately module-agnostic. "AI Purchase Analyzer" is the
-- first Decision Module, not the shape of the database. Every table that
-- would otherwise be named/typed around "purchases" is instead built around
-- the generic concept of a *Decision*:
--
--   Company (AI Wallet)  -- who is deciding
--   Decision              -- what was decided, using which module
--   Decision Document     -- source material that fed the decision
--   Decision Entity       -- a reusable real-world thing being evaluated
--                            (vendor, supplier, product, investment target...)
--   Decision Entity Link  -- how an entity relates to a specific decision
--                            (primary option, alternative, incumbent...)
--   Company Module Access -- feature/billing gating per module, per company
--
-- A future "Supplier Comparison" or "Contract Intelligence" module reuses
-- every one of these tables unchanged: it just writes a new `module_key`
-- into `decisions.module_key` and shapes its own `input_data` /
-- `deterministic_metrics` / `ai_analysis` JSON payloads. The module registry
-- that defines what those payloads look like lives in code
-- (config/tools.ts), not in the database — the DB never needs a migration
-- to add a new module.
--
-- All JSONB payloads are intentionally schema-flexible at the SQL layer;
-- their shape is enforced at the application boundary via Zod
-- (lib/decision-engine/schemas.ts and per-module schemas). This keeps the
-- database from needing a migration every time a module's payload evolves,
-- while the application still gets full type safety.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

-- Lifecycle of a single decision record. Deliberately generic — not tied to
-- any one module's workflow.
create type decision_status as enum (
  'draft',        -- created, inputs not yet finalized
  'processing',   -- deterministic engine / AI pipeline running
  'completed',    -- verdict produced
  'failed',       -- pipeline error (see decisions.error)
  'archived'      -- soft-hidden from default views
);

-- The real-world "kind" of thing a decision_entity represents. Extend this
-- list as new modules are added (e.g. 'investment_target', 'candidate').
create type decision_entity_type as enum (
  'vendor',
  'supplier',
  'product',
  'service',
  'contract_party',
  'other'
);

-- -----------------------------------------------------------------------------
-- updated_at helper trigger
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- companies  (the "AI Wallet" — persistent company/business context)
-- =============================================================================
-- One auth user may own multiple companies (agencies, consultants, holding
-- structures analyzing decisions on behalf of several businesses).
create table companies (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,

  company_name      text not null,
  industry          text,
  country           text,                          -- ISO 3166-1 alpha-2
  currency          text not null default 'EUR',    -- ISO 4217
  vat_rate          numeric(6, 4) not null default 0, -- e.g. 0.2100 = 21%
  target_margin     numeric(6, 4),                  -- e.g. 0.3000 = 30%

  -- Flexible, forward-compatible fields. Keeping these as JSONB avoids a
  -- migration every time a new preference or wallet attribute is needed.
  budget            jsonb not null default '{}'::jsonb,   -- { amount, period, category_caps: {...} }
  software_stack    jsonb not null default '[]'::jsonb,   -- [{ name, category, monthlyCost, renewalDate }]
  preferences       jsonb not null default '{}'::jsonb,   -- risk tolerance, negotiation style, blocked vendors...
  metadata          jsonb not null default '{}'::jsonb,   -- reserved for future module-contributed fields

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index companies_user_id_idx on companies(user_id);

create trigger companies_set_updated_at
  before update on companies
  for each row execute function set_updated_at();

-- =============================================================================
-- decisions  (the core "Decision Graph" node — module-agnostic)
-- =============================================================================
create table decisions (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  created_by            uuid not null references auth.users(id) on delete cascade,

  -- Identifies which Decision Module produced/owns this record. This is a
  -- free-text key resolved against the code-level registry in
  -- config/tools.ts (e.g. "purchase-analysis"), intentionally NOT a foreign
  -- key into a database table — modules are a code concern, not a schema
  -- concern, so adding one never requires a migration.
  module_key            text not null,
  module_version         text not null default '1',

  title                 text not null,
  status                decision_status not null default 'draft',

  -- Pipeline stages, each validated by module-specific Zod schemas before
  -- being written here:
  input_data            jsonb not null default '{}'::jsonb,  -- normalized module input (post document-parsing)
  deterministic_metrics jsonb,                                 -- output of lib/decision-engine (Layer 1, no AI)
  ai_analysis            jsonb,                                 -- Claude's structured output (Layer 2, Zod-validated)

  -- Denormalized top-level outcome fields for fast filtering/listing without
  -- reaching into JSONB — verdict.code is module-defined (e.g.
  -- BUY/NEGOTIATE/REJECT today, something else for a future module).
  verdict_code          text,
  verdict_confidence    numeric(4, 3),                          -- 0.000–1.000
  verdict               jsonb,                                   -- full verdict payload (code, label, reasoning, confidence)

  risks                 jsonb not null default '[]'::jsonb,     -- [{ severity, category, description }]
  recommended_actions   jsonb not null default '[]'::jsonb,     -- negotiation points / next steps, module-defined shape

  -- The Decision Graph's long-term moat: what the user actually did, and
  -- what happened, independent of what the AI recommended.
  final_decision         text,                                    -- e.g. "BUY" — the human's actual choice
  final_decision_notes   text,
  decided_at             timestamptz,
  outcome                jsonb,                                   -- filled in later: realized cost, satisfaction, etc.
  outcome_recorded_at    timestamptz,

  error                  text,                                    -- populated when status = 'failed'

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index decisions_company_id_idx on decisions(company_id);
create index decisions_module_key_idx on decisions(module_key);
create index decisions_status_idx on decisions(status);
create index decisions_created_at_idx on decisions(created_at desc);
-- Companies most often want "my history of purchase decisions", so this
-- composite index covers the dashboard/history query directly.
create index decisions_company_module_created_idx
  on decisions(company_id, module_key, created_at desc);

create trigger decisions_set_updated_at
  before update on decisions
  for each row execute function set_updated_at();

-- =============================================================================
-- decision_documents  (source material behind a decision)
-- =============================================================================
create table decision_documents (
  id             uuid primary key default gen_random_uuid(),
  decision_id    uuid not null references decisions(id) on delete cascade,

  file_name      text not null,
  file_type      text not null,               -- mime type
  storage_path   text,                          -- Supabase Storage object path, if a file was uploaded
  source_kind    text not null default 'file', -- 'file' | 'pasted_text' | 'url'

  raw_text       text,                          -- full extracted text (for audit / re-processing)
  parsed_data    jsonb not null default '{}'::jsonb, -- structured candidate fields from lib/documents/parser.ts

  created_at     timestamptz not null default now()
);

create index decision_documents_decision_id_idx on decision_documents(decision_id);

-- =============================================================================
-- decision_entities  (reusable real-world things: vendors, suppliers, products)
-- =============================================================================
-- Normalizing entities out of individual decisions is what makes future
-- modules like Supplier Comparison or Vendor Management possible without a
-- schema change: they query "all decisions this entity has appeared in"
-- across module boundaries.
create table decision_entities (
  id               uuid primary key default gen_random_uuid(),
  -- NULL company_id = a shared/global entity (e.g. a well-known SaaS vendor)
  -- that any company's decisions can reference.
  company_id       uuid references companies(id) on delete cascade,

  entity_type      decision_entity_type not null default 'other',
  name             text not null,
  normalized_name  text generated always as (lower(trim(name))) stored,

  metadata         jsonb not null default '{}'::jsonb, -- website, category, known pricing, notes...

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index decision_entities_company_id_idx on decision_entities(company_id);
create index decision_entities_type_idx on decision_entities(entity_type);
-- Prevents duplicate vendor rows per company (or globally when company_id is null).
create unique index decision_entities_dedupe_idx
  on decision_entities (coalesce(company_id, '00000000-0000-0000-0000-000000000000'), entity_type, normalized_name);

create trigger decision_entities_set_updated_at
  before update on decision_entities
  for each row execute function set_updated_at();

-- =============================================================================
-- decision_entity_links  (how an entity participates in a specific decision)
-- =============================================================================
create table decision_entity_links (
  id             uuid primary key default gen_random_uuid(),
  decision_id    uuid not null references decisions(id) on delete cascade,
  entity_id      uuid not null references decision_entities(id) on delete cascade,

  role           text not null default 'alternative', -- 'primary_option' | 'alternative' | 'incumbent' | ...
  metrics        jsonb not null default '{}'::jsonb,     -- this entity's computed metrics within this decision

  created_at     timestamptz not null default now()
);

create index decision_entity_links_decision_id_idx on decision_entity_links(decision_id);
create index decision_entity_links_entity_id_idx on decision_entity_links(entity_id);
create unique index decision_entity_links_unique_idx
  on decision_entity_links(decision_id, entity_id);

-- =============================================================================
-- company_module_access  (per-company feature/billing gating, module-agnostic)
-- =============================================================================
-- Keeps entitlement logic out of application code: a Stripe webhook can
-- flip `enabled` for a module_key without any module-specific table.
create table company_module_access (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  module_key   text not null,
  enabled      boolean not null default true,
  plan_tier    text,
  enabled_at   timestamptz not null default now()
);

create unique index company_module_access_unique_idx
  on company_module_access(company_id, module_key);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table companies enable row level security;
alter table decisions enable row level security;
alter table decision_documents enable row level security;
alter table decision_entities enable row level security;
alter table decision_entity_links enable row level security;
alter table company_module_access enable row level security;

-- companies: a user may only see/manage their own companies.
create policy "companies_select_own" on companies
  for select using (user_id = auth.uid());
create policy "companies_insert_own" on companies
  for insert with check (user_id = auth.uid());
create policy "companies_update_own" on companies
  for update using (user_id = auth.uid());
create policy "companies_delete_own" on companies
  for delete using (user_id = auth.uid());

-- decisions: scoped via owning company.
create policy "decisions_select_own" on decisions
  for select using (
    exists (select 1 from companies c where c.id = decisions.company_id and c.user_id = auth.uid())
  );
create policy "decisions_insert_own" on decisions
  for insert with check (
    exists (select 1 from companies c where c.id = decisions.company_id and c.user_id = auth.uid())
  );
create policy "decisions_update_own" on decisions
  for update using (
    exists (select 1 from companies c where c.id = decisions.company_id and c.user_id = auth.uid())
  );
create policy "decisions_delete_own" on decisions
  for delete using (
    exists (select 1 from companies c where c.id = decisions.company_id and c.user_id = auth.uid())
  );

-- decision_documents: scoped via owning decision -> company.
create policy "decision_documents_select_own" on decision_documents
  for select using (
    exists (
      select 1 from decisions d
      join companies c on c.id = d.company_id
      where d.id = decision_documents.decision_id and c.user_id = auth.uid()
    )
  );
create policy "decision_documents_insert_own" on decision_documents
  for insert with check (
    exists (
      select 1 from decisions d
      join companies c on c.id = d.company_id
      where d.id = decision_documents.decision_id and c.user_id = auth.uid()
    )
  );

-- decision_entities: visible if global (company_id is null) or owned.
create policy "decision_entities_select_own_or_global" on decision_entities
  for select using (
    company_id is null
    or exists (select 1 from companies c where c.id = decision_entities.company_id and c.user_id = auth.uid())
  );
create policy "decision_entities_insert_own" on decision_entities
  for insert with check (
    company_id is null
    or exists (select 1 from companies c where c.id = decision_entities.company_id and c.user_id = auth.uid())
  );
create policy "decision_entities_update_own" on decision_entities
  for update using (
    exists (select 1 from companies c where c.id = decision_entities.company_id and c.user_id = auth.uid())
  );

-- decision_entity_links: scoped via owning decision -> company.
create policy "decision_entity_links_select_own" on decision_entity_links
  for select using (
    exists (
      select 1 from decisions d
      join companies c on c.id = d.company_id
      where d.id = decision_entity_links.decision_id and c.user_id = auth.uid()
    )
  );
create policy "decision_entity_links_insert_own" on decision_entity_links
  for insert with check (
    exists (
      select 1 from decisions d
      join companies c on c.id = d.company_id
      where d.id = decision_entity_links.decision_id and c.user_id = auth.uid()
    )
  );

-- company_module_access: scoped via owning company.
create policy "company_module_access_select_own" on company_module_access
  for select using (
    exists (select 1 from companies c where c.id = company_module_access.company_id and c.user_id = auth.uid())
  );

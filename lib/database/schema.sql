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
set search_path = ''
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
  for select using (user_id = (select auth.uid()));
create policy "companies_insert_own" on companies
  for insert with check (user_id = (select auth.uid()));
create policy "companies_update_own" on companies
  for update using (user_id = (select auth.uid()));
create policy "companies_delete_own" on companies
  for delete using (user_id = (select auth.uid()));

-- decisions: scoped via owning company.
create policy "decisions_select_own" on decisions
  for select using (
    exists (select 1 from companies c where c.id = decisions.company_id and c.user_id = (select auth.uid()))
  );
create policy "decisions_insert_own" on decisions
  for insert with check (
    exists (select 1 from companies c where c.id = decisions.company_id and c.user_id = (select auth.uid()))
  );
create policy "decisions_update_own" on decisions
  for update using (
    exists (select 1 from companies c where c.id = decisions.company_id and c.user_id = (select auth.uid()))
  );
create policy "decisions_delete_own" on decisions
  for delete using (
    exists (select 1 from companies c where c.id = decisions.company_id and c.user_id = (select auth.uid()))
  );

-- decision_documents: scoped via owning decision -> company.
create policy "decision_documents_select_own" on decision_documents
  for select using (
    exists (
      select 1 from decisions d
      join companies c on c.id = d.company_id
      where d.id = decision_documents.decision_id and c.user_id = (select auth.uid())
    )
  );
create policy "decision_documents_insert_own" on decision_documents
  for insert with check (
    exists (
      select 1 from decisions d
      join companies c on c.id = d.company_id
      where d.id = decision_documents.decision_id and c.user_id = (select auth.uid())
    )
  );

-- decision_entities: visible if global (company_id is null) or owned.
create policy "decision_entities_select_own_or_global" on decision_entities
  for select using (
    company_id is null
    or exists (select 1 from companies c where c.id = decision_entities.company_id and c.user_id = (select auth.uid()))
  );
create policy "decision_entities_insert_own" on decision_entities
  for insert with check (
    company_id is null
    or exists (select 1 from companies c where c.id = decision_entities.company_id and c.user_id = (select auth.uid()))
  );
create policy "decision_entities_update_own" on decision_entities
  for update using (
    exists (select 1 from companies c where c.id = decision_entities.company_id and c.user_id = (select auth.uid()))
  );

-- decision_entity_links: scoped via owning decision -> company.
create policy "decision_entity_links_select_own" on decision_entity_links
  for select using (
    exists (
      select 1 from decisions d
      join companies c on c.id = d.company_id
      where d.id = decision_entity_links.decision_id and c.user_id = (select auth.uid())
    )
  );
create policy "decision_entity_links_insert_own" on decision_entity_links
  for insert with check (
    exists (
      select 1 from decisions d
      join companies c on c.id = d.company_id
      where d.id = decision_entity_links.decision_id and c.user_id = (select auth.uid())
    )
  );

-- company_module_access: scoped via owning company.
create policy "company_module_access_select_own" on company_module_access
  for select using (
    exists (select 1 from companies c where c.id = company_module_access.company_id and c.user_id = (select auth.uid()))
  );

-- =============================================================================
-- profiles  (per-user billing/usage state — trial credits + Stripe subscription)
-- =============================================================================
-- Deliberately separate from `companies`: billing is per Supabase auth user
-- (one login = one bill), while a user may own several companies (AI
-- Wallets). Keeping them apart means multi-company users are never
-- accidentally charged or gated per-company.
create table profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade unique,

  trial_credits         int not null default 5,
  stripe_customer_id    text unique,
  subscription_status   text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'canceled')),

  -- Usage cap for active (Pro) subscribers only — trial users are gated on
  -- trial_credits instead. `monthly_period_start` is the first-of-month the
  -- counter currently applies to; `consume_monthly_analysis` rolls both
  -- columns over automatically the first time it's called in a new month.
  monthly_analyses_used  int not null default 0,
  monthly_period_start   date not null default date_trunc('month', now())::date,

  created_at            timestamptz not null default now()
);

create index profiles_stripe_customer_id_idx on profiles(stripe_customer_id);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (user_id = (select auth.uid()));
-- Deliberately NO insert/update policy for the signed-in user. Every column
-- on this row (trial_credits, subscription_status, stripe_customer_id) is
-- billing-sensitive: an update-own policy that only checks `user_id =
-- auth.uid()` would let any authenticated client PATCH their own row via
-- Supabase's REST API straight to `subscription_status = 'active'`,
-- bypassing Stripe entirely. All writes go through SECURITY DEFINER paths
-- instead: the `handle_new_user` trigger (insert), the service-role client
-- in getOrCreateProfile's fallback insert, the Stripe webhook (service-role
-- update), and the `decrement_trial_credit` / `consume_monthly_analysis`
-- functions below (definer-scoped mutation, not a raw table grant).

-- Auto-provisions a profile the moment a Supabase auth user is created, so
-- new signups never hit the lazy-create fallback at all. SECURITY DEFINER
-- is required here: this trigger fires as a side effect of an insert into
-- auth.users, a schema the signing-up user has no direct privileges on.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger-only — never meant to be callable directly via the client-facing
-- REST API. Supabase grants EXECUTE to anon/authenticated by default on
-- function creation (both a direct grant and a separate PUBLIC-level
-- default), so both must be revoked explicitly to actually lock it down.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Atomic "spend one trial credit" — a plain client-side
-- update({trial_credits: n - 1}) would race under concurrent requests from
-- the same user; this does the decrement and the "don't go below zero"
-- guard in a single statement. Returns the updated row, or no row if the
-- user had no credits left (caller should treat that as already-gated).
create or replace function public.decrement_trial_credit(p_user_id uuid)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  updated_row public.profiles;
begin
  update public.profiles
    set trial_credits = trial_credits - 1
    where user_id = p_user_id and trial_credits > 0
    returning * into updated_row;
  return updated_row;
end;
$$;

-- Supabase grants EXECUTE to anon (both directly and via a PUBLIC-level
-- default) on function creation — revoke both before granting only to
-- authenticated, the sole role that should ever call this.
revoke execute on function public.decrement_trial_credit(uuid) from public, anon;
grant execute on function public.decrement_trial_credit(uuid) to authenticated;

-- Atomic "spend one analysis against the monthly Pro cap." Single UPDATE so
-- the month-rollover check and the increment-with-cap guard can't race:
--   - Different calendar month than monthly_period_start -> always allowed;
--     resets the counter to 1 and moves monthly_period_start forward.
--   - Same month -> allowed only while monthly_analyses_used < p_limit.
-- Returns the updated row, or no row if the caller is at the cap for the
-- current month (caller should treat that as already-gated).
create or replace function public.consume_monthly_analysis(p_user_id uuid, p_limit int)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  updated_row public.profiles;
  current_period date := date_trunc('month', now())::date;
begin
  update public.profiles
    set monthly_analyses_used = case
          when monthly_period_start = current_period then monthly_analyses_used + 1
          else 1
        end,
        monthly_period_start = current_period
    where user_id = p_user_id
      and (monthly_period_start <> current_period or monthly_analyses_used < p_limit)
    returning * into updated_row;
  return updated_row;
end;
$$;

revoke execute on function public.consume_monthly_analysis(uuid, int) from public, anon;
grant execute on function public.consume_monthly_analysis(uuid, int) to authenticated;

-- =============================================================================
-- rate_limit_buckets  (generic fixed-window request counter — no new infra)
-- =============================================================================
-- Deliberately not scoped to any one route or resource: `key` is caller-
-- defined (e.g. "analyze:" || user_id), so the same table/function backs
-- rate limiting for any future endpoint. No RLS policies are defined here on
-- purpose — this table has nothing for a client to legitimately read or
-- write directly, so leaving it policy-less (RLS enabled, zero grants)
-- locks it to the service-role client / SECURITY DEFINER functions only,
-- same trust boundary as `profiles`.
create table rate_limit_buckets (
  key           text primary key,
  window_start  timestamptz not null default now(),
  count         int not null default 0
);

alter table rate_limit_buckets enable row level security;

-- Atomic "record one request and say whether it's within the limit."
-- Single UPSERT so the window-rollover check and the increment can't race:
--   - No existing bucket, or the existing bucket's window has expired ->
--     starts a fresh window at count 1 (always allowed).
--   - Window still active -> increments; allowed while the new count is
--     still <= p_max.
-- Returns true (allowed) or false (rate-limited) — never throws, so a
-- caller can fail open on unexpected errors instead of blocking requests
-- if this table has an outage independent of the rest of the app.
create or replace function public.check_rate_limit(p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  current_count int;
begin
  insert into public.rate_limit_buckets (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case
          when rate_limit_buckets.window_start <= now() - (p_window_seconds || ' seconds')::interval
            then 1
          else rate_limit_buckets.count + 1
        end,
        window_start = case
          when rate_limit_buckets.window_start <= now() - (p_window_seconds || ' seconds')::interval
            then now()
          else rate_limit_buckets.window_start
        end
  returning count into current_count;

  return current_count <= p_max;
end;
$$;

-- =============================================================================
-- GRANTS FOR SUPABASE AUTHENTICATED ROLE (FIX)
-- =============================================================================
-- Detta är det som saknades och orsakade "permission denied for table profiles/decisions".
-- I Supabase måste rollen 'authenticated' ha USAGE + table-privilegier, RLS räcker inte.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Ge full CRUD till alla app-tabeller för inloggade användare (RLS filtrerar raderna)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- Anon behöver bara läsa publika tabeller (om du har några), annars kan du ta bort raden nedan
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Sequences för id-kolumner
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Säkerställ att framtida tabeller också får rättigheter automatiskt
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Service-role-only — never meant to be callable directly via the
-- client-facing REST API. Same two-part revoke as handle_new_user (direct
-- grant + PUBLIC-level default, both applied by Supabase on creation).
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
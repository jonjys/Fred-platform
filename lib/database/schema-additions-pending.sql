-- Pending schema additions from the 13-14 aug nattpass.
--
-- NOT applied to any Supabase project. Written here because this session
-- has no Supabase MCP access (no way to run apply_migration), not because
-- these are speculative — apply by hand (or hand this to a session that
-- does have Supabase access) when ready.

-- Punkt 4: lets the billing page show "Pro aktiv till <date>" without a
-- live Stripe call once we're ready to persist it. Not required today —
-- app/(dashboard)/settings/billing/page.tsx currently reads the same
-- information live from Stripe via lib/billing/stripeDetails.ts, so this
-- is an optimization/cache, not a blocker for the feature itself.
alter table public.profiles
  add column if not exists subscription_ends_at timestamptz;

comment on column public.profiles.subscription_ends_at is
  'Set from the Stripe subscription''s current_period_end when subscription_status transitions to canceled — the date access should actually lapse. Null while active/trial. Requires a corresponding write in app/api/stripe/webhook/route.ts (customer.subscription.updated / .deleted) once this column exists.';

-- Punkt 2: lets the trial onboarding modal's "shown once" state survive
-- across devices/browsers, not just the current one (today it's
-- localStorage-backed, which survives a hard refresh but not a new
-- device/browser).
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Fred Intake (app/core/intake, lib/fred/*) — ported from jonjys/fred-core.
--
-- You said atoms/devices/tunnels already exist in xaszyzqcxrvbbbkebqxj
-- (confirmed in Table Editor). I have no Supabase access this session to
-- inspect their actual live column types, so the CREATE TABLE statements
-- below are `if not exists` no-ops if a table is already there — they will
-- NOT fix a mismatched existing structure. What actually matters, and what
-- you should run regardless of whether the tables already exist, is the
-- RLS section at the bottom.
--
-- Why this matters: fred-core's own repo has TWO different schema files
-- that disagree. /schema.sql has `create policy "allow all for now" ...
-- using (true)` — i.e. no real access control — and doesn't define
-- devices/tunnels at all. /supabase/schema.sql has the correct
-- `auth.uid() = user_id` policies. If whichever one is live right now is
-- the first one, atoms/devices/tunnels are currently readable and
-- writable by anyone (any authenticated user, and depending on your
-- anon-key grants possibly unauthenticated too) — including Swish
-- amounts/phone numbers people share through the intake flow. Run the RLS
-- section below to close that regardless of which CREATE TABLE path your
-- tables took.
--
-- lib/fred/tunnel.ts's createAtom() always sets user_id to the current
-- session's auth.uid() server-side (never a caller-supplied value), so it
-- doesn't depend on RLS for correctness — but RLS is still the only thing
-- stopping a signed-in user from reading or writing another user's atoms.

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text,
  last_seen timestamptz not null default now()
);

create table if not exists public.atoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

create table if not exists public.tunnels (
  id uuid primary key default gen_random_uuid(),
  atom_id uuid not null references public.atoms(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.devices enable row level security;
alter table public.atoms enable row level security;
alter table public.tunnels enable row level security;

drop policy if exists "allow all for now" on public.atoms;
drop policy if exists "Users can only see their own data" on public.devices;
drop policy if exists "Users can only see their own data" on public.atoms;
drop policy if exists "Users can only see their own data" on public.tunnels;

create policy "devices_own" on public.devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "atoms_own" on public.atoms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tunnels_own" on public.tunnels
  for all using (auth.uid() = (select user_id from public.atoms where id = atom_id));

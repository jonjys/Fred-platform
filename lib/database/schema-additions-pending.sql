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

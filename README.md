# AI Business Decision OS

A Decision Intelligence Platform for SMBs, solopreneurs, and B2B buyers. It answers: **"Should I BUY, NEGOTIATE, or
REJECT this decision?"** — starting with the AI Purchase Analyzer, the first of many planned Decision Modules
(Supplier Comparison, Contract Intelligence, Procurement, Investment Analysis, Pricing Intelligence, Due Diligence,
Vendor Management...).

## Architecture

Two strictly separated layers:

- **Layer 1 — Deterministic Decision Engine** (`lib/decision-engine/`): pure TypeScript, no AI, no I/O. All TCO, VAT,
  ROI, and cost-comparison math lives here and is fully unit-tested (`npm test`).
- **Layer 2 — AI Intelligence Layer** (`lib/ai/`): Claude explains, extracts, and reasons about qualitative risk —
  it never invents or calculates a number. Every AI response is Zod-validated before it's trusted.

The platform is built around a generic **Decision Module** contract (`lib/decision-engine/types.ts`), registered in
`config/tools.ts`. `purchase-analysis` is the first module; new modules are added by implementing the contract under
`lib/decision-engine/modules/<module-key>/` and registering one line — no changes to the database, API pipeline, or
core types required. See `lib/database/schema.sql` for the module-agnostic schema design and `config/tools.ts` for
the registry.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Anthropic + Stripe credentials
npm run dev
```

Run the deterministic engine's test suite:

```bash
npm test
```

Apply the database schema to a Supabase project via the SQL editor or CLI:

```bash
supabase db push < lib/database/schema.sql
```

`lib/database/schema.sql` is the canonical, cumulative schema — re-run the whole file against a fresh project. For
an existing project that predates a given feature, apply only the relevant `alter table` / `create policy` /
`create function` statements added since (see git history on this file).

Before shipping, verify the full pipeline stays green:

```bash
npx tsc --noEmit && npx eslint . && npx vitest run && rm -rf .next && npm run build
```

## Billing & usage

Two paid tiers of usage gating, enforced server-side in `/api/analyze` (never client-side only):

- **Trial**: 5 free analyses per account (`profiles.trial_credits`), decremented atomically via the
  `decrement_trial_credit` SQL function only after an analysis succeeds.
- **Pro** (Stripe subscription, `lib/billing/plan.ts`): 50 analyses per calendar month
  (`profiles.monthly_analyses_used` / `monthly_period_start`), enforced by the `consume_monthly_analysis` SQL
  function, which rolls the counter over automatically on the first request of a new month.

Checkout, the Stripe customer portal, and subscription state (`app/api/stripe/`) all key off `profiles.stripe_customer_id`.
The `profiles_select_own` RLS policy is the *only* client-writable-adjacent policy on that table — there is
deliberately no insert/update policy for the signed-in user, since every column is billing-sensitive. All writes go
through `SECURITY DEFINER` SQL functions or the service-role client from trusted server code (the `handle_new_user`
trigger, `getOrCreateProfile`'s fallback insert, the Stripe webhook, `decrement_trial_credit`,
`consume_monthly_analysis`).

## Company profiles (AI Wallet)

Each user manages one or more company profiles at `/settings` (currency, VAT rate, target margin, budget). This is
the `CompanyContext` (`lib/decision-engine/types.ts`) passed into every Decision Module — it's what makes budget-fit,
VAT-inclusive totals, and margin checks specific to the company running the analysis rather than generic.

## Project structure

```
app/
  (dashboard)/        # dashboard, analyze, history, settings routes
  api/
    analyze/          # POST — the generic Decision Pipeline
    decisions/        # GET  — Decision Graph history
    companies/        # GET/POST/PATCH — AI Wallet (company profile) CRUD
    stripe/           # checkout, billing portal, webhook
lib/
  decision-engine/     # Layer 1 — deterministic, module-agnostic + purchase-analysis module
  ai/                  # Layer 2 — Claude integration, Zod-validated
  documents/           # mechanical PDF/text parsing
  database/            # Supabase clients, repositories, schema.sql
  billing/             # Stripe client, plan constants, usage-window helpers
config/
  tools.ts             # Decision Module registry
```

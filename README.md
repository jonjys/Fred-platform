# FRED — AI Business Decision OS

**What FRED is, in one sentence:** a system that answers *"Should I BUY, NEGOTIATE, or REJECT this decision?"* for a
small business owner or CFO — with a real, calculated number behind the answer, not a guess.

That's the whole point. Not a dashboard, not a chat bot, not a suite of tools bolted together — one honest verdict
per decision, backed by a deterministic engine that computes TCO, ROI, and VAT-adjusted cost. AI is allowed to
*explain* and *reason about qualitative risk*. AI is never allowed to invent or calculate the number. That split is
the whole architecture (see below) and it is not negotiable — it's the difference between a decision tool a CFO can
trust and one they can't.

**What it was meant to become:** not a single calculator — an operating system for business decisions. Purchase
Analysis was the first Decision Module. The plan was more of them (Debt Optimization, ROI Analysis, Supplier
Comparison, Contract Intelligence, Procurement, Investment Analysis, Pricing Intelligence, Due Diligence, Vendor
Management), all sharing one engine, one company profile (the "AI Wallet" — currency, VAT rate, margin, budget), and
one decision history per user — so decisions accumulate into a real track record instead of each analysis being
disposable. The outcome-tracking feature (did the BUY actually pay off?) exists for exactly this reason: FRED is
supposed to get to know whether its own verdicts were right.

**Which repo to build the new platform on: this one — `jonjys/Fred-platform`.** Not `jonjys/promptslaktaren`
(BridgeControl). That repo is a different product for a different purpose (an API spend/toll control plane for other
tools), and it isn't in the state you'd want a foundation to be in — it has unresolved stub logic in its billing-
adjacent classification code and an RLS gap on its production database that's still open as of this writing. This
repo has the real thing: a tested, deterministic decision engine, real Stripe billing enforced server-side, real
RLS-protected user data, and a module contract already designed for exactly the kind of growth described above —
one line to register a new Decision Module, no schema or pipeline changes required. Build here.

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

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
cp .env.example .env.local   # fill in Supabase + Anthropic credentials
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

## Project structure

```
app/
  (dashboard)/        # dashboard, analyze, history, settings routes
  api/
    analyze/          # POST — the generic Decision Pipeline
    decisions/        # GET  — Decision Graph history
lib/
  decision-engine/     # Layer 1 — deterministic, module-agnostic + purchase-analysis module
  ai/                  # Layer 2 — Claude integration, Zod-validated
  documents/           # mechanical PDF/text parsing
  database/            # Supabase clients, repositories, schema.sql
config/
  tools.ts             # Decision Module registry
```

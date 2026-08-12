/**
 * Core Decision Engine contracts.
 *
 * Everything in this file is module-agnostic. "AI Purchase Analyzer" is one
 * consumer of these types, not their origin — a future Supplier Comparison
 * or Contract Intelligence module reuses every type here unchanged and only
 * adds its own input/metrics/AI-output shapes under
 * lib/decision-engine/modules/<module-key>/.
 *
 * Layering rule enforced by these types: `calculateMetrics` never sees AI
 * output, and AI-facing types never carry a calculation function. Numbers
 * only ever originate from `calculateMetrics`.
 */
import type { ZodType, ZodTypeDef } from "zod";
import type { DecisionEngine } from "./engine-interface";

/** A Zod schema constrained only on its parsed `Output` — its raw `Input`
 * (pre-`.default()`/`.transform()`) is deliberately left unconstrained,
 * since modules commonly accept a looser input shape (optional fields with
 * defaults) than the fully-resolved type the rest of the pipeline works
 * with. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod's Input generic is inherently a wildcard here; every module's raw (pre-default/transform) input shape differs and is intentionally unconstrained.
type SchemaFor<Output> = ZodType<Output, ZodTypeDef, any>;

// -----------------------------------------------------------------------------
// Financial primitives (Layer 1 building blocks)
// -----------------------------------------------------------------------------

/** ISO 4217 currency code, e.g. "EUR", "USD". Kept as a plain string rather
 * than a union so new currencies never require a code change. */
export type CurrencyCode = string;

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export type CostCategory =
  | "upfront"
  | "subscription"
  | "usage"
  | "hidden_fee"
  | "setup"
  | "support"
  | "termination"
  | "other";

export interface CostLineItem {
  label: string;
  /** VAT-exclusive amount in the company's base currency. */
  amount: number;
  category: CostCategory;
  /** True if this cost repeats every billing period; false for one-off costs. */
  recurring: boolean;
  vatApplicable: boolean;
}

export interface TCOBreakdown {
  currency: CurrencyCode;
  lineItems: CostLineItem[];
  subtotalExclVat: number;
  vatAmount: number;
  vatRate: number;
  totalInclVat: number;
}

/** Total Cost of Ownership across the two horizons the product always shows. */
export interface TCOResult {
  currency: CurrencyCode;
  year1: TCOBreakdown;
  year3: TCOBreakdown;
  /** Normalized monthly run-rate of recurring costs, excluding one-off fees. */
  monthlyRecurringCost: number;
  hiddenFeesTotal: number;
}

export interface ROIResult {
  roiPercentage: number;
  netBenefit: number;
  /** Null when the investment never breaks even within the evaluation horizon. */
  paybackPeriodMonths: number | null;
}

// -----------------------------------------------------------------------------
// Verdict / risk / action — the shared vocabulary every module speaks
// -----------------------------------------------------------------------------

export type VerdictSeverity = "positive" | "neutral" | "negative";

/**
 * A module-defined outcome code (e.g. "BUY" | "NEGOTIATE" | "REJECT" for
 * purchase-analysis). The core platform never switches on specific codes —
 * only on `severity`, which is what lets generic UI components render any
 * module's verdict without module-specific branching.
 */
export interface Verdict {
  code: string;
  label: string;
  severity: VerdictSeverity;
  /** 0..1 confidence, derived deterministically from the metrics — never
   * invented by the AI layer. */
  confidence: number;
  reasoning: string[];
}

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export interface Risk {
  severity: RiskSeverity;
  category: string;
  description: string;
}

export interface RecommendedAction {
  /** e.g. "negotiation_point", "next_step", "clarification_needed". */
  type: string;
  description: string;
  potentialImpact?: string;
}

// -----------------------------------------------------------------------------
// Reusable real-world entities (vendors, suppliers, products...) a decision
// involves — mirrors the `decision_entity_type` Postgres enum
// (lib/database/schema.sql). Duplicated here rather than imported from
// lib/database/types so the decision engine stays independent of the
// database layer; the two are kept in sync by hand, same as the other
// domain vocabulary in this file (VerdictSeverity, RiskSeverity, ...).
// -----------------------------------------------------------------------------

export type DecisionEntityType = "vendor" | "supplier" | "product" | "service" | "contract_party" | "other";

export interface EntityCandidate {
  name: string;
  entityType: DecisionEntityType;
  /** e.g. "primary_option" | "alternative" | "incumbent" — free-text, mirrors decision_entity_links.role. */
  role: string;
}

// -----------------------------------------------------------------------------
// Company context passed into every module
// -----------------------------------------------------------------------------

export interface CompanyBudget {
  amount: number;
  period: "monthly" | "annual";
}

export interface CompanyContext {
  id: string;
  companyName: string;
  industry: string | null;
  country: string | null;
  currency: CurrencyCode;
  vatRate: number;
  targetMargin: number | null;
  budget: CompanyBudget | null;
  softwareStack: unknown[];
  preferences: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// The Decision Module contract
// -----------------------------------------------------------------------------

/**
 * Every Decision Module (purchase-analysis today; supplier-comparison,
 * contract-intelligence, procurement, investment-analysis, pricing-
 * intelligence, due-diligence, vendor-management tomorrow) implements this
 * interface and registers a single instance in config/tools.ts.
 *
 * The API pipeline (app/api/analyze/route.ts) depends only on this
 * interface — never on a concrete module — which is what lets new modules
 * be added purely by writing new files and one registry entry.
 */
export interface DecisionModule<TInput = unknown, TMetrics = unknown, TAiOutput = unknown> {
  /** Stable identifier persisted as decisions.module_key. Never reuse across modules. */
  key: string;
  version: string;
  label: string;
  description: string;

  /** Validates and normalizes raw input (post document-parsing) before it
   * reaches the deterministic engine. */
  inputSchema: SchemaFor<TInput>;

  /** Validates Claude's structured JSON response before it is trusted. */
  aiOutputSchema: SchemaFor<TAiOutput>;

  /**
   * The portable calculation core (see engine-interface.ts) — the same
   * contract a fully standalone, externally-developed engine package would
   * implement. `calculateMetrics` below is a thin adapter around this that
   * the rest of the platform (the API pipeline, tests) actually calls; the
   * separation exists so an engine can be built/verified/versioned with no
   * dependency on this platform at all.
   */
  engine: DecisionEngine<TInput, TMetrics>;

  /** Layer 1 — pure, deterministic, no AI, no I/O. Delegates to `engine.calculate`. */
  calculateMetrics: (input: TInput, context: CompanyContext) => TMetrics;

  /** Builds the module's Claude prompt from already-computed metrics, so the
   * AI explains and contextualizes numbers rather than producing them. */
  buildPrompt: (input: TInput, metrics: TMetrics, context: CompanyContext) => {
    system: string;
    user: string;
  };

  /** Derives the final Verdict deterministically from metrics (+ optional AI
   * qualitative input, e.g. contract risk severity) — the verdict's numeric
   * confidence and BUY/NEGOTIATE/REJECT-style code are never chosen by the
   * AI directly. */
  resolveVerdict: (metrics: TMetrics, aiOutput: TAiOutput | null, context: CompanyContext) => Verdict;

  /**
   * Optional: reads candidate structured field values out of raw document
   * text (e.g. "Setup fee: $500" -> `{ primaryOffer: { upfrontCost: 500 } }`).
   * This is *extraction*, not calculation — it reads what a document states,
   * never derives or estimates a number. Implement via
   * `lib/ai/claude.ts#extractStructuredData`. Modules that only ever receive
   * structured form input (no documents) can omit this.
   */
  extractInput?: (text: string, context: CompanyContext) => Promise<DeepPartial<TInput>>;

  /**
   * Optional: identifies which reusable real-world entities (vendors,
   * suppliers, products...) this decision involves, so the platform can
   * link them via decision_entities/decision_entity_links — the basis for
   * "you've evaluated this vendor before" history surfaced on future
   * analyses. Pure and synchronous, same as `calculateMetrics`: it reads
   * names out of already-validated input, it doesn't look anything up.
   * Modules that don't deal in named external parties can omit this.
   */
  extractEntities?: (input: TInput) => EntityCandidate[];
}

/** Type-erased form used by the registry so heterogeneous modules can be
 * stored in a single map. Concrete modules narrow this back via their key. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate type erasure so the registry can hold heterogeneous modules.
export type AnyDecisionModule = DecisionModule<any, any, any>;

/** Every field optional, at every nesting level — the natural shape of
 * "candidate values a document may or may not have stated." */
export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

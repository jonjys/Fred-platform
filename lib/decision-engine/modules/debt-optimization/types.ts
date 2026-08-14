/**
 * Ported from debt-optimizer-standalone (github.com/jonjys/debt-optimizer-
 * standalone) once its P0 bugs were fixed and verified there. Field names
 * are adapted to this module's already-committed API surface
 * (app/api/debt/analyze/route.ts, app/(dashboard)/dashboard/debt/page.tsx)
 * rather than kept identical to the standalone repo's names.
 *
 * One deliberate correction vs. the placeholder shape this file held
 * before: the old `Loan` type embedded output-only fields
 * (originalEndDate, newEndDate, originalTotalInterest, newTotalInterest,
 * monthsSaved) directly on the INPUT loan, which forced a caller to invent
 * values for numbers only the engine can compute. Split into `Loan` (pure
 * input) and `LoanResult` (computed output) — the same separation
 * debt-optimizer-standalone's own proven engine already used.
 */

export type LoanPaymentStyle = "fixed_amort" | "annuity";

/** "custom" = the caller's own loan order (debt-optimizer-standalone called
 * this "cascade" / "Egen ordning") — kept as "custom" here since that's
 * what app/api/debt/analyze/route.ts already committed to. */
export type DebtStrategy = "avalanche" | "snowball" | "custom";

export interface LoanReinvestment {
  enabled: boolean;
  /** id of the loan this money is freed from */
  fromLoanId: string;
  /** kr/month */
  amount: number;
  /** YYYY-MM */
  startDate: string;
}

export interface Loan {
  id: string;
  name: string;
  balance: number;
  /** Decimal, e.g. 0.09 for 9%. */
  interestRate: number;
  paymentStyle: LoanPaymentStyle;
  /** Payment to the LOAN ITSELF, excluding fees/insurance (P0-3: never
   * conflate an invoice total with the amortization payment). */
  minPayment: number;
  /** Fees/insurance riding along on the same invoice — purely informational,
   * the engine never reads this field for any calculation. */
  feesMonthly?: number;
  /** fixed_amort only: top up to this total monthly payment. */
  targetMonthlyTotal?: number;
  targetMonthlyEnabled?: boolean;
  targetMonthlyFrom?: string;
  /** Manual extra payment on top of minPayment, independent of everything else. */
  extraMonthly?: number;
  extraMonthlyEnabled?: boolean;
  extraMonthlyFrom?: string;
  /** Manual reinvestment of another loan's freed-up payment. Never automatic
   * (P0-2) — `enabled` must be explicitly true, and it only ever affects
   * this loan's own payment, never moves money on its own. */
  reinvestment?: LoanReinvestment;
}

export interface OneTimePayment {
  /** Loan it applies to. If omitted, applies to whichever loan is first in
   * payoff order (the strategy's current priority loan) at that date. */
  loanId?: string;
  /** YYYY-MM */
  date: string;
  amount: number;
}

export interface DebtOptimizationInput {
  loans: Loan[];
  strategy: DebtStrategy;
  /** YYYY-MM. Defaults to the current calendar month if omitted. */
  startDate?: string;
  oneTimePayments?: OneTimePayment[];
}

export interface LoanResult {
  id: string;
  name: string;
  originalEndDate: string;
  originalTotalInterest: number;
  newEndDate: string;
  newTotalInterest: number;
  interestSaved: number;
  monthsSaved: number;
  /** 1-indexed position in payoff order under the chosen strategy. */
  payoffOrder: number;
  /** false = payment doesn't outpace interest; never pays off within the
   * simulation window. newEndDate is "-" in that case. */
  isFullyAmortizing: boolean;
}

export interface ScheduleMonthLoanEntry {
  loanId: string;
  /** Balance remaining at the END of this month, after this month's payment. */
  balance: number;
  payment: number;
  interest: number;
}

export interface ScheduleMonth {
  /** YYYY-MM */
  month: string;
  loans: ScheduleMonthLoanEntry[];
}

/**
 * "BUY" = adopt this payoff plan, the numbers clearly justify it. "NEGOTIATE"
 * = only marginal improvement — worth trying to get better loan terms before
 * committing to this plan. "REJECT" = the plan doesn't help, or the input
 * doesn't produce a valid payoff at all.
 *
 * FIRST-PASS HEURISTIC, not yet business-signed-off: see
 * `resolveRecommendation` in engine.ts for the exact thresholds. There is no
 * AI layer in this module (calculation is 100% deterministic), so this is
 * the only source of the recommendation — it deserves real product review
 * before a paying customer sees it presented as advice.
 */
export type DebtRecommendation = "BUY" | "NEGOTIATE" | "REJECT";

export interface DebtOptimizationResult {
  /** Overall debt-free date across every loan in the plan. "-" if at least
   * one loan never amortizes within the simulation window. */
  payoffDate: string;
  totalInterestPaid: number;
  totalInterestSaved: number;
  monthsSaved: number;
  schedule: ScheduleMonth[];
  /** ids of loans whose payoff was actually affected by extra/reinvestment/
   * one-time payments (i.e. newEndDate differs from originalEndDate). */
  affectedLoans: string[];
  loans: LoanResult[];
  recommendation: DebtRecommendation;
}

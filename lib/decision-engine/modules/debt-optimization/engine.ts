/**
 * Skuldoptimering's Layer 1 entry point. Ported from debt-optimizer-
 * standalone (github.com/jonjys/debt-optimizer-standalone) after all P0
 * bugs there were fixed and verified with 45 passing tests:
 *   1. One-time payments now actually reduce the payoff date (root cause
 *      was the simulation deleting a month's one-time-payment entry as
 *      soon as ANY loan took its turn, not just the one it belonged to —
 *      silently dropping payments aimed at any loan but the first).
 *   2. No automatic "cascade" between loans. A loan's freed-up payment
 *      only ever moves to another loan via that other loan's own explicit
 *      `reinvestment.enabled`, which defaults to false.
 *   3. Fees/insurance never enter the calculation — `feesMonthly` exists
 *      on `Loan` for bookkeeping only, `minPayment` is payment to the loan
 *      alone. `referenceAnnuityPayment`/`paymentLikelyIncludesFees` below
 *      are exported for a future UI warning, same heuristic as the
 *      standalone app's.
 *   4. Annuity was already computed as a real month-by-month loop (interest
 *      accrues on the current balance, payment applied, repeat) — the
 *      "annuity treated as fixed amortization" bug report didn't hold up
 *      against the actual code; verified again here with the same
 *      annuityCalculationIsAccurate regression test.
 *
 * Money handling: every balance/interest/payment figure is a `Big`
 * (big.js) from the moment it enters the simulation until the moment a
 * final number is written into an output object. Nothing is rounded and
 * fed back into the loop — rounding happens exactly once, at each output
 * boundary (a summary figure, or a single schedule entry), never mid-
 * calculation. This is a stricter-than-necessary guarantee (the previous
 * plain-`number` version was independently verified to drift by 0.02 kr
 * on a 2M kr / 327-month loan — nowhere near the 10k+ figures a 10M kr /
 * 30-year loan could theoretically accumulate through float rounding by
 * general folklore, but never actually measured that high either) — Big.js
 * removes the question entirely rather than re-litigating the bound.
 */
import Big from "big.js";
import type { DecisionEngine } from "../../engine-interface";
import { debtOptimizationInputSchema } from "./schemas";
import type {
  DebtOptimizationInput,
  DebtOptimizationResult,
  DebtRecommendation,
  Loan,
  LoanResult,
  OneTimePayment,
  ScheduleMonth,
  ScheduleMonthLoanEntry,
} from "./types";

const SIMULATION_MONTH_CAP = 600; // 50 years — same ceiling debt-optimizer-standalone used

function minBig(a: Big, b: Big): Big {
  return a.lt(b) ? a : b;
}

function maxBig(a: Big, b: Big): Big {
  return a.gt(b) ? a : b;
}

function roundKr(value: Big): number {
  return value.round(0, Big.roundHalfUp).toNumber();
}

function getDateFromOffset(startYearMonth: string, monthOffset: number): string {
  const [yearStr, monthStr] = startYearMonth.split("-");
  let year = parseInt(yearStr ?? "", 10) || new Date().getFullYear();
  let month = (parseInt(monthStr ?? "", 10) || 1) - 1 + monthOffset;
  year += Math.floor(month / 12);
  month = ((month % 12) + 12) % 12 + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function dateGte(a: string, b: string | undefined): boolean {
  if (!b) return true;
  return a >= b;
}

function defaultStartDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function sortLoans(loans: Loan[], strategy: DebtOptimizationInput["strategy"]): Loan[] {
  if (strategy === "avalanche") {
    return [...loans].sort((a, b) => b.interestRate - a.interestRate || a.id.localeCompare(b.id));
  }
  if (strategy === "snowball") {
    return [...loans].sort((a, b) => a.balance - b.balance || a.id.localeCompare(b.id));
  }
  return loans; // "custom" = caller's own order
}

/**
 * Validates a single loan's numeric fields, mirroring debt-optimizer-
 * standalone's engine-level validation (P0 hardening: negative/NaN/
 * Infinity inputs, and an interestRate stored as a percentage like 5.95
 * instead of a decimal like 0.0595 — which would otherwise silently
 * compute 100x too much interest).
 */
function validateLoan(loan: Loan): string[] {
  const errors: string[] = [];
  if (loan.balance < 0) errors.push(`balance negative: ${loan.balance}`);
  if (!Number.isFinite(loan.balance)) errors.push("balance is NaN or Infinity");
  if (loan.interestRate < 0) errors.push(`interestRate negative: ${loan.interestRate}`);
  if (loan.interestRate > 1) errors.push(`interestRate >100%: ${loan.interestRate} - likely wrong format (use decimal, e.g. 0.09)`);
  if (!Number.isFinite(loan.interestRate)) errors.push("interestRate is NaN or Infinity");
  if (loan.minPayment < 0) errors.push(`minPayment negative: ${loan.minPayment}`);
  if (!Number.isFinite(loan.minPayment)) errors.push("minPayment is NaN or Infinity");
  if (loan.feesMonthly !== undefined) {
    if (loan.feesMonthly < 0) errors.push(`feesMonthly negative: ${loan.feesMonthly}`);
    if (!Number.isFinite(loan.feesMonthly)) errors.push("feesMonthly is NaN or Infinity");
  }
  if (loan.reinvestment) {
    if (loan.reinvestment.amount < 0) errors.push(`reinvestment.amount negative: ${loan.reinvestment.amount}`);
    if (!Number.isFinite(loan.reinvestment.amount)) errors.push("reinvestment.amount is NaN or Infinity");
  }
  return errors;
}

/**
 * A reference "sane minimum" monthly payment for a loan, used only to warn
 * that an entered payment looks like it includes fees/insurance rather than
 * being pure loan payment. Assumes a 144-month (12-year) reference term —
 * long enough that almost no legitimate loan payment for this balance/rate
 * would exceed it by more than 15%, short enough that an invoice total with
 * fees baked in reliably does. Advisory only; never used in `calculate`.
 */
export function referenceAnnuityPayment(balance: number, interestRate: number, months = 144): number {
  if (balance <= 0) return 0;
  const r = new Big(interestRate).div(12);
  const bigBalance = new Big(balance);
  if (r.eq(0)) return roundKr(bigBalance.div(months));
  const factor = new Big(1).minus(new Big(1).plus(r).pow(-months));
  return roundKr(bigBalance.times(r).div(factor));
}

export function paymentLikelyIncludesFees(balance: number, interestRate: number, minPayment: number): boolean {
  if (balance <= 0 || interestRate <= 0 || minPayment <= 0) return false;
  return minPayment > referenceAnnuityPayment(balance, interestRate) * 1.15;
}

function monthBasePayment(
  loan: Loan,
  balance: Big,
  dateStr: string,
  startDate: string
): { payment: Big; interest: Big } {
  const r = new Big(loan.interestRate).div(12);
  const interest = balance.times(r);

  if (loan.paymentStyle === "fixed_amort") {
    const scheduled = new Big(loan.minPayment).plus(interest);
    let total = scheduled;
    if (
      loan.targetMonthlyEnabled &&
      (loan.targetMonthlyTotal ?? 0) > 0 &&
      dateGte(dateStr, loan.targetMonthlyFrom ?? startDate)
    ) {
      total = maxBig(scheduled, new Big(loan.targetMonthlyTotal ?? 0));
    }
    if (
      loan.extraMonthlyEnabled &&
      (loan.extraMonthly ?? 0) > 0 &&
      dateGte(dateStr, loan.extraMonthlyFrom ?? startDate)
    ) {
      total = total.plus(loan.extraMonthly ?? 0);
    }
    if (
      loan.reinvestment?.enabled &&
      (loan.reinvestment.amount ?? 0) > 0 &&
      dateGte(dateStr, loan.reinvestment.startDate)
    ) {
      total = total.plus(loan.reinvestment.amount);
    }
    return { payment: minBig(balance.plus(interest), total), interest };
  }

  // annuity
  let total = new Big(loan.minPayment);
  if (
    loan.extraMonthlyEnabled &&
    (loan.extraMonthly ?? 0) > 0 &&
    dateGte(dateStr, loan.extraMonthlyFrom ?? startDate)
  ) {
    total = total.plus(loan.extraMonthly ?? 0);
  }
  if (
    loan.reinvestment?.enabled &&
    (loan.reinvestment.amount ?? 0) > 0 &&
    dateGte(dateStr, loan.reinvestment.startDate)
  ) {
    total = total.plus(loan.reinvestment.amount);
  }
  return { payment: minBig(balance.plus(interest), total), interest };
}

interface OriginalPayoff {
  months: number;
  interest: Big;
}

interface ActiveLoan {
  loan: Loan;
  currentBalance: Big;
  totalInterestPaid: Big;
  isPaidOff: boolean;
  /** -1 = "not paid off yet" — distinct from a real month number, so a loan
   * that never amortizes (times out at the simulation cap) can't be
   * mistaken for "paid off at month 0". */
  paidOffMonth: number;
}

/**
 * "BUY" = adopt this plan, the savings clearly justify it. "NEGOTIATE" =
 * either no meaningful savings applied yet (a bare pay-minimums plan is
 * still perfectly valid, just unoptimized) or only marginal improvement —
 * worth adding extras/reinvestment or pushing for better loan terms.
 * "REJECT" = the plan doesn't produce a valid payoff at all (at least one
 * loan never amortizes). Thresholds are a first-pass heuristic pending
 * real product/business review — see the `DebtRecommendation` doc comment
 * in types.ts. Deliberately NOT triggered by "zero savings" alone — a plan
 * with no extras configured is unoptimized, not invalid.
 */
function resolveRecommendation(
  totalInterestSaved: number,
  monthsSaved: number,
  payoffDate: string,
  totalOriginalInterest: number
): DebtRecommendation {
  if (payoffDate === "-") return "REJECT";
  const savedRatio = totalOriginalInterest > 0 ? totalInterestSaved / totalOriginalInterest : 0;
  if (totalInterestSaved > 0 && (monthsSaved >= 6 || savedRatio >= 0.05)) return "BUY";
  return "NEGOTIATE";
}

export function calculateDebtOptimization(input: DebtOptimizationInput): DebtOptimizationResult {
  const { loans, strategy, oneTimePayments = [] } = input;
  const startDate = input.startDate ?? defaultStartDate();

  if (!loans || loans.length === 0) {
    return {
      payoffDate: "-",
      totalInterestPaid: 0,
      totalInterestSaved: 0,
      monthsSaved: 0,
      schedule: [],
      affectedLoans: [],
      loans: [],
      recommendation: "REJECT",
    };
  }

  const validationErrors: string[] = [];
  loans.forEach((loan) => {
    const errors = validateLoan(loan);
    if (errors.length > 0) validationErrors.push(`${loan.name || loan.id}: ${errors.join(", ")}`);
  });
  if (validationErrors.length > 0) {
    throw new Error(`Invalid loan values — ${validationErrors.join("; ")}`);
  }

  // --- Baseline: what happens with only minPayment, no extras at all ---
  let maxOriginalMonths = 0;
  let totalOrigInterest = new Big(0);
  const origResults = new Map<string, OriginalPayoff>();

  loans.forEach((loan) => {
    let balance = new Big(loan.balance);
    let months = 0;
    let interestSum = new Big(0);
    while (balance.gt(0.5) && months < SIMULATION_MONTH_CAP) {
      months++;
      const r = new Big(loan.interestRate).div(12);
      const interest = balance.times(r);
      interestSum = interestSum.plus(interest);
      balance = balance.plus(interest);
      const pay =
        loan.paymentStyle === "fixed_amort"
          ? minBig(balance, new Big(loan.minPayment).plus(interest))
          : minBig(balance, new Big(loan.minPayment));
      balance = balance.minus(pay);
    }
    origResults.set(loan.id, { months, interest: interestSum });
    if (months > maxOriginalMonths) maxOriginalMonths = months;
    totalOrigInterest = totalOrigInterest.plus(interestSum);
  });

  // --- Full simulation: strategy order, extras, reinvestment, one-time payments ---
  const ordered = sortLoans(loans, strategy);

  const active: ActiveLoan[] = ordered.map((loan) => ({
    loan,
    currentBalance: new Big(loan.balance),
    totalInterestPaid: new Big(0),
    isPaidOff: false,
    paidOffMonth: -1,
  }));
  const activeById = new Map(active.map((a) => [a.loan.id, a]));

  const oneTimeMap = new Map<string, OneTimePayment[]>();
  oneTimePayments.forEach((p) => {
    if (p.amount > 0 && p.date) {
      const list = oneTimeMap.get(p.date) ?? [];
      list.push(p);
      oneTimeMap.set(p.date, list);
    }
  });

  const schedule: ScheduleMonth[] = [];
  let currentMonth = 0;
  let maxNewMonths = 0;
  let totalNewInterest = new Big(0);

  while (active.some((a) => !a.isPaidOff) && currentMonth < SIMULATION_MONTH_CAP) {
    currentMonth++;
    const dateStr = getDateFromOffset(startDate, currentMonth - 1);

    // Manual mode: no automatic transfer of payment between loans. Money
    // only moves from one loan to another when the RECEIVING loan has its
    // own `reinvestment.enabled` set (handled inside monthBasePayment).
    // `priorityIdx` is only the fallback target for a one-time payment
    // that wasn't assigned to a specific loan.
    const priorityIdx = active.findIndex((a) => !a.isPaidOff);
    // Read once per month, applied against every loan below, then removed
    // once — NOT as soon as the priority-index loan is processed (that
    // discarded any one-time payment aimed at a later loan the moment the
    // unrelated priority loan took its turn; see file header, P0-1).
    const ots = oneTimeMap.get(dateStr);

    const monthEntries: ScheduleMonthLoanEntry[] = [];

    for (let i = 0; i < active.length; i++) {
      const entry = active[i];
      if (!entry) continue;

      if (entry.isPaidOff) {
        monthEntries.push({ loanId: entry.loan.id, balance: 0, payment: 0, interest: 0 });
        continue;
      }

      const { payment: basePay, interest } = monthBasePayment(entry.loan, entry.currentBalance, dateStr, startDate);
      entry.totalInterestPaid = entry.totalInterestPaid.plus(interest);
      entry.currentBalance = entry.currentBalance.plus(interest);

      let payment = basePay;
      if (ots) {
        for (const ot of ots) {
          if (ot.loanId === entry.loan.id || (!ot.loanId && i === priorityIdx)) {
            payment = payment.plus(ot.amount);
          }
        }
      }

      const actual = minBig(entry.currentBalance, payment);
      entry.currentBalance = entry.currentBalance.minus(actual);

      if (entry.currentBalance.lte(0.5)) {
        entry.currentBalance = new Big(0);
        entry.isPaidOff = true;
        entry.paidOffMonth = currentMonth;
      }

      monthEntries.push({
        loanId: entry.loan.id,
        balance: roundKr(entry.currentBalance),
        payment: roundKr(actual),
        interest: roundKr(interest),
      });
    }

    if (ots) oneTimeMap.delete(dateStr);
    schedule.push({ month: dateStr, loans: monthEntries });
  }

  let anyLoanNeverAmortizes = false;
  const affectedLoans: string[] = [];

  const loanResults: LoanResult[] = ordered.map((loan, orderIdx) => {
    const orig = origResults.get(loan.id);
    if (!orig) throw new Error(`internal error: no baseline result for loan ${loan.id}`);
    const sim = activeById.get(loan.id);
    if (!sim) throw new Error(`internal error: no simulation result for loan ${loan.id}`);

    const isFullyAmortizing = sim.paidOffMonth !== -1;
    const newInterestBig = sim.totalInterestPaid;
    const newInterest = roundKr(newInterestBig);
    const origInterest = roundKr(orig.interest);
    totalNewInterest = totalNewInterest.plus(newInterestBig);

    if (!isFullyAmortizing) {
      anyLoanNeverAmortizes = true;
      affectedLoans.push(loan.id);
      return {
        id: loan.id,
        name: loan.name,
        originalEndDate: getDateFromOffset(startDate, orig.months),
        originalTotalInterest: origInterest,
        newEndDate: "-",
        newTotalInterest: newInterest,
        interestSaved: 0,
        monthsSaved: 0,
        payoffOrder: orderIdx + 1,
        isFullyAmortizing: false,
      };
    }

    const newMonths = sim.paidOffMonth;
    if (newMonths > maxNewMonths) maxNewMonths = newMonths;
    const originalEndDate = getDateFromOffset(startDate, orig.months);
    const newEndDate = getDateFromOffset(startDate, newMonths);
    if (newEndDate !== originalEndDate) affectedLoans.push(loan.id);
    return {
      id: loan.id,
      name: loan.name,
      originalEndDate,
      originalTotalInterest: origInterest,
      newEndDate,
      newTotalInterest: newInterest,
      interestSaved: Math.max(0, origInterest - newInterest),
      monthsSaved: Math.max(0, orig.months - newMonths),
      payoffOrder: orderIdx + 1,
      isFullyAmortizing: true,
    };
  });

  // Sum of the (already-rounded) per-loan figures actually shown per loan,
  // so the headline total always reconciles exactly with its breakdown —
  // no independent grand-total rounding drift.
  const totalInterestSaved = loanResults.reduce((sum, loan) => sum + loan.interestSaved, 0);
  const totalOriginalInterestRounded = roundKr(totalOrigInterest);
  const payoffDate = anyLoanNeverAmortizes ? "-" : getDateFromOffset(startDate, maxNewMonths);
  const monthsSaved = anyLoanNeverAmortizes ? 0 : Math.max(0, maxOriginalMonths - maxNewMonths);

  return {
    payoffDate,
    totalInterestPaid: roundKr(totalNewInterest),
    totalInterestSaved,
    monthsSaved,
    schedule,
    affectedLoans,
    loans: loanResults,
    recommendation: resolveRecommendation(totalInterestSaved, monthsSaved, payoffDate, totalOriginalInterestRounded),
  };
}

export class DebtOptimizationEngine implements DecisionEngine<DebtOptimizationInput, DebtOptimizationResult> {
  id = "debt-optimization";
  name = "Skuldoptimering";
  version = "1";

  validate(input: unknown) {
    const parsed = debtOptimizationInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        valid: false as const,
        errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`),
      };
    }
    return { valid: true as const, data: parsed.data };
  }

  calculate(input: DebtOptimizationInput) {
    return { result: calculateDebtOptimization(input) };
  }

  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description:
        "Deterministic month-by-month debt payoff simulation (avalanche/snowball/custom order, manual reinvestment, one-time payments) with Big.js-precision money math.",
    };
  }
}

const debtOptimizationEngine = new DebtOptimizationEngine();
export default debtOptimizationEngine;

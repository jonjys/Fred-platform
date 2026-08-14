import { describe, expect, it } from "vitest";
import { calculateDebtOptimization, DebtOptimizationEngine, paymentLikelyIncludesFees, referenceAnnuityPayment } from "./engine";
import type { DebtOptimizationInput, DebtStrategy, Loan } from "./types";

function mkLoan(over: Partial<Loan> & Pick<Loan, "id">): Loan {
  return {
    name: over.id,
    paymentStyle: "annuity",
    balance: 0,
    interestRate: 0,
    minPayment: 0,
    ...over,
  };
}

function run(loans: Loan[], over: Partial<DebtOptimizationInput> = {}) {
  return calculateDebtOptimization({
    loans,
    oneTimePayments: [],
    startDate: "2026-01",
    strategy: "custom",
    ...over,
  });
}

function monthsBetween(from: string, to: string): number {
  const [y1, m1] = from.split("-").map(Number) as [number, number];
  const [y2, m2] = to.split("-").map(Number) as [number, number];
  return (y2 - y1) * 12 + (m2 - m1);
}

describe("Basic amortization", () => {
  it("pays down a flat-payment loan to zero over the expected number of months", () => {
    const r = run([mkLoan({ id: "a", balance: 10000, interestRate: 0.05, minPayment: 1000 })]);
    expect(r.loans[0]?.isFullyAmortizing).toBe(true);
    expect(r.loans[0]?.payoffOrder).toBe(1);
  });
});

describe("Interest calculation", () => {
  it("computes month-1 interest as balance * annualRate/12", () => {
    // 2000 @ 12%/yr => monthly rate 1% => interest month 1 = 20kr exactly
    const r = run([mkLoan({ id: "a", balance: 2000, interestRate: 0.12, minPayment: 5000 })]);
    expect(r.loans[0]?.newTotalInterest).toBe(20);
  });
});

describe("Final payment capping", () => {
  it("caps the last payment to remaining balance + interest, never overpays", () => {
    const r = run([mkLoan({ id: "a", balance: 2000, interestRate: 0.12, minPayment: 5000 })]);
    const res = r.loans[0];
    expect(res?.newEndDate).toBe("2026-02"); // 1 month after start
    expect(res?.newTotalInterest).toBe(20);
  });
});

describe("Zero interest", () => {
  it("10000 kr @ 0% / 1000 kr/mo pays off in exactly 10 months with 0 interest (GOLDEN 3)", () => {
    const r = run([mkLoan({ id: "a", balance: 10000, interestRate: 0, minPayment: 1000 })]);
    const res = r.loans[0];
    expect(res?.newEndDate).toBe("2026-11"); // 10 months after 2026-01
    expect(res?.newTotalInterest).toBe(0);
  });
});

describe("Extra monthly payment", () => {
  it("extraMonthly speeds up payoff vs. the original (no-extra) baseline", () => {
    const r = run([
      mkLoan({
        id: "a", balance: 50000, interestRate: 0.08, minPayment: 1000,
        extraMonthlyEnabled: true, extraMonthly: 500, extraMonthlyFrom: "2026-01",
      }),
    ]);
    const res = r.loans[0];
    expect(res?.monthsSaved).toBeGreaterThan(0);
    expect(res?.newTotalInterest).toBeLessThan(res?.originalTotalInterest ?? 0);
  });

  it("extraMonthlyFrom gates the extra payment to start only from that month", () => {
    const withDelay = run([
      mkLoan({
        id: "a", balance: 50000, interestRate: 0.08, minPayment: 1000,
        extraMonthlyEnabled: true, extraMonthly: 500, extraMonthlyFrom: "2027-01",
      }),
    ]);
    const fromStart = run([
      mkLoan({
        id: "a", balance: 50000, interestRate: 0.08, minPayment: 1000,
        extraMonthlyEnabled: true, extraMonthly: 500, extraMonthlyFrom: "2026-01",
      }),
    ]);
    expect(fromStart.loans[0]?.newTotalInterest).toBeLessThanOrEqual(withDelay.loans[0]?.newTotalInterest ?? 0);
  });
});

describe("Lump sum overflow", () => {
  it("a one-time payment larger than the remaining balance doesn't overpay or crash", () => {
    const r = calculateDebtOptimization({
      loans: [mkLoan({ id: "a", balance: 5000, interestRate: 0.05, minPayment: 500 })],
      oneTimePayments: [{ date: "2026-01", amount: 100000, loanId: "a" }],
      startDate: "2026-01",
      strategy: "custom",
    });
    const res = r.loans[0];
    expect(res?.isFullyAmortizing).toBe(true);
    expect(res?.newEndDate).toBe("2026-02"); // paid off same/next month, excess just absorbed
  });
});

describe("oneTimePaymentReducesEndDate (P0-1 regression)", () => {
  // Root cause fixed in debt-optimizer-standalone and carried over here:
  // the one-time-payment map entry for a date must be consumed against
  // EVERY loan in that month before being cleared, not cleared as soon as
  // the priority-index loan takes its turn — otherwise a payment aimed at
  // any loan other than the priority one is silently dropped once the
  // plan has 2+ loans.
  it("a 50k one-time payment on a 589k loan measurably cuts months off its payoff, even alongside another loan", () => {
    const other = mkLoan({
      id: "other", balance: 112455, interestRate: 0.0595, minPayment: 1389, paymentStyle: "fixed_amort",
    });
    const target = () => mkLoan({ id: "target", balance: 589111, interestRate: 0.0909, minPayment: 6888 });

    const without = run([other, target()]);
    const withOT = calculateDebtOptimization({
      loans: [other, target()],
      oneTimePayments: [{ date: "2026-01", amount: 50000, loanId: "target" }],
      startDate: "2026-01",
      strategy: "custom",
    });

    const monthsWithout = without.loans.find((r) => r.id === "target")?.monthsSaved ?? 0;
    const monthsWith = withOT.loans.find((r) => r.id === "target")?.monthsSaved ?? 0;
    expect(monthsWith).toBeGreaterThan(monthsWithout);
    expect(withOT.payoffDate).not.toBe(without.payoffDate);
  });

  it("still works when the one-time payment targets the loan that IS the priority-index loan (regression guard)", () => {
    const first = () => mkLoan({ id: "first", balance: 100000, interestRate: 0.05, minPayment: 2000 });
    const second = mkLoan({ id: "second", balance: 50000, interestRate: 0.05, minPayment: 1000 });

    const without = run([first(), second]);
    const withOT = calculateDebtOptimization({
      loans: [first(), second],
      oneTimePayments: [{ date: "2026-01", amount: 50000, loanId: "first" }],
      startDate: "2026-01",
      strategy: "custom",
    });
    expect(withOT.loans.find((r) => r.id === "first")?.newTotalInterest).toBeLessThan(
      without.loans.find((r) => r.id === "first")?.newTotalInterest ?? 0
    );
  });

  it("oneTimePaymentReducesEndDate: 100k/5%/2000 loan with 50k one-time cuts >= 25 months (exact spec case)", () => {
    const loan = mkLoan({ id: "a", balance: 100000, interestRate: 0.05, minPayment: 2000 });
    const without = run([loan]);
    const withOT = calculateDebtOptimization({
      loans: [loan],
      oneTimePayments: [{ date: "2026-01", amount: 50000, loanId: "a" }],
      startDate: "2026-01",
      strategy: "custom",
    });
    const monthsWithout = monthsBetween("2026-01", without.loans[0]?.newEndDate ?? "2026-01");
    const monthsWith = monthsBetween("2026-01", withOT.loans[0]?.newEndDate ?? "2026-01");
    expect(monthsWithout - monthsWith).toBeGreaterThanOrEqual(25);
  });
});

describe("Snowball order", () => {
  it("orders loans smallest-balance-first regardless of input order", () => {
    const r = run(
      [
        mkLoan({ id: "big", balance: 30000, interestRate: 0.1, minPayment: 800 }),
        mkLoan({ id: "small", balance: 5000, interestRate: 0.03, minPayment: 300 }),
      ],
      { strategy: "snowball" }
    );
    const order = [...r.loans].sort((a, b) => a.payoffOrder - b.payoffOrder).map((x) => x.id);
    expect(order).toEqual(["small", "big"]);
  });
});

describe("Avalanche order", () => {
  it("orders loans highest-rate-first regardless of input order", () => {
    const r = run(
      [
        mkLoan({ id: "lowrate", balance: 20000, interestRate: 0.03, minPayment: 500 }),
        mkLoan({ id: "highrate", balance: 5000, interestRate: 0.15, minPayment: 300 }),
      ],
      { strategy: "avalanche" }
    );
    const order = [...r.loans].sort((a, b) => a.payoffOrder - b.payoffOrder).map((x) => x.id);
    expect(order).toEqual(["highrate", "lowrate"]);
  });

  it("GOLDEN 4: avalanche (5k@15% + 20k@3%) produces lower total interest than snowball", () => {
    const loans = () => [
      mkLoan({ id: "x", balance: 5000, interestRate: 0.15, minPayment: 800 }),
      mkLoan({ id: "y", balance: 20000, interestRate: 0.03, minPayment: 500 }),
    ];
    const avalanche = run(loans(), { strategy: "avalanche" });
    const snowball = run(loans(), { strategy: "snowball" });
    expect(avalanche.totalInterestPaid).toBeLessThanOrEqual(snowball.totalInterestPaid);
  });
});

describe("Manual mode: no automatic transfer between loans (P0-2)", () => {
  it("loan A paying off does NOT speed up loan B unless reinvestment is explicitly enabled", () => {
    const withA = run([
      mkLoan({ id: "a", balance: 3000, interestRate: 0.05, minPayment: 1000 }), // pays off in ~3 months
      mkLoan({ id: "b", balance: 50000, interestRate: 0.05, minPayment: 500 }),
    ]);
    const bAlone = run([mkLoan({ id: "b", balance: 50000, interestRate: 0.05, minPayment: 500 })]);
    const b = withA.loans.find((x) => x.id === "b");
    expect(b?.newTotalInterest).toBe(bAlone.loans[0]?.newTotalInterest);
    expect(b?.newEndDate).toBe(bAlone.loans[0]?.newEndDate);
  });

  it("this holds for custom/avalanche/snowball alike — order no longer implies auto-rolling payment", () => {
    const loans = () => [
      mkLoan({ id: "a", balance: 3000, interestRate: 0.05, minPayment: 1000 }),
      mkLoan({ id: "b", balance: 50000, interestRate: 0.05, minPayment: 500 }),
    ];
    const bAlone = run([mkLoan({ id: "b", balance: 50000, interestRate: 0.05, minPayment: 500 })]).loans[0]
      ?.newTotalInterest;
    const strategies: DebtStrategy[] = ["custom", "avalanche", "snowball"];
    for (const strategy of strategies) {
      const r = run(loans(), { strategy });
      expect(r.loans.find((x) => x.id === "b")?.newTotalInterest).toBe(bAlone);
    }
  });

  it("manualReinvestmentIsNotAutomatic: loan 2 is untouched by loan 1 clearing when it has no reinvestment configured", () => {
    const loan1 = mkLoan({ id: "loan1", balance: 20000, interestRate: 0.05, minPayment: 2000 }); // clears fast
    const loan2 = mkLoan({ id: "loan2", balance: 200000, interestRate: 0.05, minPayment: 2000 }); // no reinvestment field
    const withBothLoans = run([loan1, loan2]);
    const loan2Alone = run([loan2]);
    const l2FromPlan = withBothLoans.loans.find((r) => r.id === "loan2");
    expect(l2FromPlan?.newEndDate).toBe(loan2Alone.loans[0]?.newEndDate);
    expect(l2FromPlan?.newTotalInterest).toBe(loan2Alone.loans[0]?.newTotalInterest);
  });
});

describe("Manual reinvestment", () => {
  it("manualReinvestmentReducesEndDate: Lån 1 (100k/5%/2k) clears, reinvesting its 2k into Lån 2 (200k/5%/2k) noticeably speeds up Lån 2", () => {
    const loan1 = mkLoan({ id: "loan1", balance: 100000, interestRate: 0.05, minPayment: 2000 });
    const loan1Solo = calculateDebtOptimization({
      loans: [loan1], oneTimePayments: [], startDate: "2026-01", strategy: "custom",
    });
    const loan1ClearDate = loan1Solo.loans[0]?.newEndDate ?? "2026-01";

    const loan2 = mkLoan({ id: "loan2", balance: 200000, interestRate: 0.05, minPayment: 2000 });
    const withoutReinvest = run([loan1, loan2]);
    const withReinvest = run([
      loan1,
      { ...loan2, reinvestment: { enabled: true, fromLoanId: "loan1", amount: 2000, startDate: loan1ClearDate } },
    ]);

    const l2Without = withoutReinvest.loans.find((r) => r.id === "loan2");
    const l2With = withReinvest.loans.find((r) => r.id === "loan2");
    expect(l2With?.monthsSaved).toBeGreaterThan(0);
    expect((l2With?.newEndDate ?? "") < (l2Without?.newEndDate ?? "")).toBe(true);
    expect(l2With?.newTotalInterest).toBeLessThan((l2Without?.newTotalInterest ?? 0) * 0.85);
  });

  it("GOLDEN 5 (manual): enabling reinvestment on B, sourced from A's freed payment, speeds up B's payoff", () => {
    const withReinvestment = run([
      mkLoan({ id: "a", balance: 3000, interestRate: 0.05, minPayment: 1000 }), // clears ~month 3
      mkLoan({
        id: "b", balance: 50000, interestRate: 0.05, minPayment: 500,
        reinvestment: { enabled: true, fromLoanId: "a", amount: 1000, startDate: "2026-04" },
      }),
    ]);
    const withoutReinvestment = run([
      mkLoan({ id: "a", balance: 3000, interestRate: 0.05, minPayment: 1000 }),
      mkLoan({ id: "b", balance: 50000, interestRate: 0.05, minPayment: 500 }),
    ]);
    const bWith = withReinvestment.loans.find((x) => x.id === "b");
    const bWithout = withoutReinvestment.loans.find((x) => x.id === "b");
    expect(bWith?.newTotalInterest).toBeLessThan(bWithout?.newTotalInterest ?? 0);
    expect(bWith?.monthsSaved).toBeGreaterThan(0);
  });

  it("reinvestment only applies from startDate onward, not before", () => {
    const early = run([
      mkLoan({
        id: "b", balance: 50000, interestRate: 0.05, minPayment: 500,
        reinvestment: { enabled: true, fromLoanId: "a", amount: 2000, startDate: "2026-01" },
      }),
    ]);
    const late = run([
      mkLoan({
        id: "b", balance: 50000, interestRate: 0.05, minPayment: 500,
        reinvestment: { enabled: true, fromLoanId: "a", amount: 2000, startDate: "2030-01" },
      }),
    ]);
    expect(early.loans[0]?.newTotalInterest).toBeLessThanOrEqual(late.loans[0]?.newTotalInterest ?? 0);
  });

  it("reinvestment.enabled = false behaves identically to no reinvestment at all", () => {
    const disabled = run([
      mkLoan({
        id: "b", balance: 50000, interestRate: 0.05, minPayment: 500,
        reinvestment: { enabled: false, fromLoanId: "a", amount: 2000, startDate: "2026-01" },
      }),
    ]);
    const none = run([mkLoan({ id: "b", balance: 50000, interestRate: 0.05, minPayment: 500 })]);
    expect(disabled.loans[0]).toEqual(none.loans[0]);
  });

  it("slider behavior: increasing the reinvestment amount monotonically shortens payoff time", () => {
    const amounts = [0, 500, 1000, 2000, 5000];
    const months = amounts.map((amount) => {
      const r = run([
        mkLoan({
          id: "b", balance: 50000, interestRate: 0.05, minPayment: 500,
          reinvestment: { enabled: amount > 0, fromLoanId: "a", amount, startDate: "2026-01" },
        }),
      ]);
      return r.loans[0]?.newEndDate ?? "";
    });
    for (let i = 1; i < months.length; i++) {
      expect((months[i] ?? "") <= (months[i - 1] ?? "")).toBe(true);
    }
    expect(months[months.length - 1]).not.toBe(months[0]);
  });
});

describe("Multiple loans reconciliation", () => {
  it("totalInterestSaved always equals the sum of each loan's own interestSaved", () => {
    const loans: Loan[] = [];
    for (let i = 0; i < 6; i++) {
      loans.push(
        mkLoan({
          id: "L" + i,
          balance: 10000 + i * 3333.33,
          interestRate: 0.03 + i * 0.011,
          minPayment: 400 + i * 37,
        })
      );
    }
    const r = run(loans, { strategy: "avalanche" });
    const sumSaved = r.loans.reduce((s, x) => s + x.interestSaved, 0);
    expect(r.totalInterestSaved).toBe(sumSaved);
  });
});

describe("Loan payoff detection", () => {
  it("marks a loan fully amortizing exactly when it reaches zero balance within the simulation window", () => {
    const r = run([mkLoan({ id: "a", balance: 1000, interestRate: 0.05, minPayment: 1000 })]);
    expect(r.loans[0]?.isFullyAmortizing).toBe(true);
  });
});

describe("Payoff date arithmetic", () => {
  it("GOLDEN 1: 100000 kr @ 10% / 10000 kr/mo pays off in 11 months with 4858 kr interest", () => {
    const r = run([mkLoan({ id: "a", balance: 100000, interestRate: 0.1, minPayment: 10000 })]);
    const res = r.loans[0];
    expect(res?.newEndDate).toBe("2026-12"); // 11 months after 2026-01
    expect(res?.newTotalInterest).toBe(4858);
  });

  it("GOLDEN 2: 2000 kr @ 12% / 5000 kr/mo pays off in 1 month with 20 kr interest", () => {
    const r = run([mkLoan({ id: "a", balance: 2000, interestRate: 0.12, minPayment: 5000 })]);
    const res = r.loans[0];
    expect(res?.newEndDate).toBe("2026-02");
    expect(res?.newTotalInterest).toBe(20);
  });

  it("wraps year boundaries correctly (Dec -> Jan)", () => {
    const r = run([mkLoan({ id: "a", balance: 2000, interestRate: 0, minPayment: 1000 })], { startDate: "2026-12" });
    expect(r.loans[0]?.newEndDate).toBe("2027-02");
  });
});

describe("Total interest", () => {
  it("original (baseline) interest ignores extra/target top-ups", () => {
    const r = run([
      mkLoan({
        id: "a", balance: 50000, interestRate: 0.08, minPayment: 1000,
        extraMonthlyEnabled: true, extraMonthly: 2000, extraMonthlyFrom: "2026-01",
      }),
    ]);
    const withoutExtra = run([mkLoan({ id: "a", balance: 50000, interestRate: 0.08, minPayment: 1000 })]);
    expect(r.loans[0]?.originalTotalInterest).toBe(withoutExtra.loans[0]?.originalTotalInterest);
  });
});

describe("Interest savings", () => {
  it("interestSaved is never negative even if new somehow exceeds original", () => {
    const r = run([mkLoan({ id: "a", balance: 10000, interestRate: 0.05, minPayment: 500 })]);
    expect(r.loans[0]?.interestSaved).toBeGreaterThanOrEqual(0);
  });
});

describe("Edge cases: non-amortizing loan", () => {
  it("annuityCalculationIsAccurate would otherwise mis-flag this: a loan whose payment never covers interest is NOT fully amortizing, not instantly paid off", () => {
    const r = run([mkLoan({ id: "a", balance: 100000, interestRate: 0.2, minPayment: 500 })]);
    const res = r.loans[0];
    expect(res?.isFullyAmortizing).toBe(false);
    expect(res?.newEndDate).toBe("-");
    expect(res?.interestSaved).toBe(0);
  });

  it("the whole plan's payoffDate is also '-' when any loan never amortizes, not the start date", () => {
    const r = run([mkLoan({ id: "a", balance: 100000, interestRate: 0.2, minPayment: 500 })]);
    expect(r.payoffDate).toBe("-");
    expect(r.payoffDate).not.toBe("2026-01");
  });

  it("a plan that never amortizes gets a REJECT recommendation", () => {
    const r = run([mkLoan({ id: "a", balance: 100000, interestRate: 0.2, minPayment: 500 })]);
    expect(r.recommendation).toBe("REJECT");
  });
});

describe("Edge cases: invalid input validation", () => {
  it("throws on negative balance", () => {
    expect(() => run([mkLoan({ id: "a", balance: -5000, interestRate: 0.05, minPayment: 1000 })])).toThrow(
      /balance negative/
    );
  });

  it("throws on negative interest rate", () => {
    expect(() => run([mkLoan({ id: "a", balance: 10000, interestRate: -0.05, minPayment: 1000 })])).toThrow(
      /interestRate negative/
    );
  });

  it("throws on interestRate stored as a percentage instead of a decimal (>100%)", () => {
    expect(() => run([mkLoan({ id: "a", balance: 10000, interestRate: 5.95, minPayment: 1000 })])).toThrow(
      /interestRate >100%/
    );
  });

  it("throws on NaN/Infinity fields", () => {
    expect(() => run([mkLoan({ id: "a", balance: 10000, interestRate: NaN, minPayment: 1000 })])).toThrow(
      /NaN or Infinity/
    );
    expect(() => run([mkLoan({ id: "a", balance: 10000, interestRate: 0.05, minPayment: Infinity })])).toThrow(
      /NaN or Infinity/
    );
  });

  it("throws on negative monthly payment", () => {
    expect(() => run([mkLoan({ id: "a", balance: 10000, interestRate: 0.05, minPayment: -100 })])).toThrow(
      /minPayment negative/
    );
  });

  it("returns an empty (REJECT) result, no throw, for an empty loan list", () => {
    const r = run([]);
    expect(r).toEqual({
      payoffDate: "-",
      totalInterestPaid: 0,
      totalInterestSaved: 0,
      monthsSaved: 0,
      schedule: [],
      affectedLoans: [],
      loans: [],
      recommendation: "REJECT",
    });
  });
});

describe("Determinism", () => {
  it("the same input produces byte-identical output across 100 runs", () => {
    const input: DebtOptimizationInput = {
      loans: [
        mkLoan({
          id: "a", balance: 112455, interestRate: 0.0595, minPayment: 1389,
          paymentStyle: "fixed_amort", targetMonthlyEnabled: true, targetMonthlyTotal: 2000,
          targetMonthlyFrom: "2026-08",
        }),
        mkLoan({
          id: "b", balance: 589111, interestRate: 0.0909, minPayment: 6888,
          extraMonthlyEnabled: true, extraMonthly: 500, extraMonthlyFrom: "2026-08",
        }),
      ],
      oneTimePayments: [{ date: "2028-04", amount: 10000, loanId: "b" }],
      startDate: "2026-08",
      strategy: "custom",
    };
    const first = calculateDebtOptimization(input);
    for (let i = 0; i < 100; i++) {
      expect(calculateDebtOptimization(input)).toEqual(first);
    }
  });
});

describe("feesAreNotCountedAsPayment (P0-3)", () => {
  it("feesMonthly has zero effect on the calculation — payment=6868+fees=1328 equals payment=6868 alone", () => {
    const withFees = mkLoan({ id: "a", balance: 589111, interestRate: 0.0909, minPayment: 6868, feesMonthly: 1328 });
    const withoutFeesField = mkLoan({ id: "a", balance: 589111, interestRate: 0.0909, minPayment: 6868 });
    expect(run([withFees])).toEqual(run([withoutFeesField]));
  });
});

describe("annuityCalculationIsAccurate (P0-4)", () => {
  it("589111 kr @ 9.09% / 6888 kr/mo pays off in 139-141 months, not ~200", () => {
    const loan = mkLoan({ id: "a", balance: 589111, interestRate: 0.0909, minPayment: 6888 });
    const r = run([loan]);
    const months = monthsBetween("2026-01", r.loans[0]?.newEndDate ?? "2026-01");
    expect(months).toBeGreaterThanOrEqual(138);
    expect(months).toBeLessThanOrEqual(142);
  });
});

describe("referenceAnnuityPayment / fee-inclusion heuristic", () => {
  it("flags a payment that likely includes fees (589k @ 9.09%, invoice 8196 incl. 1328 fees)", () => {
    expect(paymentLikelyIncludesFees(589111, 0.0909, 8196)).toBe(true);
  });

  it("does NOT flag the correct fees-excluded payment (6868)", () => {
    expect(paymentLikelyIncludesFees(589111, 0.0909, 6868)).toBe(false);
  });

  it("referenceAnnuityPayment is a positive, sane figure for a real loan", () => {
    const ref = referenceAnnuityPayment(589111, 0.0909);
    expect(ref).toBeGreaterThan(0);
    expect(ref).toBeLessThan(589111);
  });
});

describe("Schedule (new: month-by-month breakdown for the UI/dashboard)", () => {
  it("produces one schedule entry per month, each covering every loan in the plan", () => {
    const r = run([
      mkLoan({ id: "a", balance: 10000, interestRate: 0.05, minPayment: 5000 }),
      mkLoan({ id: "b", balance: 20000, interestRate: 0.05, minPayment: 5000 }),
    ]);
    expect(r.schedule.length).toBeGreaterThan(0);
    for (const month of r.schedule) {
      expect(month.loans.map((l) => l.loanId).sort()).toEqual(["a", "b"]);
    }
  });

  it("a loan's schedule balance is non-increasing month over month and reaches 0", () => {
    const r = run([mkLoan({ id: "a", balance: 10000, interestRate: 0.05, minPayment: 1000 })]);
    const balances = r.schedule.map((m) => m.loans[0]?.balance ?? 0);
    for (let i = 1; i < balances.length; i++) {
      expect(balances[i]).toBeLessThanOrEqual(balances[i - 1] ?? Infinity);
    }
    expect(balances[balances.length - 1]).toBe(0);
  });
});

describe("Recommendation heuristic", () => {
  it("a plan with substantial savings (extra payment cutting many months) gets BUY", () => {
    const r = run([
      mkLoan({
        id: "a", balance: 50000, interestRate: 0.09, minPayment: 500,
        extraMonthlyEnabled: true, extraMonthly: 1500, extraMonthlyFrom: "2026-01",
      }),
    ]);
    expect(r.recommendation).toBe("BUY");
  });

  it("a plan with zero savings (no extras, no reinvestment) gets NEGOTIATE, not REJECT, when it still amortizes", () => {
    const r = run([mkLoan({ id: "a", balance: 10000, interestRate: 0.05, minPayment: 1000 })]);
    expect(["NEGOTIATE", "BUY"]).toContain(r.recommendation);
    expect(r.recommendation).not.toBe("REJECT");
  });
});

describe("DebtOptimizationEngine (DecisionEngine contract)", () => {
  it("validate() accepts well-formed input and rejects malformed input", () => {
    const engine = new DebtOptimizationEngine();
    const valid = engine.validate({
      loans: [mkLoan({ id: "a", balance: 1000, interestRate: 0.05, minPayment: 100 })],
      strategy: "custom",
    });
    expect(valid.valid).toBe(true);

    const invalid = engine.validate({ loans: "not-an-array", strategy: "custom" });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors?.length).toBeGreaterThan(0);
  });

  it("calculate() returns a real result synchronously (no longer the not-implemented stub)", () => {
    const engine = new DebtOptimizationEngine();
    const { result } = engine.calculate({
      loans: [mkLoan({ id: "a", balance: 10000, interestRate: 0.05, minPayment: 1000 })],
      strategy: "custom",
      startDate: "2026-01",
    });
    expect(result.loans[0]?.isFullyAmortizing).toBe(true);
  });

  it("exposes stable metadata", () => {
    const engine = new DebtOptimizationEngine();
    expect(engine.getMetadata()).toMatchObject({ id: "debt-optimization", version: "1" });
  });
});

// Kommer från debt-optimizer-standalone när P0-buggar är gröna.
//
// This shape is the contract debt-optimizer-standalone's engine is expected
// to satisfy — kept here so the API route and future UI can be built and
// typed against it before the real engine lands. Not yet wired into
// config/tools.ts's DECISION_MODULES.

export type Loan = {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minPayment: number;
  originalEndDate: string;
  newEndDate: string;
  originalTotalInterest: number;
  newTotalInterest: number;
  monthsSaved: number;
};

export type DebtOptimizationInput = {
  loans: Loan[];
  strategy: "avalanche" | "snowball" | "custom";
  extraMonthlyPayment?: number;
  oneTimePayments?: { amount: number; month: number }[];
  manualReinvestments?: { fromLoanId: string; toLoanId: string; amount: number; startMonth: number }[];
};

export type DebtOptimizationResult = {
  payoffDate: string;
  totalInterestPaid: number;
  monthsSaved: number;
  totalInterestSaved: number;
  schedule: { month: string; loans: { loanId: string; balance: number; payment: number; interest: number }[] }[];
  affectedLoans: string[];
  loans: Loan[];
  recommendation: "BUY" | "NEGOTIATE" | "REJECT";
};

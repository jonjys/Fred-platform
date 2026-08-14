import { z } from "zod";

const loanReinvestmentSchema = z.object({
  enabled: z.boolean(),
  fromLoanId: z.string(),
  amount: z.number(),
  startDate: z.string(),
});

const loanSchema = z.object({
  id: z.string(),
  name: z.string(),
  balance: z.number(),
  interestRate: z.number(),
  paymentStyle: z.enum(["fixed_amort", "annuity"]),
  minPayment: z.number(),
  feesMonthly: z.number().optional(),
  targetMonthlyTotal: z.number().optional(),
  targetMonthlyEnabled: z.boolean().optional(),
  targetMonthlyFrom: z.string().optional(),
  extraMonthly: z.number().optional(),
  extraMonthlyEnabled: z.boolean().optional(),
  extraMonthlyFrom: z.string().optional(),
  reinvestment: loanReinvestmentSchema.optional(),
});

const oneTimePaymentSchema = z.object({
  loanId: z.string().optional(),
  date: z.string(),
  amount: z.number(),
});

export const debtOptimizationInputSchema = z.object({
  loans: z.array(loanSchema),
  strategy: z.enum(["avalanche", "snowball", "custom"]),
  startDate: z.string().optional(),
  oneTimePayments: z.array(oneTimePaymentSchema).optional(),
});

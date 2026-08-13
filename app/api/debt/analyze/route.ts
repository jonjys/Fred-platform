import { NextResponse } from "next/server";
import { z } from "zod";
import { getModuleCatalogEntry } from "@/config/module-catalog";
import debtOptimizationEngine from "@/lib/decision-engine/modules/debt-optimization/engine";

export const runtime = "nodejs";

const loanSchema = z.object({
  id: z.string(),
  name: z.string(),
  balance: z.number(),
  interestRate: z.number(),
  minPayment: z.number(),
  originalEndDate: z.string(),
  newEndDate: z.string(),
  originalTotalInterest: z.number(),
  newTotalInterest: z.number(),
  monthsSaved: z.number(),
});

const debtOptimizationInputSchema = z.object({
  loans: z.array(loanSchema),
  strategy: z.enum(["avalanche", "snowball", "custom"]),
  extraMonthlyPayment: z.number().optional(),
  oneTimePayments: z.array(z.object({ amount: z.number(), month: z.number() })).optional(),
  manualReinvestments: z
    .array(
      z.object({ fromLoanId: z.string(), toLoanId: z.string(), amount: z.number(), startMonth: z.number() }),
    )
    .optional(),
});

/**
 * POST /api/debt/analyze — the API contract Skuldoptimering will use once
 * debt-optimizer-standalone's engine is ported in. Until then this only
 * validates input and calls the stub engine, which always throws — the
 * point is that the request/response shape is settled now, so plugging in
 * the real engine later is a one-line swap in
 * lib/decision-engine/modules/debt-optimization/engine.ts, not a new route.
 */
export async function POST(request: Request) {
  const moduleEntry = getModuleCatalogEntry("debt-optimization");
  if (!moduleEntry?.enabled) {
    return NextResponse.json({ error: "Modul Skuldoptimering är inte aktiverad än" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = debtOptimizationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { result } = debtOptimizationEngine.calculate(parsed.data);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Engine not implemented" },
      { status: 501 },
    );
  }
}

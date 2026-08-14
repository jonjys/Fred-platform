import { NextResponse } from "next/server";
import { getModuleCatalogEntry } from "@/config/module-catalog";
import debtOptimizationEngine from "@/lib/decision-engine/modules/debt-optimization/engine";
import { debtOptimizationInputSchema } from "@/lib/decision-engine/modules/debt-optimization/schemas";

export const runtime = "nodejs";

/**
 * POST /api/debt/analyze. Validates against the same schema
 * `DebtOptimizationEngine.validate` uses internally (single source of
 * truth in the module's own schemas.ts, not duplicated here) and calls the
 * real engine directly — Skuldoptimering doesn't go through the shared
 * DecisionModule/AI pipeline (app/api/analyze), since its calculation is
 * 100% deterministic loan math with no document extraction or AI
 * verdict step.
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

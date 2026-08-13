import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Placeholder only — zero calculation logic. Debt Optimization becomes a
 * real Decision Module (lib/decision-engine/modules/debt-optimization/,
 * registered in config/tools.ts's DECISION_MODULES) once the debt engine is
 * verified deterministic/tested in its own repo. Swap this out for the real
 * form at that point; until then this exists purely so the module picker
 * has something to render for a "coming soon" entry.
 */
export function DebtOptimizerForm() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Construction className="h-5 w-5 text-muted-foreground" />
          Skuldoptimering — Kommer snart
        </CardTitle>
        <CardDescription>
          Ska du refinansiera, konsolidera eller lösa lånet? Den här modulen väntar på en verifierad, deterministisk
          beräkningsmotor innan den går live — inget löfte om tidsplan, men den finns på färdplanen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Använd Inköpsanalys för leverantörs- och avtalsbeslut under tiden.
        </p>
      </CardContent>
    </Card>
  );
}

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
          Debt Optimization — Coming soon
        </CardTitle>
        <CardDescription>
          Should you refinance, consolidate, or pay off? This module is waiting on a verified, deterministic
          calculation engine before it goes live — no timeline promises, but it&apos;s on the roadmap.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          In the meantime, use Purchase Analysis for supplier and vendor decisions.
        </p>
      </CardContent>
    </Card>
  );
}

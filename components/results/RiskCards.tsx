import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Risk, RiskSeverity } from "@/lib/decision-engine/types";
import { cn } from "@/lib/utils";

const SEVERITY_ORDER: RiskSeverity[] = ["critical", "high", "medium", "low"];

const SEVERITY_BADGE_CLASS: Record<RiskSeverity, string> = {
  critical: "bg-red-600 text-white hover:bg-red-600",
  high: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950 dark:text-red-300",
  medium: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300",
  low: "bg-secondary text-secondary-foreground hover:bg-secondary",
};

/** Generic over `Risk[]` — works for any module's AI-identified risks, not
 * just contract risks from purchase-analysis. */
export function RiskCards({ risks }: { risks: Risk[] }) {
  if (risks.length === 0) {
    return <p className="text-sm text-muted-foreground">No significant risks were identified.</p>;
  }

  const sorted = [...risks].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sorted.map((risk, index) => (
        <Card key={index} className={cn(risk.severity === "critical" && "border-red-600")}>
          <CardContent className="space-y-2 pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{risk.category}</span>
              <Badge className={SEVERITY_BADGE_CLASS[risk.severity]}>{risk.severity}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{risk.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

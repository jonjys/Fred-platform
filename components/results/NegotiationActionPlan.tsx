import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RecommendedAction } from "@/lib/decision-engine/types";

/** Generic over `RecommendedAction[]` — a future module's "next steps" or
 * "due diligence checklist" render through the same component. */
export function NegotiationActionPlan({ actions }: { actions: RecommendedAction[] }) {
  if (actions.length === 0) {
    return <p className="text-sm text-muted-foreground">Inga specifika åtgärdspunkter genererades.</p>;
  }

  return (
    <div className="space-y-2">
      {actions.map((action, index) => (
        <Card key={index}>
          <CardContent className="flex items-start gap-3 pt-4">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-normal">
                  {action.type.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-sm">{action.description}</p>
              {action.potentialImpact && (
                <p className="text-xs text-muted-foreground">Möjlig påverkan: {action.potentialImpact}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

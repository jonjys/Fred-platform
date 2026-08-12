import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Generic placeholder for any catalog entry that doesn't have a dedicated
 * component yet (see MODULE_CATALOG in config/tools.ts). Debt Optimization
 * gets its own DebtOptimizerForm since it's next in line for a real
 * implementation; everything else reuses this. */
export function ComingSoonModulePanel({ label, description }: { label: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Construction className="h-5 w-5 text-muted-foreground" />
          {label} — Coming soon
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          In the meantime, use Purchase Analysis for supplier and vendor decisions.
        </p>
      </CardContent>
    </Card>
  );
}

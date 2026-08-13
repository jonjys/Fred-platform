import { AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import type { Verdict, VerdictSeverity } from "@/lib/decision-engine/types";
import { cn, formatPercentage } from "@/lib/utils";
import { VERDICT_SEVERITY_STYLES } from "./verdict-colors";

/**
 * Renders any module's `Verdict` — colored purely by `severity`
 * (positive/neutral/negative), never by `code`. This is what lets the same
 * component render purchase-analysis's BUY/NEGOTIATE/REJECT today and a
 * future module's differently-worded verdict tomorrow without a code
 * change here.
 */
const SEVERITY_ICON: Record<VerdictSeverity, typeof CheckCircle2> = {
  positive: CheckCircle2,
  neutral: MinusCircle,
  negative: AlertTriangle,
};

export function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const style = VERDICT_SEVERITY_STYLES[verdict.severity];
  const Icon = SEVERITY_ICON[verdict.severity];

  return (
    <div className={cn("rounded-xl border p-5", style.bg, style.border)}>
      <div className="flex items-center gap-3">
        <Icon className={cn("h-8 w-8 shrink-0", style.text)} />
        <div>
          <div className={cn("text-2xl font-bold tracking-tight", style.text)}>{verdict.label}</div>
          <div className="text-sm text-muted-foreground">
            {formatPercentage(verdict.confidence * 100)} säkerhet
          </div>
        </div>
      </div>
      {verdict.reasoning.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-current/10 pt-3 text-sm text-foreground/90">
          {verdict.reasoning.map((reason, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

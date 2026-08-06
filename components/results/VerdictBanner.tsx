import { AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import type { Verdict, VerdictSeverity } from "@/lib/decision-engine/types";
import { cn, formatPercentage } from "@/lib/utils";

/**
 * Renders any module's `Verdict` — colored purely by `severity`
 * (positive/neutral/negative), never by `code`. This is what lets the same
 * component render purchase-analysis's BUY/NEGOTIATE/REJECT today and a
 * future module's differently-worded verdict tomorrow without a code
 * change here.
 */
const SEVERITY_STYLES: Record<VerdictSeverity, { bg: string; border: string; text: string; icon: typeof CheckCircle2 }> = {
  positive: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  neutral: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    icon: MinusCircle,
  },
  negative: {
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-300 dark:border-red-800",
    text: "text-red-700 dark:text-red-400",
    icon: AlertTriangle,
  },
};

export function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const style = SEVERITY_STYLES[verdict.severity];
  const Icon = style.icon;

  return (
    <div className={cn("rounded-xl border p-5", style.bg, style.border)}>
      <div className="flex items-center gap-3">
        <Icon className={cn("h-8 w-8 shrink-0", style.text)} />
        <div>
          <div className={cn("text-2xl font-bold tracking-tight", style.text)}>{verdict.label}</div>
          <div className="text-sm text-muted-foreground">
            {formatPercentage(verdict.confidence * 100)} confidence
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

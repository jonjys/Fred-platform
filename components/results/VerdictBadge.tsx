import type { Verdict } from "@/lib/decision-engine/types";
import { cn } from "@/lib/utils";
import { VERDICT_SEVERITY_STYLES } from "./verdict-colors";

/** Compact pill form of a Verdict, for list/card contexts (History,
 * Dashboard) where the full VerdictBanner would be too heavy. Same
 * severity → color mapping as VerdictBanner. */
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const style = VERDICT_SEVERITY_STYLES[verdict.severity];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        style.bg,
        style.border,
        style.text,
      )}
    >
      {verdict.label}
    </span>
  );
}

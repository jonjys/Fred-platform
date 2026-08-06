import type { VerdictSeverity } from "@/lib/decision-engine/types";

/**
 * Single source of truth for severity → color, shared by VerdictBanner (full)
 * and VerdictBadge (compact pill) so a BUY/NEGOTIATE/REJECT — or any future
 * module's verdict — reads as the same color everywhere it appears.
 */
export const VERDICT_SEVERITY_STYLES: Record<VerdictSeverity, { bg: string; border: string; text: string }> = {
  positive: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  neutral: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
  },
  negative: {
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-300 dark:border-red-800",
    text: "text-red-700 dark:text-red-400",
  },
};

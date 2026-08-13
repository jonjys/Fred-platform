"use client";

import { Info, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StatCardTrend {
  /** Already-formatted, e.g. "+12.4%" — this component only decides color/icon. */
  label: string;
  positive: boolean;
}

export function StatCard({
  label,
  value,
  subtext,
  valueClassName,
  tooltip,
  trend,
  children,
}: {
  label: string;
  value: string;
  subtext?: string;
  valueClassName?: string;
  /** Shown as an info icon next to the label — explains what the number means
   * without permanently taking up card space. */
  tooltip?: string;
  trend?: StatCardTrend;
  /** Extra content below the value/trend row — e.g. a progress bar. */
  children?: ReactNode;
}) {
  const TrendIcon = trend ? (trend.positive ? TrendingUp : TrendingDown) : null;

  return (
    <Card className="border-zinc-800 bg-zinc-900 transition-colors hover:bg-zinc-800/60">
      <div className="space-y-1 p-4">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-zinc-600 hover:text-zinc-300"
                  aria-label="Mer information"
                >
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <p className={cn("font-mono text-3xl font-semibold text-zinc-50", valueClassName)}>{value}</p>
          {trend && TrendIcon && (
            <span
              className={cn(
                "flex items-center gap-0.5 font-mono text-xs font-medium",
                trend.positive ? "text-green-500" : "text-red-500",
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {trend.label}
            </span>
          )}
        </div>
        {subtext && <p className="text-xs text-zinc-500">{subtext}</p>}
        {children}
      </div>
    </Card>
  );
}

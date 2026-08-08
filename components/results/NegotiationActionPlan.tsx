// components/results/NegotiationActionPlan.tsx
"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";

interface ActionItem {
  type: string;
  description: string;
  potentialImpact?: string;
}

interface NegotiationActionPlanProps {
  plan: ActionItem[];
}

export function NegotiationActionPlan({ plan }: NegotiationActionPlanProps) {
  if (!plan || plan.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/60 text-slate-400 text-xs">
        Inga specifika åtgärdspunkter angivna.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plan.map((item, index) => (
        <div
          key={index}
          className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors space-y-2"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="uppercase tracking-wider">{item.type}</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-200">{item.description}</p>
          {item.potentialImpact && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              <ArrowRight className="w-3 h-3 text-emerald-500" />
              <span>Förväntad effekt: <strong className="text-slate-300">{item.potentialImpact}</strong></span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// components/results/RiskCards.tsx
"use client";

import { AlertTriangle, AlertOctagon, Info } from "lucide-react";
import type { Risk } from "@/lib/decision-engine/types";

interface RiskCardsProps {
  risks: Risk[];
}

export function RiskCards({ risks }: RiskCardsProps) {
  if (!risks || risks.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/60 text-slate-400 text-xs">
        Inga uppenbara avtalsrisker identifierade.
      </div>
    );
  }

  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "high":
        return {
          border: "border-rose-500/30 bg-rose-950/20 text-rose-300",
          badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
          icon: <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />,
        };
      case "medium":
        return {
          border: "border-amber-500/30 bg-amber-950/20 text-amber-300",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
        };
      default:
        return {
          border: "border-slate-800 bg-slate-950/40 text-slate-300",
          badge: "bg-slate-800 text-slate-400 border-slate-700",
          icon: <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />,
        };
    }
  };

  return (
    <div className="space-y-3">
      {risks.map((risk, index) => {
        const style = getSeverityStyle(risk.severity);
        return (
          <div
            key={index}
            className={`p-4 rounded-xl border ${style.border} flex items-start gap-3 transition-colors`}
          >
            {style.icon}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${style.badge}`}>
                  {risk.category || risk.severity}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">{risk.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

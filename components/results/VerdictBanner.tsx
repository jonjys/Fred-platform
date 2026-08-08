// components/results/VerdictBanner.tsx
"use client";

import { ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import type { PurchaseAnalysisVerdict } from "@/lib/decision-engine/modules/purchase-analysis/types";

interface VerdictBannerProps {
  verdict: PurchaseAnalysisVerdict;
}

export function VerdictBanner({ verdict }: VerdictBannerProps) {
  const decision = verdict?.decision || "NEGOTIATE";
  const confidence = Math.round((verdict?.confidence || 0) * 100);

  const styles = {
    BUY: {
      bg: "bg-emerald-950/40 border-emerald-500/30 text-emerald-300",
      glow: "shadow-[0_0_30px_rgba(16,185,129,0.15)]",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
      label: "KÖP / GODKÄND",
    },
    NEGOTIATE: {
      bg: "bg-amber-950/40 border-amber-500/30 text-amber-300",
      glow: "shadow-[0_0_30px_rgba(245,158,11,0.15)]",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      icon: <AlertTriangle className="w-8 h-8 text-amber-400" />,
      label: "FÖRHANDLA VILLKOR",
    },
    REJECT: {
      bg: "bg-rose-950/40 border-rose-500/30 text-rose-300",
      glow: "shadow-[0_0_30px_rgba(244,63,94,0.15)]",
      badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      icon: <ShieldAlert className="w-8 h-8 text-rose-400" />,
      label: "AVSLÅ / HÖG RISK",
    },
  }[decision] || {
    bg: "bg-slate-900 border-slate-800 text-slate-200",
    glow: "",
    badgeBg: "bg-slate-800 text-slate-300 border-slate-700",
    icon: <AlertTriangle className="w-8 h-8 text-slate-400" />,
    label: decision,
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-6 md:p-8 ${styles.bg} ${styles.glow} backdrop-blur-md transition-all`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10 shrink-0">
            {styles.icon}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${styles.badgeBg}`}>
                {styles.label}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {confidence}% AI Tillförlitlighet
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white mt-1">
              {decision === "BUY" && "Ett fördelaktigt avtal utan större dolda fällor."}
              {decision === "NEGOTIATE" && "Avtalet har dolda kostnader eller riskvillkor som bör villkoras."}
              {decision === "REJECT" && "Signera inte i nuvarande form — hög finansiell/juridisk risk."}
            </h2>
          </div>
        </div>
      </div>

      {verdict?.highlights && verdict.highlights.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-2">
          {verdict.highlights.map((highlight, idx) => (
            <div key={idx} className="text-xs text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              {highlight}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

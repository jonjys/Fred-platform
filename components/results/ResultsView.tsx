// components/results/ResultsView.tsx
"use client";

import Link from "next/link";
import { VerdictBanner } from "./VerdictBanner";
import { FinancialMetricsBreakdown } from "./FinancialMetricsBreakdown";
import { RiskCards } from "./RiskCards";
import { NegotiationActionPlan } from "./NegotiationActionPlan";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PurchaseAnalysisResult } from "@/lib/decision-engine/modules/purchase-analysis/types";

interface ResultsViewProps {
  result: PurchaseAnalysisResult;
  onReset?: () => void;
}

export function ResultsView({ result, onReset }: ResultsViewProps) {
  if (!result) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          {onReset ? (
            <button
              onClick={onReset}
              className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Gör en ny analys
            </button>
          ) : (
            <Link
              href="/history"
              className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Tillbaka till historik
            </Link>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Beslutsanalys & Riskuppskattning
          </h1>
          <p className="text-xs text-slate-400">
            Genererad av Karma Decision OS Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => window.print()}
          >
            <Download className="w-4 h-4 mr-1.5" /> Exportera PDF
          </Button>
        </div>
      </div>

      <VerdictBanner verdict={result.verdict} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
            Finansiell Översikt
          </h2>
          <FinancialMetricsBreakdown metrics={result.metrics} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {result.summary && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                AI Sammanfattning
              </h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {result.summary}
              </p>
            </div>
          )}

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              Identifierade Avtalsrisker
            </h2>
            <RiskCards risks={result.risks} />
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Förhandlingsplan & Åtgärder
            </h2>
            <NegotiationActionPlan plan={result.actionPlan} />
          </div>
        </div>
      </div>
    </div>
  );
}

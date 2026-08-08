// components/analyzer/PurchaseAnalyzerForm.tsx
"use client";

import { useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResultsView } from "@/components/results/ResultsView";

interface CompanyOption {
  id: string;
  companyName: string;
}

export function PurchaseAnalyzerForm({ companies }: { companies: CompanyOption[] }) {
  const [companyId] = useState(companies[0]?.id ?? "");
  const [decisionTitle, setDecisionTitle] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [upfrontCost, setUpfrontCost] = useState("");
  const [monthlyCost, setMonthlyCost] = useState("");
  const [hiddenFees, setHiddenFees] = useState("");
  const [contractMonths, setContractMonths] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("moduleKey", "purchase-analysis");
      formData.append("companyId", companyId);
      formData.append("title", decisionTitle || `Analys: ${vendorName || "Nytt avtal"}`);
      
      const inputPayload = {
        primaryOffer: {
          vendorName: vendorName || undefined,
          upfrontCost: upfrontCost ? Number(upfrontCost) : undefined,
          monthlyCost: monthlyCost ? Number(monthlyCost) : undefined,
          hiddenFees: hiddenFees ? Number(hiddenFees) : undefined,
          contractLengthMonths: contractMonths ? Number(contractMonths) : undefined,
          notes: notes || undefined,
        },
      };

      formData.append("input", JSON.stringify(inputPayload));
      if (file) {
        formData.append("document", file);
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Misslyckades att genomföra analysen.");
      }

      const data = await res.json();
      setResult(data.result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ett oväntat fel uppstod.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (result) {
    return <ResultsView result={result} onReset={() => setResult(null)} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" /> Starta ny beslutsanalys
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Ladda upp ett avtal/offert i PDF eller fyll i uppgifterna manuellt.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Fil-uppladdning */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            1. Ladda upp Offert / Avtal (Valfritt)
          </Label>
          <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-6 text-center transition-colors bg-slate-950/40">
            <input
              type="file"
              accept=".pdf,.txt"
              id="file-upload"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="w-6 h-6 text-slate-400" />
              <span className="text-xs font-medium text-slate-300">
                {file ? file.name : "Klicka eller dra hit PDF-offerten"}
              </span>
              <span className="text-[10px] text-slate-500">Karma läser av alla dolda villkor automatiskt</span>
            </label>
          </div>
        </div>

        {/* Grunddata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs text-slate-300">Rubrik / Beslutets namn</Label>
            <Input
              id="title"
              placeholder="t.ex. Inköp av nytt CRM-system"
              value={decisionTitle}
              onChange={(e) => setDecisionTitle(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor" className="text-xs text-slate-300">Leverantör / Säljare</Label>
            <Input
              id="vendor"
              placeholder="t.ex. Acme Corp"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Kostnader */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="upfront" className="text-[11px] text-slate-400">Startkostnad</Label>
            <Input
              id="upfront"
              type="number"
              placeholder="0"
              value={upfrontCost}
              onChange={(e) => setUpfrontCost(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="monthly" className="text-[11px] text-slate-400">Månadskostnad</Label>
            <Input
              id="monthly"
              type="number"
              placeholder="0"
              value={monthlyCost}
              onChange={(e) => setMonthlyCost(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hidden" className="text-[11px] text-slate-400">Dolda avgifter</Label>
            <Input
              id="hidden"
              type="number"
              placeholder="0"
              value={hiddenFees}
              onChange={(e) => setHiddenFees(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="months" className="text-[11px] text-slate-400">Bindningstid (mån)</Label>
            <Input
              id="months"
              type="number"
              placeholder="12"
              value={contractMonths}
              onChange={(e) => setContractMonths(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Anteckningar */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-xs text-slate-300">Särskilda kontext eller frågeställningar</Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Finns det något särskilt du vill att AI-motorn ska kontrollera extra noga?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500 text-xs"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Analyserar villkor & räknar TCO...
            </span>
          ) : (
            "Kör Beslutsanalys"
          )}
        </Button>
      </form>
    </div>
  );
}

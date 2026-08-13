"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ANALYZE_TEMPLATES } from "@/config/analyze-templates";
import { MODULE_CATALOG } from "@/config/module-catalog";
import { ComingSoonModulePanel } from "./ComingSoonModulePanel";
import { DebtOptimizerForm } from "./DebtOptimizerForm";
import { PurchaseAnalyzerForm } from "./PurchaseAnalyzerForm";

interface CompanyOption {
  id: string;
  companyName: string;
}

/**
 * The only module with a real form today is purchase-analysis; everything
 * else in MODULE_CATALOG is disabled and renders a placeholder. This picker
 * is purely a UI switch — it never touches DECISION_MODULES or
 * /api/analyze, so selecting a disabled entry can't route a real request
 * anywhere.
 */
export function AnalyzeModulePicker({ companies }: { companies: CompanyOption[] }) {
  const [moduleKey, setModuleKey] = useState(MODULE_CATALOG[0]?.key ?? "purchase-analysis");
  const selected = MODULE_CATALOG.find((entry) => entry.key === moduleKey) ?? MODULE_CATALOG[0];

  // Set once from the dashboard's empty-state CTAs (?template=...) — read at
  // mount time only, so it doesn't fight the user's own edits afterward.
  const searchParams = useSearchParams();
  const template = ANALYZE_TEMPLATES[searchParams.get("template") ?? ""];

  return (
    <div className="max-w-2xl space-y-6">
      {MODULE_CATALOG.length > 1 && (
        <div className="space-y-2">
          <Label>Typ av beslut</Label>
          <Select value={moduleKey} onValueChange={setModuleKey}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODULE_CATALOG.map((entry) => (
                <SelectItem key={entry.key} value={entry.key} disabled={!entry.enabled}>
                  {entry.label}
                  {!entry.enabled ? " – Kommer snart" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selected?.key === "purchase-analysis" && <PurchaseAnalyzerForm companies={companies} initial={template} />}
      {selected?.key === "debt-optimization" && <DebtOptimizerForm />}
      {selected && selected.key !== "purchase-analysis" && selected.key !== "debt-optimization" && (
        <ComingSoonModulePanel label={selected.label} description={selected.description} />
      )}
    </div>
  );
}

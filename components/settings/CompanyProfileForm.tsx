"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CompanyRow } from "@/lib/database/repositories/companies";

interface CompanyProfileFormProps {
  company: CompanyRow;
}

/** Renders a fraction (0.21) as a percentage-input string ("21"). */
function fractionToPercentInput(value: number | null): string {
  return value === null ? "" : String(value * 100);
}

/** Inverse of `fractionToPercentInput` — "" becomes null, not 0, so leaving
 * a field blank clears it rather than zeroing it out. */
function percentInputToFraction(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed) / 100;
}

function readBudget(row: CompanyRow): { amount: string; period: "monthly" | "annual" } {
  const budget = row.budget as { amount?: number; period?: "monthly" | "annual" } | null;
  if (budget != null && typeof budget.amount === "number" && budget.period != null) {
    return { amount: String(budget.amount), period: budget.period };
  }
  return { amount: "", period: "monthly" };
}

/**
 * The AI Wallet editor — this is what makes every analysis budget-aware,
 * VAT-aware, and margin-aware instead of relying on per-analysis overrides.
 * Every field here flows into `CompanyContext` (lib/decision-engine/types.ts)
 * via `toCompanyContext`, which every Decision Module consumes.
 */
export function CompanyProfileForm({ company }: CompanyProfileFormProps) {
  const router = useRouter();
  const initialBudget = readBudget(company);

  const [companyName, setCompanyName] = useState(company.company_name);
  const [industry, setIndustry] = useState(company.industry ?? "");
  const [country, setCountry] = useState(company.country ?? "");
  const [currency, setCurrency] = useState(company.currency);
  const [vatRatePercent, setVatRatePercent] = useState(String(Number(company.vat_rate) * 100));
  const [targetMarginPercent, setTargetMarginPercent] = useState(
    fractionToPercentInput(company.target_margin !== null ? Number(company.target_margin) : null),
  );
  const [budgetAmount, setBudgetAmount] = useState(initialBudget.amount);
  const [budgetPeriod, setBudgetPeriod] = useState<"monthly" | "annual">(initialBudget.period);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSavedAt(null);

    const trimmedBudgetAmount = budgetAmount.trim();

    const response = await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        industry: industry.trim() || null,
        country: country.trim() || null,
        currency,
        vatRate: Number(vatRatePercent) / 100,
        targetMargin: percentInputToFraction(targetMarginPercent),
        budget: trimmedBudgetAmount === "" ? null : { amount: Number(trimmedBudgetAmount), period: budgetPeriod },
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Failed to save" }));
      setError(body.error ?? "Failed to save");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setSavedAt(Date.now());
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{company.company_name}</CardTitle>
        <CardDescription>
          This context is passed into every analysis — budget fit, VAT-inclusive totals, and margin checks all read
          from here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`companyName-${company.id}`}>Company name</Label>
            <Input
              id={`companyName-${company.id}`}
              required
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`industry-${company.id}`}>Industry</Label>
              <Input
                id={`industry-${company.id}`}
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                placeholder="SaaS, retail, ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`country-${company.id}`}>Country</Label>
              <Input
                id={`country-${company.id}`}
                maxLength={2}
                value={country}
                onChange={(event) => setCountry(event.target.value.toUpperCase())}
                placeholder="SE"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`currency-${company.id}`}>Currency</Label>
              <Input
                id={`currency-${company.id}`}
                required
                maxLength={3}
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                placeholder="EUR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`vatRate-${company.id}`}>VAT rate (%)</Label>
              <Input
                id={`vatRate-${company.id}`}
                type="number"
                required
                min={0}
                max={100}
                step="0.1"
                value={vatRatePercent}
                onChange={(event) => setVatRatePercent(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`targetMargin-${company.id}`}>Target margin (%)</Label>
            <Input
              id={`targetMargin-${company.id}`}
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={targetMarginPercent}
              onChange={(event) => setTargetMarginPercent(event.target.value)}
              placeholder="Optional — used for margin-fit checks"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`budgetAmount-${company.id}`}>Budget</Label>
              <Input
                id={`budgetAmount-${company.id}`}
                type="number"
                min={0}
                step="0.01"
                value={budgetAmount}
                onChange={(event) => setBudgetAmount(event.target.value)}
                placeholder="Optional — used for budget-fit checks"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`budgetPeriod-${company.id}`}>Budget period</Label>
              <Select value={budgetPeriod} onValueChange={(value) => setBudgetPeriod(value as "monthly" | "annual")}>
                <SelectTrigger id={`budgetPeriod-${company.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
            {savedAt && <span className="text-sm text-muted-foreground">Saved.</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

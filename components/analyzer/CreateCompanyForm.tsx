"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Inline "AI Wallet" creation — the analyze page needs at least one company
 * to submit a decision against. A dedicated settings page for managing
 * companies is a later milestone; this covers the minimum needed to run an
 * analysis today.
 */
export function CreateCompanyForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [currency, setCurrency] = useState("SEK");
  const [vatRate, setVatRate] = useState("25");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        currency,
        vatRate: Number(vatRate) / 100,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Kunde inte skapa företaget" }));
      setError(body.error ?? "Kunde inte skapa företaget");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  }

  return (
    <Card className="max-w-md border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle>Skapa din företagsprofil</CardTitle>
        <CardDescription>
          En företagsprofil krävs innan du kan köra en analys — den bär med sig din valuta, momssats och budget in i
          varje beslut.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Företagsnamn</Label>
            <Input
              id="companyName"
              required
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Mitt AB"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="currency">Valuta</Label>
              <Input
                id="currency"
                required
                maxLength={3}
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                placeholder="SEK"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatRate">Momssats (%)</Label>
              <Input
                id="vatRate"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={vatRate}
                onChange={(event) => setVatRate(event.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Skapar…" : "Skapa företag"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

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
  const [currency, setCurrency] = useState("EUR");
  const [vatRate, setVatRate] = useState("21");
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
      const body = await response.json().catch(() => ({ error: "Failed to create company" }));
      setError(body.error ?? "Failed to create company");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Set up your AI Wallet</CardTitle>
        <CardDescription>
          A company profile is required before running an analysis — it carries your currency, VAT rate, and budget
          into every decision.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              required
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                required
                maxLength={3}
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                placeholder="EUR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatRate">VAT rate (%)</Label>
              <Input
                id="vatRate"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={vatRate}
                onChange={(event) => setVatRate(event.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create company"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

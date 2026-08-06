"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone } from "./FileDropzone";
import { emptyOfferDraft, OfferFieldset, type OfferDraft } from "./OfferFieldset";
import { ResultsView, type PurchaseDecisionResult } from "@/components/results/ResultsView";

interface CompanyOption {
  id: string;
  companyName: string;
}

interface AnalyzeApiDecision {
  status: "draft" | "processing" | "completed" | "failed" | "archived";
  error: string | null;
  verdict: unknown;
  deterministic_metrics: unknown;
  ai_analysis: unknown;
  risks: unknown;
  recommended_actions: unknown;
}

function offerDraftToPayload(draft: OfferDraft) {
  return {
    vendorName: draft.vendorName,
    upfrontCost: Number(draft.upfrontCost) || 0,
    monthlyCost: Number(draft.monthlyCost) || 0,
    hiddenFees: Number(draft.hiddenFees) || 0,
    contractLengthMonths: Number(draft.contractLengthMonths) || 0,
    notes: draft.notes || undefined,
  };
}

export function PurchaseAnalyzerForm({ companies }: { companies: CompanyOption[] }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [decisionTitle, setDecisionTitle] = useState("");
  const [primaryOffer, setPrimaryOffer] = useState<OfferDraft>(emptyOfferDraft());
  const [alternativeOffers, setAlternativeOffers] = useState<OfferDraft[]>([]);
  const [vatRateOverride, setVatRateOverride] = useState("");
  const [expectedMonthlyBenefit, setExpectedMonthlyBenefit] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseDecisionResult | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    setResult(null);

    const input = {
      decisionTitle,
      primaryOffer: offerDraftToPayload(primaryOffer),
      alternativeOffers: alternativeOffers.map(offerDraftToPayload),
      vatRate: vatRateOverride ? Number(vatRateOverride) / 100 : undefined,
      expectedMonthlyBenefit: expectedMonthlyBenefit ? Number(expectedMonthlyBenefit) : undefined,
      documentText: documentText || undefined,
    };

    const formData = new FormData();
    formData.set("moduleKey", "purchase-analysis");
    formData.set("companyId", companyId);
    formData.set("title", decisionTitle);
    formData.set("input", JSON.stringify(input));
    if (file) formData.set("file", file);

    try {
      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const body = (await response.json()) as { decision?: AnalyzeApiDecision; error?: string };

      if (!response.ok || !body.decision || body.decision.status !== "completed") {
        setStatus("error");
        setError(body.decision?.error ?? body.error ?? "Analysis failed");
        return;
      }

      const decision = body.decision;
      setResult({
        verdict: decision.verdict as PurchaseDecisionResult["verdict"],
        metrics: decision.deterministic_metrics as PurchaseDecisionResult["metrics"],
        aiAnalysis: decision.ai_analysis as PurchaseDecisionResult["aiAnalysis"],
        risks: (decision.risks ?? []) as PurchaseDecisionResult["risks"],
        recommendedActions: (decision.recommended_actions ?? []) as PurchaseDecisionResult["recommendedActions"],
      });
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Network error — could not reach the analysis pipeline.");
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setResult(null)}>
          ← Run another analysis
        </Button>
        <ResultsView result={result} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New purchase decision</CardTitle>
          <CardDescription>BUY, NEGOTIATE, or REJECT — backed by real TCO, not a gut feeling.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {companies.length > 1 && (
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="decisionTitle">Decision title</Label>
            <Input
              id="decisionTitle"
              required
              value={decisionTitle}
              onChange={(event) => setDecisionTitle(event.target.value)}
              placeholder="New CRM subscription"
            />
          </div>
        </CardContent>
      </Card>

      <OfferFieldset idPrefix="primary" title="Primary offer" value={primaryOffer} onChange={setPrimaryOffer} />

      {alternativeOffers.map((offer, index) => (
        <OfferFieldset
          key={index}
          idPrefix={`alt-${index}`}
          title={`Alternative offer ${index + 1}`}
          value={offer}
          onChange={(next) =>
            setAlternativeOffers((offers) => offers.map((o, i) => (i === index ? next : o)))
          }
          onRemove={() => setAlternativeOffers((offers) => offers.filter((_, i) => i !== index))}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAlternativeOffers((offers) => [...offers, emptyOfferDraft()])}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add supplier alternative
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional context</CardTitle>
          <CardDescription>Optional — improves ROI and contract-risk accuracy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vatRateOverride">VAT rate override (%)</Label>
              <Input
                id="vatRateOverride"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={vatRateOverride}
                onChange={(event) => setVatRateOverride(event.target.value)}
                placeholder="Uses company default"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedMonthlyBenefit">Expected monthly benefit</Label>
              <Input
                id="expectedMonthlyBenefit"
                type="number"
                min={0}
                step="0.01"
                value={expectedMonthlyBenefit}
                onChange={(event) => setExpectedMonthlyBenefit(event.target.value)}
                placeholder="For ROI / payback period"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentText">Quote description / notes</Label>
            <Textarea
              id="documentText"
              rows={4}
              value={documentText}
              onChange={(event) => setDocumentText(event.target.value)}
              placeholder="Paste the vendor's quote, contract terms, or any relevant context here"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Or upload a PDF quote / contract</Label>
            <FileDropzone file={file} onFileChange={setFile} />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={status === "submitting" || !companyId} className="w-full">
        {status === "submitting" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running analysis…
          </>
        ) : (
          "Analyze decision"
        )}
      </Button>
    </form>
  );
}

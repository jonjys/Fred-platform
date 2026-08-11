"use client";

import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
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
import { SupplierHistoryPanel } from "./SupplierHistoryPanel";
import {
  ResultsView,
  toPurchaseDecisionResult,
  type PurchaseDecisionResult,
  type PurchaseDecisionResultSource,
} from "@/components/results/ResultsView";

interface CompanyOption {
  id: string;
  companyName: string;
}

interface AnalyzeApiDecision extends PurchaseDecisionResultSource {
  status: "draft" | "processing" | "completed" | "failed" | "archived";
  error: string | null;
}

/**
 * Converts a form draft to the JSON payload sent to /api/analyze. Blank
 * fields become `undefined` (and are dropped by JSON.stringify) rather than
 * `0` / `""` — the server's extraction merge only fills a field from the
 * document when the caller didn't explicitly provide it, so sending `0` for
 * "the user left this blank" would silently overwrite whatever Claude read
 * out of an uploaded PDF.
 */
function offerDraftToPayload(draft: OfferDraft) {
  const numberOrUndefined = (raw: string) => (raw.trim() === "" ? undefined : Number(raw));

  return {
    vendorName: draft.vendorName.trim() || undefined,
    upfrontCost: numberOrUndefined(draft.upfrontCost),
    monthlyCost: numberOrUndefined(draft.monthlyCost),
    hiddenFees: numberOrUndefined(draft.hiddenFees),
    contractLengthMonths: numberOrUndefined(draft.contractLengthMonths),
    notes: draft.notes.trim() || undefined,
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
  const [billingUrl, setBillingUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseDecisionResult | null>(null);

  // When a document is attached, offer fields are allowed to stay blank —
  // extraction fills them server-side. Without one, manual entry is the
  // only source of truth, so the browser should still catch empty fields.
  const hasDocumentSource = Boolean(file) || documentText.trim().length > 0;

  /** "Run another analysis" must start from a genuinely blank form —
   * otherwise a file/pasted text left over from a previous run silently
   * rides along into the next one and gets analyzed as if it belonged to
   * it. Only the selected company carries over. */
  function resetForm() {
    setDecisionTitle("");
    setPrimaryOffer(emptyOfferDraft());
    setAlternativeOffers([]);
    setVatRateOverride("");
    setExpectedMonthlyBenefit("");
    setDocumentText("");
    setFile(null);
    setStatus("idle");
    setError(null);
    setBillingUrl(null);
    setResult(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    setBillingUrl(null);
    setResult(null);

    // decisionTitle isn't something extraction produces (it's a label, not
    // a document fact) — so unlike the offer fields, a document attachment
    // can't fill this one in server-side. Derive a reasonable default from
    // the filename rather than blocking a PDF-only submission on it.
    const title = decisionTitle.trim() || (file ? file.name.replace(/\.[^./]+$/, "") : "Untitled decision");

    const input = {
      decisionTitle: title,
      primaryOffer: offerDraftToPayload(primaryOffer),
      // An empty array is a real value (deepMergePreferOverride replaces
      // arrays wholesale) and would wipe out any alternatives Claude
      // extracted from the document — send undefined instead when the user
      // hasn't manually added any.
      alternativeOffers: alternativeOffers.length > 0 ? alternativeOffers.map(offerDraftToPayload) : undefined,
      vatRate: vatRateOverride ? Number(vatRateOverride) / 100 : undefined,
      expectedMonthlyBenefit: expectedMonthlyBenefit ? Number(expectedMonthlyBenefit) : undefined,
      documentText: documentText || undefined,
    };

    const formData = new FormData();
    formData.set("moduleKey", "purchase-analysis");
    formData.set("companyId", companyId);
    formData.set("title", title);
    formData.set("input", JSON.stringify(input));
    if (file) {
      formData.set("file", file);
    } else if (documentText.trim()) {
      // Triggers the same server-side parse + extraction path as a file
      // upload, so relying purely on pasted text also fills the form.
      formData.set("text", documentText);
    }

    try {
      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const body = (await response.json()) as {
        decision?: AnalyzeApiDecision;
        error?: string;
        issues?: Array<{ path: (string | number)[]; message: string }>;
        billingUrl?: string;
      };

      if (response.status === 402) {
        setStatus("error");
        setError(body.error ?? "No credits left");
        setBillingUrl(body.billingUrl ?? "/settings/billing");
        return;
      }

      if (!response.ok || !body.decision || body.decision.status !== "completed") {
        setStatus("error");
        const baseMessage = body.decision?.error ?? body.error ?? "Analysis failed";
        const issuesSummary = body.issues?.length
          ? " — " + body.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ")
          : "";
        setError(baseMessage + issuesSummary);
        return;
      }

      const mapped = toPurchaseDecisionResult(body.decision);
      if (!mapped) {
        setStatus("error");
        setError("Analysis completed but returned no result — please try again.");
        return;
      }

      setResult(mapped);
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Network error — could not reach the analysis pipeline.");
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={resetForm}>
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
              required={!hasDocumentSource}
              value={decisionTitle}
              onChange={(event) => setDecisionTitle(event.target.value)}
              placeholder={hasDocumentSource ? "Defaults to the file name if left blank" : "New CRM subscription"}
            />
          </div>
        </CardContent>
      </Card>

      <OfferFieldset
        idPrefix="primary"
        title="Primary offer"
        value={primaryOffer}
        onChange={setPrimaryOffer}
        required={!hasDocumentSource}
      />

      {companyId && <SupplierHistoryPanel companyId={companyId} vendorName={primaryOffer.vendorName} />}

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
          required={!hasDocumentSource}
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
            <p className="text-xs text-muted-foreground">
              Uploading a document or pasting text above makes the offer fields optional — Claude reads the vendor,
              costs, and terms out of it for you.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">
          {error}
          {billingUrl && (
            <>
              {" "}
              <Link href={billingUrl} className="underline underline-offset-4">
                Upgrade your plan
              </Link>
              .
            </>
          )}
        </p>
      )}

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

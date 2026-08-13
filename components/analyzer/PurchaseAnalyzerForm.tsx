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
import { FieldHint } from "./FieldHint";
import { FileDropzone } from "./FileDropzone";
import { emptyOfferDraft, OfferFieldset, type OfferDraft } from "./OfferFieldset";
import { SupplierHistoryPanel } from "./SupplierHistoryPanel";
import {
  ResultsView,
  toPurchaseDecisionResult,
  type PurchaseDecisionResult,
  type PurchaseDecisionResultSource,
} from "@/components/results/ResultsView";
import type { AnalyzeTemplate } from "@/config/analyze-templates";

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

export function PurchaseAnalyzerForm({
  companies,
  initial,
}: {
  companies: CompanyOption[];
  /** Prefill from a dashboard empty-state template (config/analyze-templates.ts) — optional, purely a UX head start, never required. */
  initial?: AnalyzeTemplate;
}) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [decisionTitle, setDecisionTitle] = useState(initial?.decisionTitle ?? "");
  const [primaryOffer, setPrimaryOffer] = useState<OfferDraft>(emptyOfferDraft());
  const [alternativeOffers, setAlternativeOffers] = useState<OfferDraft[]>(
    initial?.addAlternativeOffer ? [emptyOfferDraft()] : [],
  );
  const [vatRateOverride, setVatRateOverride] = useState("");
  const [expectedMonthlyBenefit, setExpectedMonthlyBenefit] = useState("");
  // Deliberately NOT prefilled from initial?.notes into documentText: doing
  // so would flip hasDocumentSource to true and skip the cost-required
  // validation below for a template that only wants to show guidance text,
  // not real document content for extraction.
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
    setError(null);
    setBillingUrl(null);

    // Without a document, the offer fields are the only source of cost data
    // — an all-zero primary offer produces a technically-valid but
    // meaningless analysis (TCO of nothing). A document attachment is
    // exempt since extraction may fill real costs in server-side.
    if (!hasDocumentSource) {
      const upfront = Number(primaryOffer.upfrontCost || 0);
      const monthly = Number(primaryOffer.monthlyCost || 0);
      if (upfront === 0 && monthly === 0) {
        setStatus("error");
        setError("Ange en engångskostnad eller månadskostnad för huvudofferten, eller bifoga ett dokument/offert.");
        return;
      }
    }

    setStatus("submitting");
    setResult(null);

    // decisionTitle isn't something extraction produces (it's a label, not
    // a document fact) — so unlike the offer fields, a document attachment
    // can't fill this one in server-side. Derive a reasonable default from
    // the filename rather than blocking a PDF-only submission on it.
    const title = decisionTitle.trim() || (file ? file.name.replace(/\.[^./]+$/, "") : "Namnlöst beslut");

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
      setError("Nätverksfel — kunde inte nå analyspipelinen.");
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={resetForm}>
          ← Kör en till analys
        </Button>
        <ResultsView result={result} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Beslut</CardTitle>
          <CardDescription>KÖP, FÖRHANDLA eller AVSLÅ — baserat på verklig TCO, inte magkänsla.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {initial?.notes && (
            <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
              {initial.notes}
            </p>
          )}
          {companies.length > 1 && (
            <div className="space-y-2">
              <Label>Företag</Label>
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
            <Label htmlFor="decisionTitle">Beslutstitel</Label>
            <Input
              id="decisionTitle"
              required={!hasDocumentSource}
              value={decisionTitle}
              onChange={(event) => setDecisionTitle(event.target.value)}
              placeholder={hasDocumentSource ? "Fylls i från filnamnet om det lämnas tomt" : "Nytt CRM-abonnemang"}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Kostnader</h2>
        <OfferFieldset
          idPrefix="primary"
          title="Huvudoffert"
          value={primaryOffer}
          onChange={setPrimaryOffer}
          required={!hasDocumentSource}
        />
        {companyId && <SupplierHistoryPanel companyId={companyId} vendorName={primaryOffer.vendorName} />}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Alternativ</h2>

        {alternativeOffers.map((offer, index) => (
          <OfferFieldset
            key={index}
            idPrefix={`alt-${index}`}
            title={`Alternativ offert ${index + 1}`}
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
          Lägg till alternativ leverantör
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ytterligare information</CardTitle>
          <CardDescription>Valfritt — förbättrar noggrannheten för ROI och avtalsrisk.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="vatRateOverride">Momssats, override (%)</Label>
                <FieldHint text="Åsidosätter företagets standardmoms för just det här beslutet — lämna tomt för att använda företagsinställningen." />
              </div>
              <Input
                id="vatRateOverride"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={vatRateOverride}
                onChange={(event) => setVatRateOverride(event.target.value)}
                placeholder="Använder företagets standard"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="expectedMonthlyBenefit">Förväntad månadsnytta</Label>
                <FieldHint text="Månatlig besparing eller intäkt köpet förväntas ge — möjliggör beräkning av ROI och återbetalningstid." />
              </div>
              <Input
                id="expectedMonthlyBenefit"
                type="number"
                min={0}
                step="0.01"
                value={expectedMonthlyBenefit}
                onChange={(event) => setExpectedMonthlyBenefit(event.target.value)}
                placeholder="För ROI / återbetalningstid"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentText">Offertbeskrivning / anteckningar</Label>
            <Textarea
              id="documentText"
              rows={4}
              value={documentText}
              onChange={(event) => setDocumentText(event.target.value)}
              placeholder="Klistra in leverantörens offert, avtalsvillkor eller annan relevant kontext här"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Eller ladda upp en PDF-offert / avtal</Label>
            <FileDropzone file={file} onFileChange={setFile} />
            <p className="text-xs text-muted-foreground">
              Att ladda upp ett dokument eller klistra in text ovan gör offertfälten valfria — Claude läser
              leverantör, kostnader och villkor åt dig.
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
                Uppgradera din plan
              </Link>
              .
            </>
          )}
        </p>
      )}

      <Button type="submit" size="lg" disabled={status === "submitting" || !companyId} className="w-full sm:w-auto sm:ml-auto sm:flex">
        {status === "submitting" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyserar
          </>
        ) : (
          "Analysera"
        )}
      </Button>
    </form>
  );
}

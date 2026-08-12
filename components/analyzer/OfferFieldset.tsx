"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldHint } from "./FieldHint";

/** Controlled-input draft of a `PurchaseOffer` — numeric fields stay as
 * strings while the user is typing and are parsed on submit. */
export interface OfferDraft {
  vendorName: string;
  upfrontCost: string;
  monthlyCost: string;
  hiddenFees: string;
  contractLengthMonths: string;
  notes: string;
}

export function emptyOfferDraft(): OfferDraft {
  return { vendorName: "", upfrontCost: "", monthlyCost: "", hiddenFees: "", contractLengthMonths: "", notes: "" };
}

interface OfferFieldsetProps {
  idPrefix: string;
  title: string;
  value: OfferDraft;
  onChange: (value: OfferDraft) => void;
  onRemove?: () => void;
  /** Whether vendor/cost fields are required to submit. Set to `false` when
   * a document (PDF/pasted text) is attached, so extraction can fill these
   * in instead of the browser blocking submission on empty fields. */
  required?: boolean;
}

export function OfferFieldset({
  idPrefix,
  title,
  value,
  onChange,
  onRemove,
  required = true,
}: OfferFieldsetProps) {
  function set<K extends keyof OfferDraft>(key: K, fieldValue: OfferDraft[K]) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <X className="mr-1 h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-vendorName`}>Vendor name</Label>
          <Input
            id={`${idPrefix}-vendorName`}
            required={required}
            value={value.vendorName}
            onChange={(event) => set("vendorName", event.target.value)}
            placeholder="Acme SaaS Inc."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`${idPrefix}-upfrontCost`}>Upfront cost</Label>
              <FieldHint text="A one-time cost billed once (setup, onboarding, first-year license) — not repeated in later years." />
            </div>
            <Input
              id={`${idPrefix}-upfrontCost`}
              type="number"
              min={0}
              step="0.01"
              required={required}
              value={value.upfrontCost}
              onChange={(event) => set("upfrontCost", event.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`${idPrefix}-monthlyCost`}>Monthly cost</Label>
              <FieldHint text="The recurring subscription cost — this is what drives the 1yr/3yr TCO projection." />
            </div>
            <Input
              id={`${idPrefix}-monthlyCost`}
              type="number"
              min={0}
              step="0.01"
              required={required}
              value={value.monthlyCost}
              onChange={(event) => set("monthlyCost", event.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`${idPrefix}-hiddenFees`}>Hidden / setup fees</Label>
              <FieldHint text="Extra one-off costs not in the headline price — mandatory add-ons, integration, or onboarding fees the vendor doesn't lead with." />
            </div>
            <Input
              id={`${idPrefix}-hiddenFees`}
              type="number"
              min={0}
              step="0.01"
              value={value.hiddenFees}
              onChange={(event) => set("hiddenFees", event.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`${idPrefix}-contractLengthMonths`}>Contract length (months)</Label>
              <FieldHint text="The initial committed term. Informational only — the TCO projection assumes the subscription renews rather than stopping at the end of this term (0 = month-to-month)." />
            </div>
            <Input
              id={`${idPrefix}-contractLengthMonths`}
              type="number"
              min={0}
              step="1"
              value={value.contractLengthMonths}
              onChange={(event) => set("contractLengthMonths", event.target.value)}
              placeholder="0 = month-to-month"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-notes`}>Notes (optional)</Label>
          <Textarea
            id={`${idPrefix}-notes`}
            rows={2}
            value={value.notes}
            onChange={(event) => set("notes", event.target.value)}
            placeholder="Anything relevant Claude should know about this offer"
          />
        </div>
      </CardContent>
    </Card>
  );
}

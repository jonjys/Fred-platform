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
            Ta bort
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-vendorName`}>Leverantör</Label>
          <Input
            id={`${idPrefix}-vendorName`}
            required={required}
            value={value.vendorName}
            onChange={(event) => set("vendorName", event.target.value)}
            placeholder="Leverantör AB"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`${idPrefix}-upfrontCost`}>Engångskostnad</Label>
              <FieldHint text="En engångskostnad som betalas en gång (uppstart, onboarding, första årets licens) — återkommer inte senare år." />
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
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`${idPrefix}-monthlyCost`}>Månadskostnad</Label>
              <FieldHint text="Den återkommande prenumerationskostnaden — det här styr TCO-prognosen över 1/3 år." />
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
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`${idPrefix}-hiddenFees`}>Dolda avgifter / uppstartsavgift</Label>
              <FieldHint text="Extra engångskostnader som inte finns i huvudpriset — obligatoriska tillägg, integration eller onboarding-avgifter leverantören inte nämner först." />
            </div>
            <Input
              id={`${idPrefix}-hiddenFees`}
              type="number"
              min={0}
              step="0.01"
              value={value.hiddenFees}
              onChange={(event) => set("hiddenFees", event.target.value)}
              placeholder="0"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`${idPrefix}-contractLengthMonths`}>Avtalslängd (månader)</Label>
              <FieldHint text="Den ursprungliga bindningstiden. Enbart informativt — TCO-prognosen antar att prenumerationen förnyas istället för att upphöra vid bindningstidens slut (0 = ingen bindningstid)." />
            </div>
            <Input
              id={`${idPrefix}-contractLengthMonths`}
              type="number"
              min={0}
              step="1"
              value={value.contractLengthMonths}
              onChange={(event) => set("contractLengthMonths", event.target.value)}
              placeholder="0 = ingen bindningstid"
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-notes`}>Anteckningar (valfritt)</Label>
          <Textarea
            id={`${idPrefix}-notes`}
            rows={2}
            value={value.notes}
            onChange={(event) => set("notes", event.target.value)}
            placeholder="Allt relevant Claude bör känna till om den här offerten"
          />
        </div>
      </CardContent>
    </Card>
  );
}

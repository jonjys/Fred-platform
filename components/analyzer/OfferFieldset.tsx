"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
}

export function OfferFieldset({ idPrefix, title, value, onChange, onRemove }: OfferFieldsetProps) {
  function set<K extends keyof OfferDraft>(key: K, fieldValue: OfferDraft[K]) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <X className="mr-1 h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-vendorName`}>Vendor name</Label>
        <Input
          id={`${idPrefix}-vendorName`}
          required
          value={value.vendorName}
          onChange={(event) => set("vendorName", event.target.value)}
          placeholder="Acme SaaS Inc."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-upfrontCost`}>Upfront cost</Label>
          <Input
            id={`${idPrefix}-upfrontCost`}
            type="number"
            min={0}
            step="0.01"
            required
            value={value.upfrontCost}
            onChange={(event) => set("upfrontCost", event.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-monthlyCost`}>Monthly cost</Label>
          <Input
            id={`${idPrefix}-monthlyCost`}
            type="number"
            min={0}
            step="0.01"
            required
            value={value.monthlyCost}
            onChange={(event) => set("monthlyCost", event.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-hiddenFees`}>Hidden / setup fees</Label>
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
          <Label htmlFor={`${idPrefix}-contractLengthMonths`}>Contract length (months)</Label>
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
    </div>
  );
}

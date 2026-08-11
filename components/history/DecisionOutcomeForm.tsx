"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { DecisionRow } from "@/lib/database/repositories/decisions";

interface DecisionOutcomeFormProps {
  decision: DecisionRow;
}

interface OutcomeShape {
  satisfaction?: number | null;
  realizedCost?: number | null;
  notes?: string | null;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Lets a user go back to a completed decision and record what they actually
 * did (`final_decision`/`final_decision_notes`) and how it turned out
 * (`outcome`) — the two Decision Graph fields the AI never touches, kept
 * deliberately free-form/module-agnostic rather than tied to
 * purchase-analysis's BUY/NEGOTIATE/REJECT vocabulary.
 */
export function DecisionOutcomeForm({ decision }: DecisionOutcomeFormProps) {
  const router = useRouter();
  const existingOutcome = (decision.outcome as OutcomeShape | null) ?? null;

  const [finalDecision, setFinalDecision] = useState(decision.final_decision ?? decision.verdict_code ?? "");
  const [finalDecisionNotes, setFinalDecisionNotes] = useState(decision.final_decision_notes ?? "");
  const [satisfaction, setSatisfaction] = useState(
    existingOutcome?.satisfaction != null ? String(existingOutcome.satisfaction) : "",
  );
  const [realizedCost, setRealizedCost] = useState(
    existingOutcome?.realizedCost != null ? String(existingOutcome.realizedCost) : "",
  );
  const [outcomeNotes, setOutcomeNotes] = useState(existingOutcome?.notes ?? "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSavedAt(null);

    const hasOutcome = satisfaction.trim() !== "" || realizedCost.trim() !== "" || outcomeNotes.trim() !== "";

    const response = await fetch(`/api/decisions/${decision.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        finalDecision: finalDecision.trim() || null,
        finalDecisionNotes: finalDecisionNotes.trim() || null,
        outcome: hasOutcome
          ? {
              satisfaction: satisfaction.trim() === "" ? null : Number(satisfaction),
              realizedCost: realizedCost.trim() === "" ? null : Number(realizedCost),
              notes: outcomeNotes.trim() || null,
            }
          : null,
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
        <CardTitle>Decision &amp; outcome</CardTitle>
        <CardDescription>
          {decision.verdict_code
            ? `The AI recommended "${decision.verdict_code}" — record what you actually decided and, later, how it turned out.`
            : "Record what you actually decided and, later, how it turned out."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`finalDecision-${decision.id}`}>What did you decide?</Label>
              <Input
                id={`finalDecision-${decision.id}`}
                value={finalDecision}
                onChange={(event) => setFinalDecision(event.target.value)}
                placeholder="e.g. BUY, NEGOTIATE, REJECT, or your own words"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`finalDecisionNotes-${decision.id}`}>Notes</Label>
              <Textarea
                id={`finalDecisionNotes-${decision.id}`}
                value={finalDecisionNotes}
                onChange={(event) => setFinalDecisionNotes(event.target.value)}
                placeholder="Why — anything that diverged from the AI's recommendation, negotiated terms, etc."
              />
            </div>
            {decision.decided_at && (
              <p className="text-xs text-muted-foreground">Decided on {formatDate(decision.decided_at)}.</p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">Outcome</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`satisfaction-${decision.id}`}>Satisfaction</Label>
                <Select value={satisfaction} onValueChange={setSatisfaction}>
                  <SelectTrigger id={`satisfaction-${decision.id}`}>
                    <SelectValue placeholder="Not rated" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 — Very unsatisfied</SelectItem>
                    <SelectItem value="2">2 — Unsatisfied</SelectItem>
                    <SelectItem value="3">3 — Neutral</SelectItem>
                    <SelectItem value="4">4 — Satisfied</SelectItem>
                    <SelectItem value="5">5 — Very satisfied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`realizedCost-${decision.id}`}>Realized cost</Label>
                <Input
                  id={`realizedCost-${decision.id}`}
                  type="number"
                  step="0.01"
                  value={realizedCost}
                  onChange={(event) => setRealizedCost(event.target.value)}
                  placeholder="What it actually cost"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`outcomeNotes-${decision.id}`}>Outcome notes</Label>
              <Textarea
                id={`outcomeNotes-${decision.id}`}
                value={outcomeNotes}
                onChange={(event) => setOutcomeNotes(event.target.value)}
                placeholder="How did it actually go?"
              />
            </div>
            {decision.outcome_recorded_at && (
              <p className="text-xs text-muted-foreground">Outcome recorded on {formatDate(decision.outcome_recorded_at)}.</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
            {savedAt && <span className="text-sm text-muted-foreground">Saved.</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { History } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerdictBadge } from "@/components/results/VerdictBadge";
import type { Verdict } from "@/lib/decision-engine/types";

interface OutcomeShape {
  satisfaction?: number | null;
  realizedCost?: number | null;
  notes?: string | null;
}

interface EntityDecisionSummary {
  id: string;
  title: string;
  createdAt: string;
  verdict: Verdict | null;
  finalDecision: string | null;
  outcome: OutcomeShape | null;
}

interface EntityHistory {
  id: string;
  name: string;
  decisions: EntityDecisionSummary[];
}

/** Debounce delay between the user's last keystroke and firing the lookup —
 * short enough to feel live, long enough to not spam a request per
 * keystroke. */
const DEBOUNCE_MS = 400;

/**
 * "You've evaluated this vendor before" — live-looks-up past decisions for
 * whatever vendor name the user is typing into the primary offer, so a
 * supplier's track record (verdict, what was actually decided, how it
 * turned out) surfaces right when it's relevant: while running the next
 * analysis, not buried in History.
 */
export function SupplierHistoryPanel({ companyId, vendorName }: { companyId: string; vendorName: string }) {
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [entities, setEntities] = useState<EntityHistory[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(vendorName.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [vendorName]);

  useEffect(() => {
    if (debouncedQuery.length < 2 || !companyId) {
      setEntities([]);
      return;
    }

    const controller = new AbortController();

    fetch(`/api/entities?companyId=${encodeURIComponent(companyId)}&q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : { entities: [] }))
      .then((body: { entities?: EntityHistory[] }) => setEntities(body.entities ?? []))
      .catch((error) => {
        if (error.name !== "AbortError") setEntities([]);
      });

    return () => controller.abort();
  }, [companyId, debouncedQuery]);

  const entitiesWithHistory = entities.filter((entity) => entity.decisions.length > 0);
  if (entitiesWithHistory.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4" />
          Supplier history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entitiesWithHistory.map((entity) => (
          <div key={entity.id} className="space-y-2">
            {entitiesWithHistory.length > 1 && <p className="text-sm font-medium">{entity.name}</p>}
            <ul className="space-y-1.5">
              {entity.decisions.slice(0, 5).map((decision) => (
                <li key={decision.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/history/${decision.id}`} className="min-w-0 flex-1 truncate hover:underline">
                    {decision.title}
                  </Link>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    {new Date(decision.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
                    {decision.verdict && <VerdictBadge verdict={decision.verdict} />}
                    {decision.finalDecision && (
                      <span className="text-foreground">→ {decision.finalDecision}</span>
                    )}
                    {decision.outcome?.satisfaction != null && <span>★ {decision.outcome.satisfaction}/5</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

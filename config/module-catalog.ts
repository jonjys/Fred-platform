/**
 * UI-only catalog for the analyze page's module picker (a Client Component)
 * — deliberately has ZERO imports from lib/decision-engine or config/tools.
 * That registry pulls in real module implementations (purchase-analysis's
 * extract.ts imports lib/ai/claude.ts, which imports @anthropic-ai/sdk), so
 * importing it from client code would ship the Anthropic SDK and the rest
 * of the server-only AI layer to the browser. This file hardcodes the same
 * label/description as purchaseAnalysisModule instead — a small, worthwhile
 * duplication to keep the client bundle clean.
 *
 * A module belongs here before it has a real `DecisionModule`
 * implementation; once it's built and registered in config/tools.ts's
 * `DECISION_MODULES`, flip its `enabled` flag here to true. This never
 * merges into `DECISION_MODULES` — an entry here can't be routed to via
 * `getDecisionModule` / `/api/analyze`, so a "coming soon" module can never
 * be reached before it actually has calculation logic behind it.
 */
export interface ModuleCatalogEntry {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    key: "purchase-analysis",
    label: "AI Purchase Analyzer",
    description:
      "Analyzes a purchase decision — real 1yr/3yr cost, hidden fees, contract risk, and supplier alternatives — and recommends BUY, NEGOTIATE, or REJECT.",
    enabled: true,
  },
  {
    key: "debt-optimization",
    label: "Debt Optimization",
    description: "Should you refinance, consolidate, or pay off? (Coming soon)",
    enabled: false,
  },
  {
    key: "roi-analysis",
    label: "ROI Analysis",
    description: "Coming soon.",
    enabled: false,
  },
];

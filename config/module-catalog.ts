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
  /** Dedicated page route for modules that get one beyond the shared
   * /analyze form (e.g. debt-optimization's own dashboard). Undefined for
   * modules that only ever render inside the analyze picker. */
  route?: string;
  /** Always null in this file — kept only as a visible "not wired up yet"
   * marker next to `enabled`. Never a real engine reference: this file has
   * zero imports from lib/decision-engine (see file header), and that must
   * stay true even for disabled entries. */
  engine?: null;
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    key: "purchase-analysis",
    label: "Inköpsanalys",
    description:
      "Analyserar ett inköpsbeslut — verklig kostnad över 1/3 år, dolda avgifter, avtalsrisk och leverantörsalternativ — och rekommenderar KÖP, FÖRHANDLA eller AVSLÅ.",
    enabled: true,
  },
  {
    // Kommer från debt-optimizer-standalone när P0-buggar är gröna.
    // Flip `enabled` to true (and wire the real engine into config/tools.ts)
    // once that repo reports all 5 P0 bugs fixed.
    key: "debt-optimization",
    label: "Skuldoptimering",
    description: "Ska du refinansiera, konsolidera eller lösa lånet? (Kommer snart)",
    enabled: false,
    route: "/dashboard/debt",
    engine: null,
  },
  {
    key: "roi-analysis",
    label: "ROI-analys",
    description: "Kommer snart.",
    enabled: false,
  },
];

/** Look up a single catalog entry by key — e.g.
 * `getModuleCatalogEntry("debt-optimization")?.enabled` to gate a nav link
 * or page on a module's rollout state. */
export function getModuleCatalogEntry(key: string): ModuleCatalogEntry | undefined {
  return MODULE_CATALOG.find((entry) => entry.key === key);
}

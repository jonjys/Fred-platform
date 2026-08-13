import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static-source guard for the results/analyzer components that were still
 * English UI text before this pass. Reads each file's raw source and checks
 * for the exact old English JSX-text phrases (multi-word, so they can't
 * collide with an identifier or import) and the new Swedish replacements —
 * cheaper and more robust here than a full jsdom render, since several of
 * these are Server/Client component mixes vitest isn't set up to render.
 */
function read(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "..", relativePath), "utf-8");
}

describe("no leftover English UI copy in the translated components", () => {
  it("ResultsView.tsx uses Swedish section headings", () => {
    const source = read("components/results/ResultsView.tsx");
    expect(source).not.toContain("Financial breakdown");
    expect(source).not.toContain(">Summary<");
    expect(source).not.toContain("Contract &amp; vendor risks");
    expect(source).not.toContain("Negotiation action plan");
    expect(source).toContain("Sammanfattning");
    expect(source).toContain("Rekommendation");
  });

  it("DebtOptimizerForm.tsx is Swedish (code comments may stay English)", () => {
    const source = read("components/analyzer/DebtOptimizerForm.tsx");
    expect(source).not.toContain("Debt Optimization — Coming soon");
    expect(source).not.toContain("Should you refinance, consolidate, or pay off?");
    expect(source).toContain("Skuldoptimering — Kommer snart");
  });

  it("SupplierHistoryPanel.tsx is Swedish", () => {
    const source = read("components/analyzer/SupplierHistoryPanel.tsx");
    expect(source).not.toContain("Supplier history");
    expect(source).toContain("Leverantörshistorik");
  });

  it("FileDropzone.tsx is Swedish", () => {
    const source = read("components/analyzer/FileDropzone.tsx");
    expect(source).not.toContain("Drop a PDF quote or contract here");
    expect(source).not.toContain('aria-label="Remove file"');
    expect(source).toContain("Släpp filer här");
    expect(source).toContain("ladda upp");
  });

  it("verdict.ts labels (KÖP/FÖRHANDLA/AVSTÅ) are Swedish while codes stay stable", () => {
    const source = read("lib/decision-engine/modules/purchase-analysis/verdict.ts");
    expect(source).toContain('code: "BUY"');
    expect(source).toContain('code: "NEGOTIATE"');
    expect(source).toContain('code: "REJECT"');
    expect(source).toContain('label: "Köp"');
    expect(source).toContain('label: "Förhandla"');
    expect(source).toContain('label: "Avstå"');
  });

  it("the results breakdown components (FinancialMetricsBreakdown, RiskCards, NegotiationActionPlan) are Swedish", () => {
    const financial = read("components/results/FinancialMetricsBreakdown.tsx");
    expect(financial).not.toContain("Year 1 total");
    expect(financial).not.toContain("3-year TCO");
    expect(financial).toContain("Inom budget");

    const risks = read("components/results/RiskCards.tsx");
    expect(risks).not.toContain("No significant risks were identified.");
    expect(risks).toContain("Inga betydande risker identifierades.");

    const actions = read("components/results/NegotiationActionPlan.tsx");
    expect(actions).not.toContain("No specific action points were generated.");
    expect(actions).toContain("Möjlig påverkan");
  });
});

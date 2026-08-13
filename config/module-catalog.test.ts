import { describe, expect, it } from "vitest";
import { MODULE_CATALOG } from "./module-catalog";

describe("MODULE_CATALOG", () => {
  it("contains a debt-optimization entry, disabled until the standalone engine ships", () => {
    const entry = MODULE_CATALOG.find((module) => module.key === "debt-optimization");

    expect(entry).toBeDefined();
    expect(entry?.enabled).toBe(false);
  });

  it("contains the enabled purchase-analysis entry", () => {
    const entry = MODULE_CATALOG.find((module) => module.key === "purchase-analysis");

    expect(entry).toBeDefined();
    expect(entry?.enabled).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { getModuleCatalogEntry, MODULE_CATALOG } from "./module-catalog";

describe("MODULE_CATALOG", () => {
  it("contains a debt-optimization entry, disabled until the standalone engine ships", () => {
    const entry = MODULE_CATALOG.find((module) => module.key === "debt-optimization");

    expect(entry).toBeDefined();
    expect(entry?.enabled).toBe(false);
    expect(entry?.route).toBe("/dashboard/debt");
    expect(entry?.engine).toBeNull();
  });

  it("contains the enabled purchase-analysis entry", () => {
    const entry = MODULE_CATALOG.find((module) => module.key === "purchase-analysis");

    expect(entry).toBeDefined();
    expect(entry?.enabled).toBe(true);
  });
});

describe("getModuleCatalogEntry", () => {
  it("finds an entry by key", () => {
    expect(getModuleCatalogEntry("debt-optimization")?.label).toBe("Skuldoptimering");
  });

  it("returns undefined for an unknown key", () => {
    expect(getModuleCatalogEntry("does-not-exist")).toBeUndefined();
  });
});

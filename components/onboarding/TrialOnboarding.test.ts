import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bannerDismissedKey, modalKey } from "./TrialOnboarding";

describe("localStorage key helpers", () => {
  it("scope the modal-shown key per user", () => {
    expect(modalKey("user-a")).toBe("fred:onboarding-modal:user-a");
    expect(modalKey("user-b")).toBe("fred:onboarding-modal:user-b");
    expect(modalKey("user-a")).not.toBe(modalKey("user-b"));
  });

  it("scope the banner-dismissed key per user, distinct from the modal key", () => {
    expect(bannerDismissedKey("user-a")).toBe("fred:onboarding-banner-dismissed:user-a");
    expect(bannerDismissedKey("user-a")).not.toBe(modalKey("user-a"));
  });
});

/**
 * Static-source guard for the rest of the component's contract — this repo
 * has no jsdom/React-Testing-Library setup to actually mount and interact
 * with it (see components/i18n.test.ts for the same rationale). Checks the
 * behaviors that matter: three-step copy, module cards driven by the real
 * MODULE_CATALOG (never a hardcoded/duplicated list that could drift), and
 * that a disabled catalog entry can't be selected.
 */
function read(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf-8");
}

describe("TrialOnboarding.tsx contract", () => {
  const source = read("components/onboarding/TrialOnboarding.tsx");

  it("is a client component", () => {
    expect(source).toMatch(/^"use client";/);
  });

  it("shows all three steps' copy", () => {
    expect(source).toContain("Välkommen till FRED");
    expect(source).toContain("gratis analyser");
    expect(source).toContain("Välj din första analys");
  });

  it("drives the module picker from the real MODULE_CATALOG, not a hardcoded list", () => {
    expect(source).toContain('from "@/config/module-catalog"');
    expect(source).toContain("MODULE_CATALOG.map");
  });

  it("refuses to select a disabled module", () => {
    expect(source).toContain("if (!entry.enabled) return;");
  });

  it("persists modal-shown state before navigating away, so it can't reappear on the next page", () => {
    expect(source).toContain("window.localStorage.setItem(modalKey(userId)");
  });
});

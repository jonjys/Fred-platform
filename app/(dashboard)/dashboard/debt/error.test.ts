import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static-source guard for the /dashboard/debt error boundary — same
 * rationale as components/i18n.test.ts: Next.js error.tsx is a framework-
 * invoked client boundary, not something callable directly, and this repo
 * has no jsdom/React-Testing-Library setup to render it. Checks the
 * contract that actually matters: it's a client component with a default
 * export, shows the expected Swedish copy, and links back to /analyze so a
 * user isn't stuck on a dead page while the engine throws.
 */
function read(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "..", "..", "..", "..", relativePath), "utf-8");
}

describe("app/(dashboard)/dashboard/debt/error.tsx", () => {
  const source = read("app/(dashboard)/dashboard/debt/error.tsx");

  it("is a client component (error boundaries must be)", () => {
    expect(source).toMatch(/^"use client";/);
  });

  it("has a default export function", () => {
    expect(source).toMatch(/export default function/);
  });

  it("shows the expected Swedish fallback copy", () => {
    expect(source).toContain("Skuldoptimering är tillfälligt nere");
    expect(source).toContain("Prova");
  });

  it("links back to /analyze so the user isn't stuck", () => {
    expect(source).toContain('href="/analyze"');
  });

  it("calls reset() from a retry action, per the error boundary contract", () => {
    expect(source).toContain("reset");
  });
});

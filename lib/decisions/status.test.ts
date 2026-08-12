import { describe, expect, it } from "vitest";
import { isStalledProcessing } from "./status";

const NOW = new Date("2026-08-12T12:00:00.000Z");

describe("isStalledProcessing", () => {
  it("is false for a processing decision created moments ago", () => {
    expect(isStalledProcessing({ status: "processing", created_at: "2026-08-12T11:59:50.000Z" }, NOW)).toBe(false);
  });

  it("is true once a processing decision has been running past the threshold", () => {
    expect(isStalledProcessing({ status: "processing", created_at: "2026-08-12T11:58:00.000Z" }, NOW)).toBe(true);
  });

  it("is false for completed/failed decisions regardless of age", () => {
    expect(isStalledProcessing({ status: "completed", created_at: "2026-08-01T00:00:00.000Z" }, NOW)).toBe(false);
    expect(isStalledProcessing({ status: "failed", created_at: "2026-08-01T00:00:00.000Z" }, NOW)).toBe(false);
  });

  it("also applies to a stale draft", () => {
    expect(isStalledProcessing({ status: "draft", created_at: "2026-08-12T11:58:00.000Z" }, NOW)).toBe(true);
  });
});

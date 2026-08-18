import { beforeEach, describe, expect, it } from "vitest";
import { getCoreApp, getCoreApps, sanitizePublicUrl, FALLBACK_URL_BY_ID } from "./registry";

const ENV_VARS = [
  "NEXT_PUBLIC_SNABBFAKTURA_URL",
  "NEXT_PUBLIC_FREDRADAR_URL",
  "NEXT_PUBLIC_FREDCAST_URL",
  "NEXT_PUBLIC_DEBT_OPTIMIZER_URL",
  "NEXT_PUBLIC_GATEZERO_URL",
  "NEXT_PUBLIC_PROMPTSLAKTAREN_URL",
] as const;

beforeEach(() => {
  for (const key of ENV_VARS) delete process.env[key];
});

describe("sanitizePublicUrl", () => {
  it("trims spaces and strips comments", () => {
    expect(sanitizePublicUrl("  https://gatekeeper-beta-three.vercel.app  # junk")).toBe(
      "https://gatekeeper-beta-three.vercel.app",
    );
  });

  it("rejects leftover %20 garbage", () => {
    expect(sanitizePublicUrl("https://gatekeeper-beta-three.vercel.app%20")).toBe(
      "https://gatekeeper-beta-three.vercel.app",
    );
  });

  it("returns undefined for empty or non-http values", () => {
    expect(sanitizePublicUrl("")).toBeUndefined();
    expect(sanitizePublicUrl("not-a-url")).toBeUndefined();
  });
});

describe("getCoreApps", () => {
  it("returns all six registered apps", () => {
    expect(getCoreApps().map((a) => a.id).sort()).toEqual(
      ["cast", "debt-optimizer", "gatezero", "invoice", "promptslaktaren", "radar"].sort(),
    );
  });

  it("falls back to a clean URL when the env var is not set", () => {
    const radar = getCoreApps().find((a) => a.id === "radar");
    expect(radar?.url).toBe(FALLBACK_URL_BY_ID.radar);
    const gate = getCoreApps().find((a) => a.id === "gatezero");
    expect(gate?.url).toBe("https://gatekeeper-beta-three.vercel.app");
  });

  it("resolves each app's url from its own env var", () => {
    process.env.NEXT_PUBLIC_FREDRADAR_URL = "https://fred-radar.vercel.app";
    process.env.NEXT_PUBLIC_FREDCAST_URL = "https://fred-cast.vercel.app";

    const apps = getCoreApps();
    expect(apps.find((a) => a.id === "radar")?.url).toBe("https://fred-radar.vercel.app");
    expect(apps.find((a) => a.id === "cast")?.url).toBe("https://fred-cast.vercel.app");
  });

  it("ignores dirty env vars and uses the fallback instead", () => {
    process.env.NEXT_PUBLIC_GATEZERO_URL = "https://gatekeeper-beta-three.vercel.app%20 // comment";
    const gate = getCoreApps().find((a) => a.id === "gatezero");
    expect(gate?.url).toBe("https://gatekeeper-beta-three.vercel.app");
    expect(gate?.url).not.toContain("%20");
    expect(gate?.url).not.toContain(" ");
  });

  it("categorizes business vs infra apps correctly", () => {
    const apps = getCoreApps();
    expect(apps.find((a) => a.id === "invoice")?.category).toBe("BUSINESS");
    expect(apps.find((a) => a.id === "gatezero")?.category).toBe("INFRA");
    expect(apps.find((a) => a.id === "promptslaktaren")?.category).toBe("INFRA");
  });
});

describe("getCoreApp", () => {
  it("returns the matching entry by id", () => {
    expect(getCoreApp("cast")?.name).toBe("FredCast");
  });

  it("returns undefined for an unknown id", () => {
    expect(getCoreApp("does-not-exist")).toBeUndefined();
  });
});

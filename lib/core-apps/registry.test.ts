import { beforeEach, describe, expect, it } from "vitest";
import { getCoreApp, getCoreApps } from "./registry";

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

describe("getCoreApps", () => {
  it("returns all six registered apps", () => {
    expect(getCoreApps().map((a) => a.id).sort()).toEqual(
      ["cast", "debt-optimizer", "gatezero", "invoice", "promptslaktaren", "radar"].sort(),
    );
  });

  it("leaves url undefined when the app's env var is not set", () => {
    const radar = getCoreApps().find((a) => a.id === "radar");
    expect(radar?.url).toBeUndefined();
  });

  it("resolves each app's url from its own env var", () => {
    process.env.NEXT_PUBLIC_FREDRADAR_URL = "https://fred-radar.vercel.app";
    process.env.NEXT_PUBLIC_FREDCAST_URL = "https://fred-cast.vercel.app";

    const apps = getCoreApps();
    expect(apps.find((a) => a.id === "radar")?.url).toBe("https://fred-radar.vercel.app");
    expect(apps.find((a) => a.id === "cast")?.url).toBe("https://fred-cast.vercel.app");
    expect(apps.find((a) => a.id === "gatezero")?.url).toBeUndefined();
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

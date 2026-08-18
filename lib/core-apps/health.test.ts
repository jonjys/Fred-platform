import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAppHealthy } from "./health";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
});

describe("isAppHealthy", () => {
  it("returns false without calling fetch when the app has no url", async () => {
    const healthy = await isAppHealthy({ healthPath: "/api/health" });

    expect(healthy).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns true when the health endpoint responds ok", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));

    const healthy = await isAppHealthy({ url: "https://fred-radar.vercel.app", healthPath: "/api/health" });

    expect(healthy).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://fred-radar.vercel.app/api/health",
      expect.objectContaining({ headers: { "x-fred-core-embed": "true" } }),
    );
  });

  it("returns false when the health endpoint responds with a non-ok status", async () => {
    mockFetch.mockResolvedValue(new Response("error", { status: 500 }));

    const healthy = await isAppHealthy({ url: "https://fred-radar.vercel.app", healthPath: "/api/health" });

    expect(healthy).toBe(false);
  });

  it("returns false rather than throwing when the fetch itself fails", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));

    const healthy = await isAppHealthy({ url: "https://fred-radar.vercel.app", healthPath: "/api/health" });

    expect(healthy).toBe(false);
  });
});

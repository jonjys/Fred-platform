import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetModuleCatalogEntry = vi.fn();

vi.mock("@/config/module-catalog", () => ({
  getModuleCatalogEntry: (...args: unknown[]) => mockGetModuleCatalogEntry(...args),
}));

const { POST } = await import("./route");

function request(body: unknown) {
  return new Request("http://localhost/api/debt/analyze", { method: "POST", body: JSON.stringify(body) });
}

const VALID_INPUT = {
  loans: [
    {
      id: "loan-1",
      name: "Billån",
      balance: 100000,
      interestRate: 0.05,
      minPayment: 2000,
      originalEndDate: "2028-01-01",
      newEndDate: "2027-06-01",
      originalTotalInterest: 12000,
      newTotalInterest: 9000,
      monthsSaved: 7,
    },
  ],
  strategy: "avalanche" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/debt/analyze", () => {
  it("returns 503 when the debt-optimization module is disabled", async () => {
    mockGetModuleCatalogEntry.mockReturnValue({ key: "debt-optimization", enabled: false });

    const response = await POST(request(VALID_INPUT));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Modul Skuldoptimering är inte aktiverad än");
  });

  it("returns 503 when the module entry doesn't exist at all", async () => {
    mockGetModuleCatalogEntry.mockReturnValue(undefined);

    const response = await POST(request(VALID_INPUT));

    expect(response.status).toBe(503);
  });

  it("returns 400 for invalid input, even when enabled", async () => {
    mockGetModuleCatalogEntry.mockReturnValue({ key: "debt-optimization", enabled: true });

    const response = await POST(request({ loans: "not-an-array", strategy: "avalanche" }));

    expect(response.status).toBe(400);
  });

  it("returns 501 once enabled, since the engine still throws not-implemented", async () => {
    mockGetModuleCatalogEntry.mockReturnValue({ key: "debt-optimization", enabled: true });

    const response = await POST(request(VALID_INPUT));
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.error).toMatch(/not implemented/i);
  });
});

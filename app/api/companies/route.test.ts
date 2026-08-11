import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockListCompaniesForUser = vi.fn();
const mockCreateCompany = vi.fn();

vi.mock("@/lib/database/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/database/repositories/companies", () => ({
  listCompaniesForUser: (...args: unknown[]) => mockListCompaniesForUser(...args),
  createCompany: (...args: unknown[]) => mockCreateCompany(...args),
}));

const { GET, POST } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/companies", { method: "POST", body: JSON.stringify(body) });
}

describe("GET /api/companies", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockListCompaniesForUser).not.toHaveBeenCalled();
  });

  it("returns the signed-in user's companies", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockListCompaniesForUser.mockResolvedValue([{ id: "c1", company_name: "Acme" }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.companies).toHaveLength(1);
    expect(mockListCompaniesForUser).toHaveBeenCalledWith(expect.anything(), "user-1");
  });
});

describe("POST /api/companies", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(jsonRequest({ companyName: "Acme" }));

    expect(response.status).toBe(401);
    expect(mockCreateCompany).not.toHaveBeenCalled();
  });

  it("returns 400 for a blank company name", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    const response = await POST(jsonRequest({ companyName: "" }));

    expect(response.status).toBe(400);
    expect(mockCreateCompany).not.toHaveBeenCalled();
  });

  it("creates a company with an uppercased currency and default VAT rate", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockCreateCompany.mockResolvedValue({ id: "c1", company_name: "Acme" });

    const response = await POST(jsonRequest({ companyName: "Acme", currency: "eur" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.company).toEqual({ id: "c1", company_name: "Acme" });
    expect(mockCreateCompany).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ user_id: "user-1", currency: "EUR", vat_rate: 0 }),
    );
  });
});

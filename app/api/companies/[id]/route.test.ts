import { beforeEach, describe, expect, it, vi } from "vitest";

const VALID_ID = "11111111-1111-1111-1111-111111111111";

const mockGetUser = vi.fn();
const mockGetCompanyById = vi.fn();
const mockUpdateCompany = vi.fn();

vi.mock("@/lib/database/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/database/repositories/companies", () => ({
  getCompanyById: (...args: unknown[]) => mockGetCompanyById(...args),
  updateCompany: (...args: unknown[]) => mockUpdateCompany(...args),
}));

const { GET, PATCH } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/companies/:id", () => {
  it("returns 400 for a non-uuid id", async () => {
    const response = await GET(new Request("http://localhost"), context("not-a-uuid"));
    expect(response.status).toBe(400);
  });

  it("returns 404 when RLS/ownership excludes the company", async () => {
    mockGetCompanyById.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), context(VALID_ID));

    expect(response.status).toBe(404);
  });

  it("returns the company when found", async () => {
    mockGetCompanyById.mockResolvedValue({ id: VALID_ID, company_name: "Acme" });

    const response = await GET(new Request("http://localhost"), context(VALID_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.company.company_name).toBe("Acme");
  });
});

describe("PATCH /api/companies/:id", () => {
  function patchRequest(body: unknown) {
    return new Request("http://localhost", { method: "PATCH", body: JSON.stringify(body) });
  }

  it("returns 404 before validating the body when the company isn't found", async () => {
    mockGetCompanyById.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ companyName: "New name" }), context(VALID_ID));

    expect(response.status).toBe(404);
    expect(mockUpdateCompany).not.toHaveBeenCalled();
  });

  it("returns 400 for an out-of-range VAT rate", async () => {
    mockGetCompanyById.mockResolvedValue({ id: VALID_ID, company_name: "Acme" });

    const response = await PATCH(patchRequest({ vatRate: 1.5 }), context(VALID_ID));

    expect(response.status).toBe(400);
    expect(mockUpdateCompany).not.toHaveBeenCalled();
  });

  it("clears the budget by storing {} rather than SQL null (budget column is NOT NULL)", async () => {
    mockGetCompanyById.mockResolvedValue({ id: VALID_ID, company_name: "Acme" });
    mockUpdateCompany.mockResolvedValue({ id: VALID_ID, company_name: "Acme" });

    const response = await PATCH(patchRequest({ budget: null }), context(VALID_ID));

    expect(response.status).toBe(200);
    expect(mockUpdateCompany).toHaveBeenCalledWith(expect.anything(), VALID_ID, { budget: {} });
  });

  it("only forwards fields that were actually provided", async () => {
    mockGetCompanyById.mockResolvedValue({ id: VALID_ID, company_name: "Acme" });
    mockUpdateCompany.mockResolvedValue({ id: VALID_ID, company_name: "New name" });

    await PATCH(patchRequest({ companyName: "New name" }), context(VALID_ID));

    expect(mockUpdateCompany).toHaveBeenCalledWith(expect.anything(), VALID_ID, { company_name: "New name" });
  });
});

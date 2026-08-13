import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockGetOrCreateProfile = vi.fn();
const mockGetBillingDetails = vi.fn();

vi.mock("@/lib/database/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/database/repositories/profiles", () => ({
  getOrCreateProfile: (...args: unknown[]) => mockGetOrCreateProfile(...args),
}));

vi.mock("@/lib/billing/stripeDetails", () => ({
  getBillingDetails: (...args: unknown[]) => mockGetBillingDetails(...args),
}));

const { GET } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/stripe/invoices", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockGetBillingDetails).not.toHaveBeenCalled();
  });

  it("returns an empty list when the caller has no Stripe customer yet", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ stripe_customer_id: null });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invoices).toEqual([]);
    expect(mockGetBillingDetails).not.toHaveBeenCalled();
  });

  it("fetches invoices scoped to the caller's own stripe_customer_id — never a client-supplied one", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ stripe_customer_id: "cus_owned_by_user_1" });
    mockGetBillingDetails.mockResolvedValue({ paymentMethod: null, subscription: null, invoices: [{ id: "in_1" }] });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetBillingDetails).toHaveBeenCalledWith("cus_owned_by_user_1");
    expect(body.invoices).toEqual([{ id: "in_1" }]);
  });

  it("returns 502 when the Stripe call fails, rather than leaking the raw error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ stripe_customer_id: "cus_1" });
    mockGetBillingDetails.mockRejectedValue(new Error("Stripe API is down"));

    const response = await GET();

    expect(response.status).toBe(502);
  });
});

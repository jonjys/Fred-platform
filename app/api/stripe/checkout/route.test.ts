import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockGetOrCreateProfile = vi.fn();
const mockSessionsCreate = vi.fn();

vi.mock("@/lib/database/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/database/repositories/profiles", () => ({
  getOrCreateProfile: (...args: unknown[]) => mockGetOrCreateProfile(...args),
}));

vi.mock("@/lib/billing/stripe", () => ({
  getStripeClient: () => ({
    checkout: { sessions: { create: mockSessionsCreate } },
  }),
}));

const { POST } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.STRIPE_PRICE_ID;
});

function request() {
  return new Request("http://localhost/api/stripe/checkout", { method: "POST" });
}

describe("POST /api/stripe/checkout", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it("uses 990 SEK (99000 öre) as the checkout unit amount", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "cfo@example.se" } }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ stripe_customer_id: null });
    mockSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session-1" });

    await POST(request());

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 99000, currency: "sek" }),
          }),
        ],
      }),
    );
  });

  it("creates the checkout session with Swedish locale", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "cfo@example.se" } }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ stripe_customer_id: null });
    mockSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session-1" });

    await POST(request());

    expect(mockSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ locale: "sv" }));
  });
});

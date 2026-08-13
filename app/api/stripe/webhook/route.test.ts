import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockConstructEvent = vi.fn();
const mockSetProfileSubscriptionActive = vi.fn();
const mockSetProfileSubscriptionCanceled = vi.fn();

vi.mock("@/lib/database/repositories/profiles", () => ({
  setProfileSubscriptionActive: (...args: unknown[]) => mockSetProfileSubscriptionActive(...args),
  setProfileSubscriptionCanceled: (...args: unknown[]) => mockSetProfileSubscriptionCanceled(...args),
}));

vi.mock("@/lib/database/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => ({}),
}));

vi.mock("@/lib/billing/stripe", () => ({
  getStripeClient: () => ({ webhooks: { constructEvent: mockConstructEvent } }),
}));

const { POST } = await import("./route");

const ORIGINAL_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

afterEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_SECRET;
});

function request({ signature, body = "{}" }: { signature?: string; body?: string }) {
  const headers = new Headers();
  if (signature) headers.set("stripe-signature", signature);
  return new Request("http://localhost/api/stripe/webhook", { method: "POST", headers, body });
}

describe("POST /api/stripe/webhook", () => {
  it("rejects requests with no stripe-signature header (400)", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(400);
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid signature (400)", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("signature mismatch");
    });

    const response = await POST(request({ signature: "bad-signature" }));

    expect(response.status).toBe(400);
  });

  it("throws when STRIPE_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    await expect(POST(request({ signature: "sig" }))).rejects.toThrow();
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("accepts a validly signed event and processes it", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { customer: "cus_1", client_reference_id: "user-1" } },
    });

    const response = await POST(request({ signature: "good-signature" }));

    expect(response.status).toBe(200);
    expect(mockSetProfileSubscriptionActive).toHaveBeenCalled();
  });
});

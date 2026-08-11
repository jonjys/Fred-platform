import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockGetOrCreateProfile = vi.fn();
const mockDecrementTrialCredit = vi.fn();
const mockConsumeMonthlyAnalysis = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/database/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/database/repositories/profiles", () => ({
  getOrCreateProfile: (...args: unknown[]) => mockGetOrCreateProfile(...args),
  decrementTrialCredit: (...args: unknown[]) => mockDecrementTrialCredit(...args),
  consumeMonthlyAnalysis: (...args: unknown[]) => mockConsumeMonthlyAnalysis(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

const { POST } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mockCheckRateLimit.mockResolvedValue(true);
});

function postRequest() {
  // The gate checks under test all return before the route ever reads the
  // request body, so an empty POST is enough to exercise them.
  return new Request("http://localhost/api/analyze", { method: "POST" });
}

/** For the two tests that intentionally pass every gate: the route reads
 * `request.formData()` right after, which throws on a bodyless request, so
 * these need a (valid multipart, if empty) body instead of `postRequest()`. */
function postRequestPastGates() {
  return new Request("http://localhost/api/analyze", { method: "POST", body: new FormData() });
}

describe("POST /api/analyze — pre-pipeline gates", () => {
  it("returns 401 when unauthenticated, before checking rate limit or usage", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(postRequest());

    expect(response.status).toBe(401);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("returns 429 when the per-user rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    const response = await POST(postRequest());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toMatch(/too many requests/i);
    expect(mockGetOrCreateProfile).not.toHaveBeenCalled();
  });

  it("returns 402 with a billing link when a trial user has no credits left", async () => {
    mockGetOrCreateProfile.mockResolvedValue({ subscription_status: "trial", trial_credits: 0 });

    const response = await POST(postRequest());
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(body.billingUrl).toBe("/settings/billing");
  });

  it("allows a trial user with remaining credits past the gate (fails later for an unrelated reason)", async () => {
    mockGetOrCreateProfile.mockResolvedValue({ subscription_status: "trial", trial_credits: 3 });

    const response = await POST(postRequestPastGates());

    // No credits/rate-limit gate should fire; it should fail downstream
    // (invalid form data) rather than with a 402/429.
    expect(response.status).not.toBe(402);
    expect(response.status).not.toBe(429);
  });

  it("returns 402 when an active Pro subscriber has hit the monthly cap", async () => {
    const firstOfThisMonth = new Date();
    firstOfThisMonth.setUTCDate(1);

    mockGetOrCreateProfile.mockResolvedValue({
      subscription_status: "active",
      monthly_analyses_used: 50,
      monthly_period_start: firstOfThisMonth.toISOString(),
    });

    const response = await POST(postRequest());
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(body.error).toMatch(/monthly limit reached/i);
  });

  it("does not cap an active Pro subscriber whose usage is from a previous month", async () => {
    mockGetOrCreateProfile.mockResolvedValue({
      subscription_status: "active",
      monthly_analyses_used: 50,
      monthly_period_start: "2020-01-01T00:00:00.000Z",
    });

    const response = await POST(postRequestPastGates());

    expect(response.status).not.toBe(402);
  });
});

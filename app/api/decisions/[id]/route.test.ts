import { beforeEach, describe, expect, it, vi } from "vitest";

const VALID_ID = "22222222-2222-2222-2222-222222222222";

const mockGetUser = vi.fn();
const mockGetDecisionById = vi.fn();
const mockUpdateDecision = vi.fn();

vi.mock("@/lib/database/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/database/repositories/decisions", () => ({
  getDecisionById: (...args: unknown[]) => mockGetDecisionById(...args),
  updateDecision: (...args: unknown[]) => mockUpdateDecision(...args),
}));

const { GET, PATCH } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost", { method: "PATCH", body: JSON.stringify(body) });
}

describe("GET /api/decisions/:id", () => {
  it("returns 404 when RLS/ownership excludes the decision (not a bare null bug)", async () => {
    mockGetDecisionById.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), context(VALID_ID));

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/decisions/:id — record final_decision + outcome", () => {
  it("returns 404 before touching the body when the decision isn't found", async () => {
    mockGetDecisionById.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ finalDecision: "BUY" }), context(VALID_ID));

    expect(response.status).toBe(404);
    expect(mockUpdateDecision).not.toHaveBeenCalled();
  });

  it("stamps decided_at when finalDecision is set", async () => {
    mockGetDecisionById.mockResolvedValue({ id: VALID_ID });
    mockUpdateDecision.mockResolvedValue({ id: VALID_ID, final_decision: "BUY" });

    await PATCH(patchRequest({ finalDecision: "BUY" }), context(VALID_ID));

    const [, , update] = mockUpdateDecision.mock.calls[0]!;
    expect(update.final_decision).toBe("BUY");
    expect(update.decided_at).not.toBeNull();
  });

  it("clears decided_at when finalDecision is explicitly cleared", async () => {
    mockGetDecisionById.mockResolvedValue({ id: VALID_ID });
    mockUpdateDecision.mockResolvedValue({ id: VALID_ID });

    await PATCH(patchRequest({ finalDecision: null }), context(VALID_ID));

    expect(mockUpdateDecision).toHaveBeenCalledWith(
      expect.anything(),
      VALID_ID,
      expect.objectContaining({ final_decision: null, decided_at: null }),
    );
  });

  it("stamps outcome_recorded_at when an outcome is provided, and rejects an out-of-range satisfaction", async () => {
    mockGetDecisionById.mockResolvedValue({ id: VALID_ID });

    const badResponse = await PATCH(patchRequest({ outcome: { satisfaction: 9 } }), context(VALID_ID));
    expect(badResponse.status).toBe(400);
    expect(mockUpdateDecision).not.toHaveBeenCalled();

    mockUpdateDecision.mockResolvedValue({ id: VALID_ID });
    await PATCH(patchRequest({ outcome: { satisfaction: 4 } }), context(VALID_ID));

    const [, , update] = mockUpdateDecision.mock.calls[0]!;
    expect(update.outcome).toEqual({ satisfaction: 4 });
    expect(update.outcome_recorded_at).not.toBeNull();
  });

  it("leaves fields the caller didn't mention untouched", async () => {
    mockGetDecisionById.mockResolvedValue({ id: VALID_ID });
    mockUpdateDecision.mockResolvedValue({ id: VALID_ID });

    await PATCH(patchRequest({ finalDecisionNotes: "Negotiated a lower rate" }), context(VALID_ID));

    const [, , update] = mockUpdateDecision.mock.calls[0]!;
    expect(update).toEqual({ final_decision_notes: "Negotiated a lower rate" });
  });
});

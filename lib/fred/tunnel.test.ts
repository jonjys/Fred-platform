import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/database/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getSession: mockGetSession },
    from: mockFrom,
  }),
}));

const { createAtom, getPendingTunnels } = await import("./tunnel");

function insertChain(result: { data: unknown; error: unknown }) {
  return { insert: () => ({ select: () => ({ single: async () => result }) }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAtom", () => {
  it("refuses to write without an authenticated session — never accepts a caller-supplied user id", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(createAtom("bankid", "payment_shield", { amount: 100 })).rejects.toThrow(/no authenticated session/i);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("inserts the atom with user_id from the session, not from any argument", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "user-123" } } } });

    const insertSpy = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: "atom-1" }, error: null }) }) }));
    const eqSpy = vi.fn(async () => ({ data: [] }));

    mockFrom.mockImplementation((table: string) => {
      if (table === "atoms") return { insert: insertSpy };
      if (table === "devices") return { select: () => ({ eq: eqSpy }) };
      throw new Error(`unexpected table ${table}`);
    });

    const atom = await createAtom("bankid", "payment_shield", { amount: 100 });

    expect(atom).toEqual({ id: "atom-1" });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-123", source: "bankid", type: "payment_shield" }),
    );
  });

  it("fans the atom out to tunnels for every device the session's user owns", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "user-123" } } } });

    const tunnelInsertSpy = vi.fn(async () => ({ error: null }));
    mockFrom.mockImplementation((table: string) => {
      if (table === "atoms") return insertChain({ data: { id: "atom-1" }, error: null });
      if (table === "devices") return { select: () => ({ eq: async () => ({ data: [{ id: "d1" }, { id: "d2" }] }) }) };
      if (table === "tunnels") return { insert: tunnelInsertSpy };
      throw new Error(`unexpected table ${table}`);
    });

    await createAtom("capcut", "video", { url: "https://youtu.be/x" });

    expect(tunnelInsertSpy).toHaveBeenCalledWith([
      { atom_id: "atom-1", device_id: "d1" },
      { atom_id: "atom-1", device_id: "d2" },
    ]);
  });
});

describe("getPendingTunnels", () => {
  it("returns an empty array rather than null when there is no data", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "user-123" } } } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: async () => ({ data: null }),
          }),
        }),
      }),
    });

    expect(await getPendingTunnels("device-1")).toEqual([]);
  });
});

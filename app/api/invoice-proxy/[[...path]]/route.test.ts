import { beforeEach, describe, expect, it, vi } from "vitest";

const mockForward = vi.fn();

vi.mock("@/lib/core-apps/invoiceProxy", () => ({
  forwardToInvoiceApp: (...args: unknown[]) => mockForward(...args),
}));

const { GET, POST, PUT, DELETE } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  mockForward.mockResolvedValue(new Response("ok", { status: 200 }));
});

function context(path?: string[]) {
  return { params: Promise.resolve({ path }) };
}

describe("/api/invoice-proxy/[[...path]] route wiring", () => {
  it("GET with no sub-path forwards an empty path array (the bare iframe load)", async () => {
    await GET(new Request("http://localhost/api/invoice-proxy"), context(undefined));
    expect(mockForward).toHaveBeenCalledWith(expect.any(Request), []);
  });

  it("GET with a sub-path forwards the segments", async () => {
    await GET(new Request("http://localhost/api/invoice-proxy/invoices/1"), context(["invoices", "1"]));
    expect(mockForward).toHaveBeenCalledWith(expect.any(Request), ["invoices", "1"]);
  });

  it("POST, PUT, and DELETE all delegate to the same forwarder", async () => {
    await POST(new Request("http://localhost/api/invoice-proxy/invoices", { method: "POST" }), context(["invoices"]));
    await PUT(new Request("http://localhost/api/invoice-proxy/invoices/1", { method: "PUT" }), context(["invoices", "1"]));
    await DELETE(new Request("http://localhost/api/invoice-proxy/invoices/1", { method: "DELETE" }), context(["invoices", "1"]));
    expect(mockForward).toHaveBeenCalledTimes(3);
  });
});

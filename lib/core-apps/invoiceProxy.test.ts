import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/database/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getSession: mockGetSession } }),
}));

const { forwardToInvoiceApp } = await import("./invoiceProxy");

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
  process.env.NEXT_PUBLIC_SNABBFAKTURA_URL = "https://snabbfaktura.vercel.app";
});

function request(path: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost${path}`, init);
}

describe("forwardToInvoiceApp", () => {
  it("falls back to snabbfaktura.vercel.app when NEXT_PUBLIC_SNABBFAKTURA_URL is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SNABBFAKTURA_URL;
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));

    await forwardToInvoiceApp(request("/api/invoice-proxy/invoices"), ["invoices"]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://snabbfaktura.vercel.app/api/invoices",
      expect.anything(),
    );
  });

  it("returns 401 when there is no Supabase session — never forwards an unauthenticated request", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const response = await forwardToInvoiceApp(request("/api/invoice-proxy"), []);

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards to <base>/api/<path> with the session as a Bearer token", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok-123" } } });
    mockFetch.mockResolvedValue(new Response("ok", { status: 200, headers: { "content-type": "text/plain" } }));

    await forwardToInvoiceApp(request("/api/invoice-proxy/invoices/1"), ["invoices", "1"]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://snabbfaktura.vercel.app/api/invoices/1",
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer tok-123");
  });

  it("forwards the iframe initial load to the app shell, not /api/", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));

    await forwardToInvoiceApp(request("/api/invoice-proxy"), []);

    expect(mockFetch).toHaveBeenCalledWith("https://snabbfaktura.vercel.app/", expect.anything());
  });

  it("does not double /api when the catch-all already includes api", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));

    await forwardToInvoiceApp(request("/api/invoice-proxy/api/invoices"), ["api", "invoices"]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://snabbfaktura.vercel.app/api/invoices",
      expect.anything(),
    );
  });

  it("preserves the query string on the forwarded request", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));

    await forwardToInvoiceApp(request("/api/invoice-proxy/invoices?status=paid"), ["invoices"]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://snabbfaktura.vercel.app/api/invoices?status=paid",
      expect.anything(),
    );
  });

  it("sends the request body through on POST/PUT", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    mockFetch.mockResolvedValue(new Response("ok", { status: 201 }));

    await forwardToInvoiceApp(
      request("/api/invoice-proxy/invoices", {
        method: "POST",
        body: JSON.stringify({ amount: 100 }),
        headers: { "content-type": "application/json" },
      }),
      ["invoices"],
    );

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    expect(options.body).toBeDefined();
  });

  it("never sends a body on GET", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));

    await forwardToInvoiceApp(request("/api/invoice-proxy"), []);

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBeUndefined();
  });

  it("mirrors the upstream status code and body back to the caller", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: "inv_1" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await forwardToInvoiceApp(request("/api/invoice-proxy/invoices"), ["invoices"]);

    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ id: "inv_1" });
  });

  it("strips the Domain attribute from forwarded Set-Cookie headers so they land as first-party cookies on our own origin", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    const upstream = new Response("ok", { status: 200 });
    upstream.headers.append("set-cookie", "sf_session=abc123; Domain=snabbfaktura.vercel.app; Path=/; HttpOnly");
    mockFetch.mockResolvedValue(upstream);

    const response = await forwardToInvoiceApp(request("/api/invoice-proxy"), []);

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("sf_session=abc123");
    expect(setCookie).not.toContain("Domain=");
  });

  it("returns 502 rather than throwing when the upstream fetch itself fails", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    mockFetch.mockRejectedValue(new Error("network error"));

    const response = await forwardToInvoiceApp(request("/api/invoice-proxy"), []);

    expect(response.status).toBe(502);
  });
});

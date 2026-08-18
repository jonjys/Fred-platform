import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { sanitizePublicUrl } from "@/lib/core-apps/registry";

const FALLBACK_INVOICE_URL = "https://snabbfaktura.vercel.app";

export function resolveInvoiceBaseUrl(): string | undefined {
  return sanitizePublicUrl(process.env.NEXT_PUBLIC_SNABBFAKTURA_URL) || FALLBACK_INVOICE_URL;
}

/** Join catch-all path onto the invoice origin without doubling /api. */
export function buildInvoiceUpstreamUrl(baseUrl: string, path: string[], search: string): string {
  const segments = path.filter(Boolean);
  let pathname: string;
  if (segments.length === 0) {
    // Iframe initial load → app shell, not /api/
    pathname = "/";
  } else if (segments[0] === "api") {
    pathname = `/${segments.join("/")}`;
  } else {
    pathname = `/api/${segments.join("/")}`;
  }
  const target = new URL(pathname, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (search) target.search = search.startsWith("?") ? search : `?${search}`;
  return target.toString();
}

/**
 * Same-origin reverse proxy for Fred Invoice (Snabbfaktura).
 * Browser talks to /api/invoice-proxy/* (and rewritten /api/invoices, /api/auth/*).
 */
export async function forwardToInvoiceApp(request: Request, path: string[]): Promise<Response> {
  const baseUrl = resolveInvoiceBaseUrl();
  if (!baseUrl) {
    return Response.json(
      { error: "Fred Invoice is not configured (NEXT_PUBLIC_SNABBFAKTURA_URL not set)" },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = buildInvoiceUpstreamUrl(baseUrl, path, incomingUrl.search);

  const headers = new Headers();
  headers.set("authorization", `Bearer ${session.access_token}`);
  headers.set("x-fred-core-embed", "1");
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) headers.set("cookie", cookieHeader);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });
  } catch (error) {
    console.error("[invoice-proxy] Failed to reach Fred Invoice backend.", error);
    return Response.json({ error: "Fred Invoice is unreachable" }, { status: 502 });
  }

  const responseHeaders = new Headers();
  const upstreamContentType = upstreamResponse.headers.get("content-type");
  if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType);

  for (const setCookie of upstreamResponse.headers.getSetCookie()) {
    const withoutDomain = setCookie.replace(/;\s*Domain=[^;]+/i, "");
    responseHeaders.append("set-cookie", withoutDomain);
  }

  return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders });
}

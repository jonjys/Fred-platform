import { createSupabaseServerClient } from "@/lib/database/supabase/server";

/**
 * Same-origin reverse proxy for Fred Invoice (Snabbfaktura) — the browser
 * only ever talks to /api/invoice-proxy/* on our own origin, never directly
 * to Snabbfaktura. That's what makes session cookies work at all here:
 * cookies set by this route land as first-party cookies on OUR domain, so
 * they survive Safari ITP / Chrome's third-party-cookie phase-out, which a
 * plain cross-origin iframe pointed straight at snabbfaktura.vercel.app
 * would not.
 *
 * KNOWN LIMITATION, not fixable from this side alone: only requests that
 * actually go through this proxy get the auth/cookie treatment. If
 * Snabbfaktura's own HTML/JS ever hardcodes an absolute
 * https://snabbfaktura.vercel.app/... URL instead of a relative path, that
 * specific request bypasses the proxy entirely. Fine for a pure JSON API
 * layer (what this forwards to: <base>/api/<path>); would need
 * Snabbfaktura's cooperation (relative asset paths) if it ever needs to
 * proxy the full app shell, not just its API.
 *
 * VERIFIED (13 Aug, via curl) — https://snabbfaktura.vercel.app/api/
 * returns Vercel's platform-level 404 (x-vercel-error: NOT_FOUND, no
 * function deployed there), and the root page is a static 2KB shell that
 * reassembles a gzip-compressed HTML blob from 35 chunked text files
 * client-side — not a live Next.js app with a real backend. This proxy is
 * correct, reusable scaffolding, but forwarding to it will 404 until
 * Snabbfaktura actually deploys a real /api/* backend that accepts a
 * Supabase Bearer token. Not a bug here — the target simply isn't live yet.
 */
export async function forwardToInvoiceApp(request: Request, path: string[]): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_SNABBFAKTURA_URL;
  if (!baseUrl) {
    return Response.json({ error: "Fred Invoice is not configured (NEXT_PUBLIC_SNABBFAKTURA_URL not set)" }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`/api/${path.join("/")}`, baseUrl);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers();
  headers.set("authorization", `Bearer ${session.access_token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl.toString(), {
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

  // Forward Snabbfaktura's own session cookie(s) so it persists across
  // requests — but strip Domain, since a Domain=snabbfaktura.vercel.app
  // cookie is invalid (and silently dropped by the browser) on a response
  // actually served from our origin.
  for (const setCookie of upstreamResponse.headers.getSetCookie()) {
    const withoutDomain = setCookie.replace(/;\s*Domain=[^;]+/i, "");
    responseHeaders.append("set-cookie", withoutDomain);
  }

  return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders });
}

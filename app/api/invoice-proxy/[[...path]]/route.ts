import { forwardToInvoiceApp } from "@/lib/core-apps/invoiceProxy";

export const runtime = "nodejs";

/**
 * /api/invoice-proxy[/...path] — same-origin proxy in front of Fred
 * Invoice (Snabbfaktura). [[...path]] (optional catch-all) so the bare
 * /api/invoice-proxy request the iframe loads on mount also matches, not
 * just /api/invoice-proxy/something. See lib/core-apps/invoiceProxy.ts for
 * the actual forwarding logic and its current known limitation.
 */
async function handler(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  return forwardToInvoiceApp(request, path ?? []);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;

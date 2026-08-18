import { forwardToInvoiceApp } from "@/lib/core-apps/invoiceProxy";

export const runtime = "nodejs";

async function handler(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  return forwardToInvoiceApp(request, path ?? []);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;

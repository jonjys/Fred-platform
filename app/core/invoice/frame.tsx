"use client";

/**
 * Pure Snabbfaktura UI inside the iframe — no Fred header/footer here.
 * Points at our own /api/invoice-proxy (same-origin), never directly at
 * snabbfaktura.vercel.app, so the proxy in lib/core-apps/invoiceProxy.ts can
 * attach the Supabase Bearer token and forward/receive session cookies as
 * first-party cookies on our own domain.
 */
export function InvoiceFrame() {
  return (
    <div
      style={{
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid #1E1E24",
        height: "calc(100vh - 160px)",
        background: "#0E0E12",
      }}
    >
      <iframe
        src="/api/invoice-proxy"
        allow="clipboard-write"
        style={{ width: "100%", height: "100%", border: "0" }}
        title="Fred Invoice"
      />
    </div>
  );
}

import Link from "next/link";
import { requireCoreSession } from "@/lib/core-apps/access";
import { InvoiceFrame } from "./frame";

const HEADER = (
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
    <div>
      <Link href="/core" style={{ fontSize: "12px", color: "#6E6E78" }}>
        ← Back
      </Link>
      <h1 style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px" }}>Fred Invoice</h1>
      <p style={{ color: "#6E6E78" }}>Fakturera på 30 sekunder med Swish-länk</p>
    </div>
  </div>
);

export default async function Page() {
  const { sanitizePublicUrl } = await import("@/lib/core-apps/registry");
  const baseUrl =
    sanitizePublicUrl(process.env.NEXT_PUBLIC_SNABBFAKTURA_URL) || "https://snabbfaktura.vercel.app";

  if (!baseUrl) {
    return (
      <div>
        {HEADER}
        <div
          style={{
            gridColumn: "span 6",
            padding: "22px",
            borderRadius: "18px",
            border: "1px dashed #2A2A34",
            background: "#0E0E12",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "10px", color: "#5A5A60", fontWeight: 700, letterSpacing: "0.12em" }}>
              FRED INVOICE
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#9A9AA0", marginTop: "4px" }}>
              Fakturering & Swish-länkar
            </div>
          </div>
          <div
            style={{
              fontSize: "11px",
              padding: "8px 12px",
              borderRadius: "10px",
              background: "#15151A",
              border: "1px solid #1E1E24",
              color: "#6E6E78",
            }}
          >
            Coming soon
          </div>
        </div>
      </div>
    );
  }

  await requireCoreSession();

  return (
    <div>
      {HEADER}
      <InvoiceFrame />
    </div>
  );
}

import Link from "next/link";
export default function CoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0C", display: "flex", color: "white" }}>
      <aside style={{ width: "240px", borderRight: "1px solid #1F1F23", background: "#0E0E12", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ fontWeight: 900, fontSize: "18px" }}>Fred Platform</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link href="/core" style={{ padding: "10px 12px", borderRadius: "10px", background: "#1A1A1E", color: "white", textDecoration: "none" }}>Oversikt</Link>
          <Link href="/core/billing" style={{ padding: "10px 12px", borderRadius: "10px", color: "#9F9FA9", textDecoration: "none" }}>Billing</Link>
          <Link href="/core/settings" style={{ padding: "10px 12px", borderRadius: "10px", color: "#9F9FA9", textDecoration: "none" }}>Settings</Link>
        </nav>
        <div style={{ marginTop: "auto", fontSize: "12px", color: "#52525B" }}>Inloggad som owner</div>
      </aside>
      <main style={{ flex: 1, padding: "40px" }}>{children}</main>
    </div>
  );
}

import { CoreSidebarNav } from "@/components/core/CoreSidebarNav";

export default function CoreLayout({ children }: { children: React.ReactNode }) {
  const brand = (size: number) => (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${Math.round(size / 3)}px`,
        background: "linear-gradient(135deg,#7A5CFA,#BFFF00)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        color: "#000",
        flexShrink: 0,
      }}
    >
      F
    </div>
  );

  return (
    <div className="md:flex" style={{ minHeight: "100vh", background: "#070708", color: "#EDEDE9" }}>
      <div
        className="flex md:hidden"
        style={{
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          borderBottom: "1px solid #1E1E24",
          background: "#0E0E12",
          overflowX: "auto",
        }}
      >
        {brand(28)}
        <CoreSidebarNav layout="topbar" />
      </div>

      <aside
        className="hidden md:flex"
        style={{
          width: "260px",
          background: "#0E0E12",
          borderRight: "1px solid #1E1E24",
          flexDirection: "column",
          position: "fixed",
          height: "100vh",
          zIndex: 20,
        }}
      >
        <div style={{ padding: "28px 22px", display: "flex", gap: "12px", alignItems: "center" }}>
          {brand(32)}
          <div style={{ fontWeight: 800, fontSize: "15px" }}>FRED OS</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "16px" }}>
          <CoreSidebarNav layout="sidebar" />
        </div>
      </aside>

      <main
        className="md:ml-[260px] p-4 md:py-10 md:px-12"
        style={{
          flex: 1,
          minHeight: "100vh",
          background:
            "radial-gradient(1200px 600px at 20% -10%, rgba(122,92,250,0.15), transparent), radial-gradient(800px 400px at 80% 0%, rgba(191,255,0,0.08), transparent), #070708",
        }}
      >
        {children}
      </main>
    </div>
  );
}

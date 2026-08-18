import Link from "next/link";

const modules = [
  {
    id: "procure",
    accent: "#7A5CFA",
    tag: "Purchase Analysis",
    title: "BUY, NEGOTIATE eller DECLINE",
    desc: "TCO, moms och ROI räknat på 60 sekunder — inte en känsla, ett beslut.",
  },
  {
    id: "debt",
    accent: "#BFFF00",
    tag: "Debt Optimization",
    title: "Optimera ränta, betalningar & kassaflöde",
    desc: "Se exakt vilken skuld som ska amorteras först och varför.",
  },
];

// No Supabase/session check here on purpose — this is the public landing
// page every anonymous visitor should see. Auth lives at /login and inside
// /core, not here.
export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0C", color: "#EDEDE9" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "56px 20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: "linear-gradient(135deg,#7A5CFA,#BFFF00)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "#000",
            }}
          >
            F
          </div>
          <div style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.01em" }}>FRED</div>
        </div>

        <h1
          style={{
            marginTop: "40px",
            fontSize: "34px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
        >
          AI Decision OS för svenska CFOs
        </h1>
        <p style={{ marginTop: "14px", fontSize: "15px", lineHeight: 1.5, color: "#9A9AA0" }}>
          Fatta rätt beslut 10x snabbare. Fred räknar på TCO, ROI och kassaflöde
          så att du inte behöver gissa.
        </p>

        <div style={{ marginTop: "36px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {modules.map((m) => (
            <div
              key={m.id}
              style={{
                padding: "20px",
                borderRadius: "16px",
                background: "linear-gradient(180deg, #111115 0%, #0C0C0F 100%)",
                border: "1px solid #1F1F23",
              }}
            >
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: m.accent }}>
                {m.tag.toUpperCase()}
              </div>
              <div style={{ marginTop: "8px", fontSize: "16px", fontWeight: 700, color: "#fff" }}>{m.title}</div>
              <div style={{ marginTop: "6px", fontSize: "13px", color: "#8A8A90" }}>{m.desc}</div>
            </div>
          ))}
        </div>

        <Link
          href="/login"
          style={{
            marginTop: "36px",
            display: "block",
            width: "100%",
            textAlign: "center",
            height: "48px",
            lineHeight: "48px",
            background: "#7A5CFA",
            color: "white",
            fontWeight: 700,
            fontSize: "14px",
            borderRadius: "10px",
            textDecoration: "none",
          }}
        >
          Logga in för att se OS
        </Link>
      </div>
    </div>
  );
}

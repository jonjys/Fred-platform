import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

export const dynamic = "force-dynamic";

export default async function VacuumPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
    <>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#7AA2FF" }}>
        09 CONTROL PLANE
      </p>
      <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", marginTop: 10 }}>
        Vacuum
      </h1>
      <p style={{ color: "#6E6E78", marginTop: 8, maxWidth: 520 }}>
        Dammsuger doda retries innan de kostar pengar. 5% take pa sparat.
      </p>
      <div
        style={{
          marginTop: 28,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div style={card}>
          <div style={kicker}>LIVE / DEAD</div>
          <div style={value}>8 400 / 1 600</div>
          <div style={sub}>10k events gpu-sim</div>
        </div>
        <div style={card}>
          <div style={kicker}>SPARAT 24H</div>
          <div style={value}>24,8 MB</div>
          <div style={sub}>take 5% vacuum_log</div>
        </div>
        <div style={card}>
          <div style={kicker}>AUTO-VACUUM</div>
          <div style={value}>ON</div>
          <div style={sub}>keys_meta.vacuum_enabled</div>
        </div>
      </div>
    </>
  );
}

const card: CSSProperties = {
  padding: 22,
  borderRadius: 18,
  background: "linear-gradient(180deg, #13131A 0%, #0E0E12 100%)",
  border: "1px solid #1E1E24",
};
const kicker: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "#5A5A60",
};
const value: CSSProperties = {
  marginTop: 8,
  fontSize: 22,
  fontWeight: 800,
  color: "#fff",
};
const sub: CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: "#6E6E78",
};

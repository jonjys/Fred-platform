import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { getCoreApps, type CoreAppEntry } from "@/lib/core-apps/registry";
import { isAppHealthy } from "@/lib/core-apps/health";

// Next 15 no longer treats an uncached fetch() alone as a signal to render
// per-request — without this, the LIVE/SOON health badges below would be
// baked in at build time and never actually reflect live status.
export const dynamic = "force-dynamic";

const procure = {
  id: "procure",
  name: "Fred Procure",
  tag: "Decision Engine",
  desc: "BUY, NEGOTIATE or DECLINE - TCO, VAT, ROI",
  href: "/analyze",
  accent: "#7A5CFA",
};

const BUSINESS_IDS = ["invoice", "radar", "cast", "debt-optimizer"];
const INFRA_IDS = ["gatezero", "promptslaktaren"];

type StatusedApp = CoreAppEntry & { live: boolean };

function Tile({ id, name, tag, desc, accent, href, live }: { id: string; name: string; tag: string; desc: string; accent: string; href: string; live?: boolean }) {
  const isLight = ["#BFFF00", "#00E5FF", "#34C759", "#FFFFFF"].includes(accent);
  return (
    <Link
      key={id}
      href={href}
      className="col-span-1 sm:col-span-3"
      style={{
        padding: "22px",
        borderRadius: "18px",
        background: "linear-gradient(180deg, #13131A 0%, #0E0E12 100%)",
        border: "1px solid #1E1E24",
        display: "block",
        position: "relative",
        overflow: "hidden",
        textDecoration: "none",
      }}
    >
      <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", borderRadius: "999px", background: accent + "25", filter: "blur(32px)" }}></div>
      {live !== undefined && (
        <span
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            fontSize: "10px",
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: "999px",
            background: live ? "rgba(191,255,0,0.12)" : "rgba(255,255,255,0.06)",
            color: live ? "#BFFF00" : "#6E6E78",
          }}
        >
          {live ? "LIVE" : "SOON"}
        </span>
      )}
      <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: accent, display: "flex", alignItems: "center", justifyContent: "center", color: isLight ? "#000" : "#fff", fontWeight: 900 }}>
        {name[0]}
      </div>
      <div style={{ marginTop: "14px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "#5A5A60" }}>{tag}</div>
      <div style={{ marginTop: "4px", fontSize: "16px", fontWeight: 700, color: "#fff" }}>{name}</div>
      <div style={{ marginTop: "4px", fontSize: "12px", color: "#6E6E78" }}>{desc}</div>
    </Link>
  );
}

export default async function CorePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login");
  }

  let apps: CoreAppEntry[] = [];
  try {
    apps = getCoreApps();
  } catch (error) {
    console.error("getCoreApps() failed on /core", error);
    apps = [];
  }
  const withStatus: StatusedApp[] = await Promise.all(
    apps.map(async (app) => ({ ...app, live: await isAppHealthy(app) })),
  );
  const byId = new Map(withStatus.map((app) => [app.id, app]));

  const business = BUSINESS_IDS.map((id) => byId.get(id)).filter((a): a is StatusedApp => Boolean(a));
  const infra = INFRA_IDS.map((id) => byId.get(id)).filter((a): a is StatusedApp => Boolean(a));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ display: "inline-flex", padding: "6px 12px", borderRadius: "999px", background: "rgba(122,92,250,0.12)", border: "1px solid rgba(122,92,250,0.2)", fontSize: "11px", fontWeight: 700, color: "#A99CFF" }}>
            FRED PLATFORM CORE
          </div>
          <h1 style={{ fontSize: "38px", fontWeight: 800, letterSpacing: "-0.04em", marginTop: "14px" }}>Overview</h1>
        </div>
        <div style={{ padding: "10px 14px", borderRadius: "12px", background: "#7A5CFA", color: "white", fontSize: "12px", fontWeight: 700 }}>Upgrade Pro</div>
      </div>

      <div style={{ marginTop: "32px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "#3A3A44" }}>BUSINESS APPS — LIVE</div>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-[14px]" style={{ marginTop: "12px" }}>
        <Link
          href={procure.href}
          className="col-span-1 sm:col-span-6"
          style={{
            padding: "22px",
            borderRadius: "18px",
            background: "linear-gradient(180deg, #13131A 0%, #0E0E12 100%)",
            border: "1px solid #1E1E24",
            display: "block",
            position: "relative",
            overflow: "hidden",
            textDecoration: "none",
          }}
        >
          <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", borderRadius: "999px", background: procure.accent + "25", filter: "blur(32px)" }}></div>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: procure.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900 }}>
            {procure.name[0]}
          </div>
          <div style={{ marginTop: "14px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "#5A5A60" }}>{procure.tag}</div>
          <div style={{ marginTop: "4px", fontSize: "16px", fontWeight: 700, color: "#fff" }}>{procure.name}</div>
          <div style={{ marginTop: "4px", fontSize: "12px", color: "#6E6E78" }}>{procure.desc}</div>
        </Link>
        {business.map((app) => (
          <Tile key={app.id} id={app.id} name={app.name} tag={app.tag} desc={app.desc} accent={app.accent} href={`/core/${app.id}`} live={app.live} />
        ))}
      </div>

      <div style={{ marginTop: "36px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "#3A3A44" }}>INFRASTRUCTURE — APIS, GATEWAYS & CONTROL</div>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-[14px]" style={{ marginTop: "12px" }}>
        {infra.map((app) => (
          <Tile key={app.id} id={app.id} name={app.name} tag={app.tag} desc={app.desc} accent={app.accent} href={`/core/${app.id}`} live={app.live} />
        ))}
        <div className="col-span-1 sm:col-span-6" style={{ padding: "22px", borderRadius: "18px", border: "1px dashed #2A2A34", background: "#0E0E12", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#5A5A60", fontWeight: 700, letterSpacing: "0.12em" }}>DEVELOPER</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#9A9AA0", marginTop: "4px" }}>APIs, webhooks, keys</div>
          </div>
          <div style={{ fontSize: "11px", padding: "8px 12px", borderRadius: "10px", background: "#15151A", border: "1px solid #1E1E24", color: "#6E6E78" }}>Soon</div>
        </div>
      </div>
    </>
  );
}

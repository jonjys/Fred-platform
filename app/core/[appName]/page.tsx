import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { getCoreApp } from "@/lib/core-apps/registry";
import { CoreAppFrame } from "@/lib/core-apps/CoreAppFrame";

export default async function Page({ params }: { params: Promise<{ appName: string }> }) {
  const { appName } = await params;
  const app = getCoreApp(appName);
  if (!app) notFound();

  const header = (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
      <div>
        <Link href="/core" style={{ fontSize: "12px", color: "#6E6E78" }}>
          ← Back
        </Link>
        <h1 style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px" }}>{app.name}</h1>
        <p style={{ color: "#6E6E78" }}>{app.desc}</p>
      </div>
    </div>
  );

  if (!app.url) {
    return (
      <div>
        {header}
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
              {app.tag.toUpperCase()}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#9A9AA0", marginTop: "4px" }}>
              Coming soon — deploya {app.name} först
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      {header}
      <CoreAppFrame src={app.url} title={app.name} />
    </div>
  );
}

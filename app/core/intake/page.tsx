import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { IntakeClient } from "./IntakeClient";

// PWA share-target: manifest.json's share_target.action points here, so
// Android's share sheet can hand off text/links from CapCut, YouTube,
// Swish, etc. straight into Fred. Scoped to this page rather than the
// root layout so it doesn't change the whole platform's install identity.
export const metadata: Metadata = {
  manifest: "/manifest.json",
};

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; text?: string; url?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const initialShared = [params.title, params.text, params.url].filter(Boolean).join(" ").trim();

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/core" style={{ fontSize: "12px", color: "#6E6E78" }}>
          ← Back
        </Link>
        <h1 style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px" }}>Fred Intake</h1>
        <p style={{ color: "#6E6E78" }}>Dela hit från CapCut, YouTube eller Swish.</p>
      </div>
      <IntakeClient initialShared={initialShared} />
    </div>
  );
}

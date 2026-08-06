import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

/** Exchanges a Supabase magic-link code for a session, then redirects into the app. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}

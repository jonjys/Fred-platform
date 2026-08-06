import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "../types";

/**
 * Refreshes the Supabase auth session on every request so Server Components
 * always see a valid (non-expired) session. Wired into the root
 * middleware.ts.
 *
 * Fails open (passes the request through unauthenticated) when Supabase
 * env vars aren't configured, rather than throwing — middleware runs on
 * every route via the matcher below, so an unconditional throw here would
 * 500 the entire deployment (including public pages) any time the project
 * is deployed without Supabase wired up yet.
 */
export async function updateSupabaseSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase env vars are not set (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) — skipping session refresh.",
    );
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Required: touches the session so Supabase can refresh an expiring token.
  await supabase.auth.getUser();

  return response;
}

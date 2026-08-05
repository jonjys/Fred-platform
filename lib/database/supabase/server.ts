import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "../types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

/**
 * Server-side Supabase client bound to the current request's cookies —
 * respects Row Level Security as the signed-in user. Use this in Server
 * Components, Route Handlers, and Server Actions.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // `setAll` is called from a Server Component in some cases, where
          // cookie mutation isn't allowed — safe to ignore because
          // middleware refreshes the session on the next request.
        }
      },
    },
  });
}

/**
 * Service-role Supabase client that bypasses Row Level Security. Reserved
 * for trusted server-only operations (e.g. background jobs, admin tooling).
 * Never import this into anything reachable from client-submitted requests
 * without an explicit authorization check first.
 */
export function createSupabaseServiceRoleClient() {
  return createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

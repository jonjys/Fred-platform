import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

/**
 * TEMPORARY — /core is deliberately public right now so the 01-10 nav can
 * be tested while magic-link login is broken in production. This is a
 * workaround for a login loop, NOT a decision that /core should be public.
 *
 * Flip this back to `true` to restore the gate on every /core page at once.
 *
 * Safe to leave public *for now* only because the data layer gates itself
 * independently of these pages:
 *   - /api/intake returns 401 without a session, and lib/fred/tunnel.ts's
 *     createAtom() throws without one, so the intake UI renders but cannot
 *     write anything.
 *   - /api/invoice-proxy returns 401 without a session, so the Invoice
 *     iframe loads an empty frame rather than someone's invoices.
 *   - /core, /core/billing and /core/settings are static shells (app tiles,
 *     health badges, placeholder copy) with no user data in them.
 * If any /core page starts rendering real user data, this must go back to
 * true first.
 */
export const CORE_REQUIRES_AUTH = false;

/** Redirects to /login when the gate is on and there's no session. No-op
 * while CORE_REQUIRES_AUTH is false. */
export async function requireCoreSession(): Promise<void> {
  if (!CORE_REQUIRES_AUTH) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }
}

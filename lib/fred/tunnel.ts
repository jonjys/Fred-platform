import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import type { Json } from "@/lib/database/types";

/**
 * Ported from jonjys/fred-core's lib/fred/tunnel.ts with two fixes:
 * 1. user_id is never a caller-supplied argument — it's read from the
 *    current session server-side, so there's no way to reach this with a
 *    hardcoded/wrong id (fred-core's own index.html had `user_id: 'jonas'`
 *    literally hardcoded, and app/api/share/route.ts had
 *    `const userId = 'TEST_USER_ID_REPLACE_ME'`).
 * 2. Uses createSupabaseServerClient() (RLS-respecting, session-bound)
 *    instead of a service-role client — the service-role key bypasses RLS
 *    entirely, which combined with (1) meant any caller could write atoms
 *    for any user_id. A signed-in user acting on their own devices/atoms
 *    never needs that bypass; RLS (auth.uid() = user_id) covers it.
 */
export async function createAtom(source: string, type: string, payload: Json) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("createAtom: no authenticated session — refusing to write an atom.");
  }

  const { data: atom, error } = await supabase
    .from("atoms")
    .insert({ user_id: session.user.id, source, type, payload })
    .select()
    .single();

  if (error) throw error;

  const { data: devices } = await supabase.from("devices").select("id").eq("user_id", session.user.id);

  if (devices?.length) {
    const tunnels = devices.map((d) => ({ atom_id: atom.id, device_id: d.id }));
    const { error: tunnelError } = await supabase.from("tunnels").insert(tunnels);
    if (tunnelError) throw tunnelError;
  }

  return atom;
}

export async function getPendingTunnels(deviceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tunnels")
    .select("*, atoms(*)")
    .eq("device_id", deviceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return data ?? [];
}

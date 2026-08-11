import { createSupabaseServiceRoleClient } from "@/lib/database/supabase/server";

/**
 * Fixed-window request limiter backed by the `rate_limit_buckets` table and
 * `check_rate_limit` SQL function — no new infra (Redis, etc.) needed. Uses
 * the service-role client because that table has no RLS policies (nothing
 * for a client to legitimately touch directly); this is trusted
 * server-only infrastructure, same trust boundary as the Stripe webhook.
 *
 * Fails open on unexpected errors (logs and allows the request) — a rate
 * limiter outage should degrade to "no limiting," not "app is down."
 */
export async function checkRateLimit(key: string, windowSeconds: number, max: number): Promise<boolean> {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`[rate-limit] Failed to check rate limit for key "${key}" — failing open.`, error);
    return true;
  }
}

import type { ProfileRow } from "@/lib/database/repositories/profiles";

/**
 * How many analyses a profile has used in the *current* calendar month.
 *
 * `monthly_analyses_used`/`monthly_period_start` only roll over server-side
 * when `consume_monthly_analysis` runs (i.e. on the next successful
 * analysis) — reading the raw columns after a month boundary has passed but
 * before that next run would show a stale count from last month. Callers
 * should read usage through this function instead of the raw columns.
 */
export function currentMonthlyUsage(
  profile: Pick<ProfileRow, "monthly_analyses_used" | "monthly_period_start">,
  now: Date = new Date(),
): number {
  const periodStart = new Date(profile.monthly_period_start);
  const samePeriod =
    periodStart.getUTCFullYear() === now.getUTCFullYear() && periodStart.getUTCMonth() === now.getUTCMonth();
  return samePeriod ? profile.monthly_analyses_used : 0;
}

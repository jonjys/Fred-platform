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

/**
 * Days remaining until the monthly usage counter resets — the calendar
 * month boundary `consume_monthly_analysis` rolls over on (see
 * schema.sql), not a live Stripe billing-cycle date. Deliberately not a
 * Stripe API call: the dashboard needs this on every load, and a live
 * Stripe round-trip there would fight the page's own load-time budget.
 * The exact Stripe renewal date is still available on the billing page via
 * lib/billing/stripeDetails.ts, where a slower, richer fetch is fine.
 */
export function daysLeftInMonthlyPeriod(now: Date = new Date()): number {
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / msPerDay));
}

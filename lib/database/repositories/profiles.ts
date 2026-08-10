import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "../supabase/server";
import type { Database } from "../types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function getProfile(supabase: SupabaseClient<Database>, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Every signup gets a profile automatically via the `on_auth_user_created`
 * DB trigger — this is a defensive fallback, not the primary path. It
 * covers accounts created before that trigger existed, and any future edge
 * case where provisioning didn't happen for some other reason.
 *
 * `profiles` has no insert/update RLS policy for the signed-in user (every
 * column is billing-sensitive — see schema.sql), so the read stays on the
 * caller's user-scoped client but the fallback insert must go through the
 * service-role client instead.
 */
export async function getOrCreateProfile(supabase: SupabaseClient<Database>, userId: string): Promise<ProfileRow> {
  const existing = await getProfile(supabase, userId);
  if (existing) return existing;

  const serviceRole = createSupabaseServiceRoleClient();
  const { data, error } = await serviceRole
    .from("profiles")
    .insert({ user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Atomically spends one trial credit via the `decrement_trial_credit` SQL
 * function — never do this with a plain read-then-write update, which
 * races under concurrent requests from the same user. Returns `null` if
 * the user had no credits left (the caller should already have gated on
 * this before doing any billable work, so this is a defensive signal, not
 * the primary check).
 */
export async function decrementTrialCredit(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase.rpc("decrement_trial_credit", { p_user_id: userId });
  if (error) throw error;
  return data;
}

/**
 * Atomically spends one analysis against the monthly Pro cap via the
 * `consume_monthly_analysis` SQL function — handles the calendar-month
 * rollover and the increment-with-cap guard in one statement, never a
 * plain read-then-write update. Returns `null` if the user is already at
 * `limit` for the current month (the caller should already have gated on
 * this before doing any billable work, so this is a defensive signal, not
 * the primary check).
 */
export async function consumeMonthlyAnalysis(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit: number,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase.rpc("consume_monthly_analysis", { p_user_id: userId, p_limit: limit });
  if (error) throw error;
  return data;
}

export async function getProfileByStripeCustomerId(
  supabase: SupabaseClient<Database>,
  stripeCustomerId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Marks a profile active and records its Stripe customer id. Pass `userId`
 * on `checkout.session.completed` (the only event that carries
 * `client_reference_id`, needed to find the profile the first time);
 * subsequent subscription events key off `stripeCustomerId` alone.
 */
export async function setProfileSubscriptionActive(
  supabase: SupabaseClient<Database>,
  params: { userId?: string; stripeCustomerId: string },
): Promise<void> {
  const update = { subscription_status: "active" as const, stripe_customer_id: params.stripeCustomerId };

  const { error } = params.userId
    ? await supabase.from("profiles").update(update).eq("user_id", params.userId)
    : await supabase.from("profiles").update(update).eq("stripe_customer_id", params.stripeCustomerId);

  if (error) throw error;
}

export async function setProfileSubscriptionCanceled(
  supabase: SupabaseClient<Database>,
  stripeCustomerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ subscription_status: "canceled" })
    .eq("stripe_customer_id", stripeCustomerId);
  if (error) throw error;
}

import { NextResponse } from "next/server";
import { getOrCreateProfile } from "@/lib/database/repositories/profiles";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

/** POST /api/stripe/portal — creates a Stripe Billing Portal session for the
 * signed-in user so they can manage payment methods, view invoices, or
 * cancel their subscription without us building any of that UI ourselves. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateProfile(supabase, user.id);
  if (!profile.stripe_customer_id) {
    // Nothing to manage yet — they've never been through checkout, so
    // there's no Stripe customer to open a portal session for.
    return NextResponse.json({ error: "No billing account yet — upgrade first." }, { status: 400 });
  }

  const stripe = getStripeClient();
  const origin = new URL(request.url).origin;

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/settings/billing`,
    locale: "sv",
  });

  return NextResponse.json({ url: session.url });
}

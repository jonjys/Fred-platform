import { NextResponse } from "next/server";
import { getOrCreateProfile } from "@/lib/database/repositories/profiles";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { getStripeClient } from "@/lib/billing/stripe";
import { UPGRADE_PLAN } from "@/lib/billing/plan";

export const runtime = "nodejs";

/** POST /api/stripe/checkout — creates a subscription Checkout Session for
 * the signed-in user and returns its URL for the client to redirect to. */
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
  const stripe = getStripeClient();
  const origin = new URL(request.url).origin;

  // A pre-created STRIPE_PRICE_ID is the better long-term setup (Stripe's
  // customer portal and revenue reporting expect a real Price object), but
  // isn't required to ship this: falling back to inline price_data means
  // the plan constants in lib/billing/plan.ts are the only place that needs
  // updating if pricing changes before a Price is provisioned.
  const priceId = process.env.STRIPE_PRICE_ID;
  const lineItem: import("stripe").Stripe.Checkout.SessionCreateParams.LineItem = priceId
    ? { price: priceId, quantity: 1 }
    : {
        price_data: {
          currency: UPGRADE_PLAN.currency,
          product_data: { name: UPGRADE_PLAN.name, description: UPGRADE_PLAN.description },
          unit_amount: UPGRADE_PLAN.unitAmount,
          recurring: { interval: UPGRADE_PLAN.interval },
        },
        quantity: 1,
      };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [lineItem],
    // Lets the webhook map checkout.session.completed back to this profile
    // before we have a Stripe customer id for them at all.
    client_reference_id: user.id,
    ...(profile.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: user.email ?? undefined }),
    success_url: `${origin}/settings/billing?success=1`,
    cancel_url: `${origin}/settings/billing?canceled=1`,
    locale: "sv",
  });

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}

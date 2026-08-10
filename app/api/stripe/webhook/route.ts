import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { setProfileSubscriptionActive, setProfileSubscriptionCanceled } from "@/lib/database/repositories/profiles";
import { createSupabaseServiceRoleClient } from "@/lib/database/supabase/server";
import { getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

/** Stripe subscription statuses that mean "the user should have access."
 * Everything else (canceled, unpaid, incomplete_expired, ...) is treated as
 * not-active — a simplification of Stripe's richer state machine that's
 * enough for a binary trial/active gate. */
const ACTIVE_STRIPE_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing"];

function customerIdOf(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/**
 * POST /api/stripe/webhook — the only place subscription_status changes
 * outside of the initial 'trial' default. Uses the service-role Supabase
 * client because Stripe calls this unauthenticated (no user session/cookies
 * exist to scope a normal RLS-respecting request to).
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe-webhook] Signature verification failed.", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const stripeCustomerId = customerIdOf(session.customer);
        const userId = session.client_reference_id ?? undefined;

        if (stripeCustomerId) {
          await setProfileSubscriptionActive(supabase, { userId, stripeCustomerId });
        } else {
          console.error(`[stripe-webhook] checkout.session.completed ${session.id} has no customer id.`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = customerIdOf(subscription.customer);
        if (!stripeCustomerId) break;

        if (ACTIVE_STRIPE_STATUSES.includes(subscription.status)) {
          await setProfileSubscriptionActive(supabase, { stripeCustomerId });
        } else {
          await setProfileSubscriptionCanceled(supabase, stripeCustomerId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = customerIdOf(subscription.customer);
        if (stripeCustomerId) {
          await setProfileSubscriptionCanceled(supabase, stripeCustomerId);
        }
        break;
      }

      default:
        // Intentionally ignore every other event type rather than erroring —
        // Stripe retries on non-2xx, and we only care about these three.
        break;
    }
  } catch (error) {
    console.error(`[stripe-webhook] Failed to process ${event.type}.`, error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

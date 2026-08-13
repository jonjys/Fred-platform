import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { setProfileSubscriptionActive, setProfileSubscriptionCanceled } from "@/lib/database/repositories/profiles";
import { createSupabaseServiceRoleClient } from "@/lib/database/supabase/server";
import { getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

const ACTIVE_STRIPE_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing"];

function customerIdOf(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe-webhook] Signature verification failed.", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[stripe-webhook] Processing ${event.type} (${event.id})`);
  const supabase = createSupabaseServiceRoleClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const stripeCustomerId = customerIdOf(session.customer);
        const userId = session.client_reference_id ?? session.metadata?.userId ?? undefined;

        if (stripeCustomerId) {
          await setProfileSubscriptionActive(supabase, { userId, stripeCustomerId });
          console.log(`[webhook] Activated ${userId} / ${stripeCustomerId}`);
        } else {
          console.error(`[webhook] No customer id in session ${session.id}`);
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
        break;
    }
  } catch (error) {
    console.error(`[stripe-webhook] Failed to process ${event.type}.`, error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

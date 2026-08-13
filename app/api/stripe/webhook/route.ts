import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { setProfileSubscriptionActive, setProfileSubscriptionCanceled } from "@/lib/database/repositories/profiles";
import { createSupabaseServiceRoleClient } from "@/lib/database/supabase/server";
import { getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

const ACTIVE_STRIPE_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing", "past_due"];

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
  const stripe = getStripeClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const stripeCustomerId = customerIdOf(session.customer);
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        
        let userId = session.client_reference_id || session.metadata?.userId || session.metadata?.user_id;
        
        // Fallback: hitta user via email från Stripe
        if (!userId && session.customer_details?.email) {
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const found = users.find(u => u.email?.toLowerCase() === session.customer_details?.email?.toLowerCase());
          if (found) userId = found.id;
        }
        
        // Fallback: hämta customer från Stripe och kolla email
        if (!userId && stripeCustomerId) {
          try {
            const customer = await stripe.customers.retrieve(stripeCustomerId) as Stripe.Customer;
            if (customer.email) {
              const { data: { users } } = await supabase.auth.admin.listUsers();
              const found = users.find(u => u.email?.toLowerCase() === customer.email?.toLowerCase());
              if (found) userId = found.id;
            }
          } catch {}
        }

        if (!stripeCustomerId) {
          console.error(`[stripe-webhook] No customer id in session ${session.id}`);
          break;
        }

        if (!userId) {
          console.error(`[stripe-webhook] No userId found for session ${session.id}, customer ${stripeCustomerId}`);
          break;
        }

        console.log(`[stripe-webhook] Activating user ${userId} customer ${stripeCustomerId}`);

        // 1. Uppdatera profiles (din befintliga logik)
        await setProfileSubscriptionActive(supabase, { userId, stripeCustomerId });

        // 2. Uppdatera subscriptions tabellen också för att hålla allt i sync
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId || null,
          plan: 'pro',
          status: 'active',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = customerIdOf(subscription.customer);
        if (!stripeCustomerId) break;

        if (ACTIVE_STRIPE_STATUSES.includes(subscription.status)) {
          await setProfileSubscriptionActive(supabase, { stripeCustomerId });
          await supabase.from('subscriptions').update({ 
            plan: 'pro', 
            status: 'active',
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString()
          }).eq('stripe_customer_id', stripeCustomerId);
        } else {
          await setProfileSubscriptionCanceled(supabase, stripeCustomerId);
          await supabase.from('subscriptions').update({ 
            plan: 'free', 
            status: 'canceled',
            updated_at: new Date().toISOString()
          }).eq('stripe_customer_id', stripeCustomerId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = customerIdOf(subscription.customer);
        if (!stripeCustomerId) break;

        console.log(`[stripe-webhook] Canceling customer ${stripeCustomerId}`);
        
        await setProfileSubscriptionCanceled(supabase, stripeCustomerId);
        
        // Uppdatera både via customer_id och subscription_id
        await supabase.from('subscriptions').update({ 
          plan: 'free', 
          status: 'canceled',
          updated_at: new Date().toISOString()
        }).or(`stripe_customer_id.eq.${stripeCustomerId},stripe_subscription_id.eq.${subscription.id}`);

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

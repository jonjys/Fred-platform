import { NextResponse } from "next/server";
import { getOrCreateProfile } from "@/lib/database/repositories/profiles";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/database/supabase/server";
import { getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateProfile(supabase, user.id);
  if (!profile.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account yet — upgrade first." }, { status: 400 });
  }

  const stripe = getStripeClient();
  const origin = new URL(request.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings/billing`,
      locale: "sv",
    });
    return NextResponse.json({ url: session.url });
    } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === 'resource_missing') {
      const admin = createSupabaseServiceRoleClient();
      await admin.from("profiles").update({ subscription_status: "canceled", stripe_customer_id: null }).eq("user_id", user.id);
      return NextResponse.json({ error: "Customer deleted in Stripe, reset to trial", reset: true }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

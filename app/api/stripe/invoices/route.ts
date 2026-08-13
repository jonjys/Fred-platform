import { NextResponse } from "next/server";
import { getBillingDetails } from "@/lib/billing/stripeDetails";
import { getOrCreateProfile } from "@/lib/database/repositories/profiles";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/stripe/invoices — the caller's last 12 invoices, so the billing
 * page can show them inline instead of sending the user to the Stripe
 * Portal just to see their invoice history. Always scoped to the signed-in
 * user's own `stripe_customer_id` from `profiles` — a customer id is never
 * accepted as input, so there's no way to request another user's invoices.
 */
export async function GET() {
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
    // Never been through checkout — no Stripe customer, so no invoices.
    return NextResponse.json({ invoices: [] });
  }

  try {
    const { invoices } = await getBillingDetails(profile.stripe_customer_id);
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("[api/stripe/invoices] Failed to fetch invoices from Stripe.", error);
    return NextResponse.json({ error: "Kunde inte hämta fakturor från Stripe." }, { status: 502 });
  }
}

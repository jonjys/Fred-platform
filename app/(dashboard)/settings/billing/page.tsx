import { unstable_rethrow } from "next/navigation";
import { CheckCircle2, XCircle, Zap, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";
import { PaymentMethodCard } from "@/components/billing/PaymentMethodCard";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { UPGRADE_PLAN } from "@/lib/billing/plan";
import { getBillingDetails, type BillingDetails } from "@/lib/billing/stripeDetails";
import { currentMonthlyUsage } from "@/lib/billing/usage";
import { getOrCreateProfile, type ProfileRow } from "@/lib/database/repositories/profiles";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
}

async function loadProfile(): Promise<{ profile: ProfileRow | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { profile: null, error: null };
    const profile = await getOrCreateProfile(supabase, user.id);
    return { profile, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load billing profile.", error);
    return { profile: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function loadBillingDetails(stripeCustomerId: string | null): Promise<BillingDetails | null> {
  if (!stripeCustomerId) return null;
  try {
    return await getBillingDetails(stripeCustomerId);
  } catch (error) {
    console.error("Failed to load Stripe billing details.", error);
    return null;
  }
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const [{ profile, error }, params] = await Promise.all([loadProfile(), searchParams]);

  if (error) {
    return <ConfigErrorNotice title="Kunde inte ladda din fakturering" />;
  }

  if (!profile) return null;

  const billingDetails = await loadBillingDetails(profile.stripe_customer_id);
  const isActive = profile.subscription_status === "active";
  const used = currentMonthlyUsage(profile);
  const usagePercent = Math.min(100, Math.round((used / UPGRADE_PLAN.monthlyAnalysisLimit) * 100));
  const daysLeft = billingDetails?.subscription
    ? Math.max(
        0,
        Math.ceil((new Date(billingDetails.subscription.currentPeriodEnd).getTime() - Date.now()) / 86_400_000),
      )
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing & Prenumeration</h1>
          <p className="text-gray-400">Hantera din prenumeration, betalningsmetod och fakturor.</p>
        </div>

        {params.success === "1" && (
          <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400 mb-6">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Prenumerationen är aktiverad — tack!
          </div>
        )}
        {params.canceled === "1" && (
          <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-[#141416] p-4 text-sm text-gray-400 mb-6">
            <XCircle className="h-5 w-5 shrink-0" />
            Kassan avbröts — inga ändringar gjordes.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="bg-[#141416] border border-gray-800 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-3">Nuvarande plan</div>
              
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-2xl font-bold">{isActive ? 'Pro' : 'Trial'}</h2>
                {isActive && (
                  <div className="bg-[#7c3aed] px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Pro
                  </div>
                )}
              </div>

              {isActive ? (
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-3xl font-bold mb-1">{used}/{UPGRADE_PLAN.monthlyAnalysisLimit} analyser</div>
                    {daysLeft != null && (
                      <div className="text-sm text-gray-400">{daysLeft} dagar kvar av perioden</div>
                    )}
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-400 mb-2">Användning denna månad</div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                      <div className="h-full rounded-full bg-[#7c3aed]" style={{ width: `${usagePercent}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{used} använda av {UPGRADE_PLAN.monthlyAnalysisLimit} analyser</div>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="text-3xl font-bold mb-1">{profile.trial_credits} kvar</div>
                  <div className="text-sm text-gray-400">
                    {profile.trial_credits === 1 ? "gratisanalys" : "gratisanalyser"}
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="text-sm font-semibold mb-3">Ingår i Pro</div>
                {[
                  'Realtidsanalys',
                  'Obegränsade integrationer', 
                  'Prioriterad support',
                  'Avancerade rapporter'
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[#7c3aed]" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              {(!isActive || profile.stripe_customer_id) && (
                <div className="flex flex-col gap-3">
                  {!isActive && <UpgradeButton />}
                  {profile.stripe_customer_id && <ManageSubscriptionButton />}
                </div>
              )}
            </div>
          </div>

          {profile.stripe_customer_id && (
            <div className="lg:col-span-2 space-y-6">
              <PaymentMethodCard
                paymentMethod={billingDetails?.paymentMethod ?? null}
                subscription={billingDetails?.subscription ?? null}
              />
              
              {billingDetails?.subscription?.cancelAtPeriodEnd && (
                // Gated on cancelAtPeriodEnd, not just "daysLeft < 7" — that
                // condition fired for every normal monthly renewal too,
                // telling active (non-canceling) Pro customers their
                // subscription was ending when it wasn't.
                <div className="bg-[#2a1a00] border border-[#7c2d12] rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#f59e0b] mb-1">Prenumerationen är uppsagd</div>
                      <div className="text-sm text-[#fbbf24]">
                        Din Pro-prenumeration är aktiv till {formatDate(billingDetails.subscription.currentPeriodEnd)}.
                        Du kan återaktivera den när som helst innan dess via &quot;Hantera prenumeration&quot;.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Card className="border-gray-800 bg-[#141416]">
                <div className="space-y-3 p-6">
                  <h2 className="text-lg font-semibold text-white">Fakturor</h2>
                  <InvoiceTable invoices={billingDetails?.invoices ?? []} />
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

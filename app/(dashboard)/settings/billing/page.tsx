import { unstable_rethrow } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { UPGRADE_PLAN } from "@/lib/billing/plan";
import { currentMonthlyUsage } from "@/lib/billing/usage";
import { getOrCreateProfile, type ProfileRow } from "@/lib/database/repositories/profiles";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { cn } from "@/lib/utils";

async function loadProfile(): Promise<{ profile: ProfileRow | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // The (dashboard) layout already redirects to /login when unauthenticated.
    if (!user) return { profile: null, error: null };

    const profile = await getOrCreateProfile(supabase, user.id);
    return { profile, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load billing profile.", error);
    return { profile: null, error: error instanceof Error ? error.message : "Unknown error" };
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

  const isActive = profile.subscription_status === "active";
  const used = currentMonthlyUsage(profile);
  const usagePercent = Math.min(100, Math.round((used / UPGRADE_PLAN.monthlyAnalysisLimit) * 100));

  return (
    <div className="max-w-lg space-y-6">
      <p className="text-sm text-zinc-400">Hantera din prenumeration.</p>

      {params.success === "1" && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Prenumerationen är aktiverad — tack!
        </div>
      )}
      {params.canceled === "1" && (
        <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
          <XCircle className="h-4 w-4 shrink-0" />
          Kassan avbröts — inga ändringar gjordes.
        </div>
      )}

      <Card className="border-zinc-800 bg-zinc-900">
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-50">Nuvarande plan</h2>
            <span
              className={cn(
                "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                isActive ? "bg-blue-500/10 text-blue-500" : "bg-zinc-800 text-zinc-400",
              )}
            >
              {isActive ? "Pro" : "Trial"}
            </span>
          </div>

          {isActive ? (
            <div className="space-y-2">
              <p className="font-mono text-sm text-zinc-50">FRED Pro — 990 kr per månad</p>
              <p className="text-sm text-zinc-400">
                {used} av {UPGRADE_PLAN.monthlyAnalysisLimit} analyser använda denna månad
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${usagePercent}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              {profile.trial_credits} {profile.trial_credits === 1 ? "gratisanalys" : "gratisanalyser"} kvar.
            </p>
          )}

          {(!isActive || profile.stripe_customer_id) && (
            <div className="flex flex-wrap gap-3">
              {!isActive && <UpgradeButton />}
              {/* Only a customer who's been through checkout at least once has
               * a Stripe customer id — the portal needs one to open. Shown
               * regardless of current status so a canceled subscriber can
               * still reach their invoice history. */}
              {profile.stripe_customer_id && <ManageSubscriptionButton />}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

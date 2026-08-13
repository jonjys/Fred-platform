import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import { RecentDecisionsList } from "@/components/dashboard/RecentDecisionsList";
import { StatCard } from "@/components/dashboard/StatCard";
import { UPGRADE_PLAN } from "@/lib/billing/plan";
import { currentMonthlyUsage, daysLeftInMonthlyPeriod } from "@/lib/billing/usage";
import { listDecisionsForUser, type DecisionRow } from "@/lib/database/repositories/decisions";
import { getOrCreateProfile, type ProfileRow } from "@/lib/database/repositories/profiles";
import { computeSavingsTrend } from "@/lib/dashboard/stats";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { formatCurrency, formatPercentage } from "@/lib/utils";

const RECENT_LIMIT = 5;
// Bounds the stats computation to a reasonable window rather than every
// decision the account has ever run — 100 is generous for both the
// "since start" and 30/60-day-trend aggregates without an unbounded query.
const STATS_LIMIT = 100;

async function loadDashboardData(): Promise<{
  decisions: DecisionRow[];
  profile: ProfileRow | null;
  error: string | null;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // The (dashboard) layout already redirects to /login when unauthenticated.
    if (!user) return { decisions: [], profile: null, error: null };

    const [decisions, profile] = await Promise.all([
      listDecisionsForUser(supabase, { limit: STATS_LIMIT }),
      getOrCreateProfile(supabase, user.id),
    ]);
    return { decisions, profile, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load dashboard data.", error);
    return { decisions: [], profile: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function DashboardPage() {
  const { decisions, profile, error } = await loadDashboardData();

  if (error) {
    return <ConfigErrorNotice title="Kunde inte ladda din översikt" />;
  }

  if (decisions.length === 0) {
    return <EmptyDashboard />;
  }

  const trend = computeSavingsTrend(decisions);
  const recentDecisions = decisions.slice(0, RECENT_LIMIT);

  const isActive = profile?.subscription_status === "active";
  const usageLimit = isActive ? UPGRADE_PLAN.monthlyAnalysisLimit : 5;
  const usageUsed = profile ? (isActive ? currentMonthlyUsage(profile) : 5 - profile.trial_credits) : 0;
  const usagePercent = Math.min(100, Math.round((usageUsed / usageLimit) * 100));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Analyser denna månad"
          value={`${usageUsed}/${usageLimit}`}
          subtext={isActive ? `${daysLeftInMonthlyPeriod()} dagar kvar av perioden` : "Testperiod"}
          tooltip={
            isActive
              ? "Nollställs i början av varje kalendermånad."
              : "Ingår i din gratis testperiod — uppgradera till Pro för 50 analyser/månad."
          }
        >
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${usagePercent}%` }} />
          </div>
        </StatCard>

        <StatCard
          label="Sparade pengar"
          value={
            trend.currentPeriod.total != null && trend.currentPeriod.currency
              ? formatCurrency(trend.currentPeriod.total, trend.currentPeriod.currency)
              : "—"
          }
          subtext="Senaste 30 dagar"
          tooltip="Summan av positiv nettobesparing (ROI) från analyser i den valuta som förekommer oftast."
          trend={
            trend.trendPercentage != null
              ? {
                  label: `${trend.trendPercentage > 0 ? "+" : ""}${formatPercentage(trend.trendPercentage, 1)}`,
                  positive: trend.trendPercentage >= 0,
                }
              : undefined
          }
        />

        <StatCard
          label="Aktiv prenumeration"
          value={isActive ? "Pro" : "Trial"}
          valueClassName={isActive ? "text-blue-500" : undefined}
          subtext={isActive ? "990 kr/månad" : `${profile?.trial_credits ?? 0} gratisanalyser kvar`}
          tooltip="Se full fakturering, betalningsmetod och fakturor under Fakturering."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2>Senaste beslut</h2>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/history">Visa alla</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/analyze">Ny analys</Link>
            </Button>
          </div>
        </div>
        <RecentDecisionsList decisions={recentDecisions} />
      </div>
    </div>
  );
}

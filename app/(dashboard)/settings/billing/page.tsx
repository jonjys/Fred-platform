import { unstable_rethrow } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { getOrCreateProfile, type ProfileRow } from "@/lib/database/repositories/profiles";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

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
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <ConfigErrorNotice title="Couldn't load your billing status" />
      </div>
    );
  }

  if (!profile) return null;

  const isActive = profile.subscription_status === "active";

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-muted-foreground">Manage your plan and usage.</p>
      </div>

      {params.success === "1" && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Subscription activated — thank you!
        </div>
      )}
      {params.canceled === "1" && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
          <XCircle className="h-4 w-4 shrink-0" />
          Checkout was canceled — no changes were made.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current plan</CardTitle>
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Pro" : "Trial"}
            </Badge>
          </div>
          <CardDescription>
            {isActive
              ? "You're on the Pro plan — unlimited analyses."
              : `${profile.trial_credits} trial ${profile.trial_credits === 1 ? "analysis" : "analyses"} remaining.`}
          </CardDescription>
        </CardHeader>
        {!isActive && (
          <CardContent>
            <UpgradeButton />
          </CardContent>
        )}
      </Card>
    </div>
  );
}

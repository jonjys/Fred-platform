import { redirect, unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { DesktopSidebar, Topbar } from "@/components/dashboard/Sidebar";
import { TrialOnboarding } from "@/components/onboarding/TrialOnboarding";
import { getOrCreateProfile, type ProfileRow } from "@/lib/database/repositories/profiles";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import type { User } from "@supabase/supabase-js";

async function getUserSafely(): Promise<{ user: User | null; configError: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { user, configError: null };
  } catch (error) {
    // Next.js uses thrown errors as an internal control-flow signal (e.g. a
    // DynamicServerError from `cookies()` during the build's static-
    // optimization pass, or redirect()/notFound() called deeper in the
    // tree). Those must propagate untouched — only a genuine failure (bad
    // Supabase config, network error) should be handled below.
    unstable_rethrow(error);
    console.error("Failed to resolve the signed-in user in the dashboard layout.", error);
    return { user: null, configError: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Best-effort — a profile-fetch hiccup should never block rendering the
 * whole dashboard, it just means the onboarding modal doesn't show this
 * load (it'll show next time, once the profile loads fine). */
async function getProfileSafely(userId: string): Promise<ProfileRow | null> {
  try {
    const supabase = await createSupabaseServerClient();
    return await getOrCreateProfile(supabase, userId);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load profile for trial onboarding.", error);
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Kept out of the try/catch below on purpose: redirect() throws a Next.js
  // control-flow signal that must not be caught as if it were a real error.
  const { user, configError } = await getUserSafely();

  if (configError) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-zinc-800 px-6 py-4">
          <span className="text-base font-semibold text-zinc-50">FRED</span>
        </header>
        <main className="flex-1 p-6">
          <ConfigErrorNotice title="Kunde inte ansluta till Supabase" />
        </main>
      </div>
    );
  }

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "";
  const profile = await getProfileSafely(user.id);
  const showOnboarding = profile?.subscription_status === "trial" && profile.trial_credits === 5;

  return (
    <div className="min-h-screen bg-zinc-950">
      <DesktopSidebar email={email} />
      <div className="lg:pl-60">
        <Topbar email={email} />
        {showOnboarding && profile && <TrialOnboarding userId={user.id} trialCredits={profile.trial_credits} />}
        <main className="mx-auto max-w-[1200px] px-4 py-4 lg:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  );
}

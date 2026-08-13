"use client";

import { CircleDollarSign, Sparkles, TrendingUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MODULE_CATALOG } from "@/config/module-catalog";
import { cn } from "@/lib/utils";

const MODULE_ICON: Record<string, typeof Sparkles> = {
  "purchase-analysis": Sparkles,
  "debt-optimization": CircleDollarSign,
  "roi-analysis": TrendingUp,
};

/** Exported for unit testing — keyed per user so a shared browser (or a
 * different account signing in later) never inherits another account's
 * onboarding state. */
export function modalKey(userId: string): string {
  return `fred:onboarding-modal:${userId}`;
}

export function bannerDismissedKey(userId: string): string {
  return `fred:onboarding-banner-dismissed:${userId}`;
}

/**
 * Fullscreen 3-step onboarding for a brand-new trial account — shown once
 * per browser (localStorage-backed; see BLOCKERS.md for why not a
 * `profiles.onboarding_completed` column tonight). Gated server-side by the
 * caller on `subscription_status === 'trial' && trial_credits === 5`
 * (unspent — the closest available proxy for "first login" without a
 * dedicated flag), so even a cleared localStorage on a genuinely new
 * account won't resurrect this for someone who's already used the app.
 */
export function TrialOnboarding({ userId, trialCredits }: { userId: string; trialCredits: number }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setMounted(true);
    const modalShown = window.localStorage.getItem(modalKey(userId)) === "true";
    if (!modalShown) {
      setModalOpen(true);
      return;
    }
    const bannerDismissed = window.localStorage.getItem(bannerDismissedKey(userId)) === "true";
    setBannerVisible(!bannerDismissed);
  }, [userId]);

  function closeModal() {
    window.localStorage.setItem(modalKey(userId), "true");
    setModalOpen(false);
    const bannerDismissed = window.localStorage.getItem(bannerDismissedKey(userId)) === "true";
    setBannerVisible(!bannerDismissed);
  }

  function selectModule(entry: (typeof MODULE_CATALOG)[number]) {
    if (!entry.enabled) return;
    window.localStorage.setItem(modalKey(userId), "true");
    setModalOpen(false);
    router.push("/analyze");
  }

  function dismissBanner() {
    window.localStorage.setItem(bannerDismissedKey(userId), "true");
    setBannerVisible(false);
  }

  if (!mounted) return null;

  return (
    <>
      {bannerVisible && !modalOpen && (
        <div className="flex items-center justify-between gap-3 border-b border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-500 lg:px-6">
          <span>Du har {trialCredits} {trialCredits === 1 ? "analys" : "analyser"} kvar.</span>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Stäng"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-blue-500/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
            <button
              type="button"
              onClick={closeModal}
              aria-label="Stäng"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>

            {step === 0 && (
              <div className="space-y-4 text-center">
                <h2 className="text-2xl font-semibold text-zinc-50">Välkommen till FRED</h2>
                <p className="text-sm text-zinc-400">
                  Stoppa gissningarna. FRED analyserar kostnad, risk och ROI på 30 sekunder — så du kan besluta
                  10x snabbare.
                </p>
                <Button className="w-full" onClick={() => setStep(1)}>
                  Nästa
                </Button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 text-center">
                <h2 className="text-2xl font-semibold text-zinc-50">Du har {trialCredits} gratis analyser</h2>
                <p className="text-sm text-zinc-400">
                  Inget kort krävs. När de är slut kan du uppgradera till FRED Pro för 50 analyser i månaden.
                </p>
                <Button className="w-full" onClick={() => setStep(2)}>
                  Nästa
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-zinc-50">Välj din första analys</h2>
                  <p className="mt-1 text-sm text-zinc-400">Du kan alltid köra fler senare.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {MODULE_CATALOG.map((entry) => {
                    const Icon = MODULE_ICON[entry.key] ?? Sparkles;
                    return (
                      <button
                        key={entry.key}
                        type="button"
                        disabled={!entry.enabled}
                        onClick={() => selectModule(entry)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors",
                          entry.enabled
                            ? "border-zinc-800 bg-zinc-950 hover:border-blue-500 hover:bg-zinc-800"
                            : "cursor-not-allowed border-zinc-800 bg-zinc-950 opacity-50",
                        )}
                      >
                        <Icon className="h-6 w-6 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-50">{entry.label}</span>
                        {!entry.enabled && <span className="text-xs text-zinc-500">Kommer snart</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

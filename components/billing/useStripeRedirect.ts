"use client";

import { useState } from "react";

/**
 * Shared logic behind every "POST to a Stripe session-creating endpoint,
 * then redirect the browser to the returned URL" button — Checkout and the
 * Billing Portal both work this way. Keeps that request/redirect/error
 * handling in one place instead of duplicated per button.
 */
export function useStripeRedirect(endpoint: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function trigger() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !body.url) {
        setError(body.error ?? "Something went wrong");
        setIsLoading(false);
        return;
      }

      window.location.href = body.url;
    } catch {
      setError("Network error — could not reach Stripe.");
      setIsLoading(false);
    }
  }

  return { isLoading, error, trigger };
}

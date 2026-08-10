"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function UpgradeButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !body.url) {
        setError(body.error ?? "Could not start checkout");
        setIsLoading(false);
        return;
      }

      window.location.href = body.url;
    } catch {
      setError("Network error — could not reach checkout.");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting checkout…
          </>
        ) : (
          "Uppgradera – 499 kr/mån (50 analyser)"
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

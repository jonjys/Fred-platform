"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStripeRedirect } from "./useStripeRedirect";

export function UpgradeButton() {
  const { isLoading, error, trigger } = useStripeRedirect("/api/stripe/checkout");

  return (
    <div className="space-y-2">
      <Button onClick={trigger} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Startar…
          </>
        ) : (
          "Uppgradera – 499 kr/mån (50 analyser)"
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

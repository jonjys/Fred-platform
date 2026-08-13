"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStripeRedirect } from "./useStripeRedirect";

export function ManageSubscriptionButton() {
  const { isLoading, error, trigger } = useStripeRedirect("/api/stripe/portal");

  return (
    <div className="space-y-2">
      <Button onClick={trigger} disabled={isLoading} variant="secondary">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Öppnar…
          </>
        ) : (
          "Hantera prenumeration"
        )}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

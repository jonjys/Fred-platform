import { CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PaymentMethodSummary, SubscriptionSummary } from "@/lib/billing/stripeDetails";

function formatCardBrand(brand: string): string {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
}

/** Shows the card on file and renewal date inline — the whole point is to
 * answer "what card, when does it renew" without a trip to the Stripe
 * Portal. `paymentMethod`/`subscription` are both nullable: either a
 * Stripe API hiccup (best-effort, page still renders) or genuinely no
 * default payment method set. */
export function PaymentMethodCard({
  paymentMethod,
  subscription,
}: {
  paymentMethod: PaymentMethodSummary | null;
  subscription: SubscriptionSummary | null;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <div className="space-y-4 p-4 sm:p-6">
        <h2 className="text-base font-semibold text-zinc-50">Betalning</h2>

        {paymentMethod ? (
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 shrink-0 text-zinc-500" />
            <div>
              <p className="font-mono text-sm text-zinc-50">
                {formatCardBrand(paymentMethod.brand)} •••• {paymentMethod.last4}
              </p>
              <p className="font-mono text-xs text-zinc-500">
                Utgår {String(paymentMethod.expMonth).padStart(2, "0")}/{paymentMethod.expYear}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Ingen betalningsmetod hittades.</p>
        )}

        {subscription && (
          <p className="text-sm text-zinc-400">
            {subscription.cancelAtPeriodEnd
              ? `Prenumerationen upphör ${formatDate(subscription.currentPeriodEnd)}`
              : `Förnyas ${formatDate(subscription.currentPeriodEnd)}`}
          </p>
        )}
      </div>
    </Card>
  );
}

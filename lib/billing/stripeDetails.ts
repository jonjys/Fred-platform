import type Stripe from "stripe";
import { getStripeClient } from "./stripe";

export interface PaymentMethodSummary {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface SubscriptionSummary {
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface InvoiceSummary {
  id: string;
  number: string | null;
  status: string | null;
  amountPaid: number;
  currency: string;
  created: string;
  hostedInvoiceUrl: string | null;
}

export interface BillingDetails {
  paymentMethod: PaymentMethodSummary | null;
  subscription: SubscriptionSummary | null;
  invoices: InvoiceSummary[];
}

function extractPaymentMethod(
  defaultPaymentMethod: string | Stripe.PaymentMethod | null | undefined,
): PaymentMethodSummary | null {
  // A plain string means it wasn't expanded, or none is set — either way
  // there's no card detail to show without another round trip.
  if (!defaultPaymentMethod || typeof defaultPaymentMethod === "string") return null;
  if (!defaultPaymentMethod.card) return null;

  const { brand, last4, exp_month, exp_year } = defaultPaymentMethod.card;
  return { brand, last4, expMonth: exp_month, expYear: exp_year };
}

/**
 * The billing details the settings page needs to show payment method,
 * renewal date, and invoice history inline — without sending the user to
 * the Stripe Portal for information we can just display. All three calls
 * run in parallel and are read-only; nothing here is cached (billing state
 * changes independently via webhooks, so a page load should always show
 * the current truth from Stripe).
 */
export async function getBillingDetails(stripeCustomerId: string): Promise<BillingDetails> {
  const stripe = getStripeClient();

  const [customer, subscriptions, invoicesResponse] = await Promise.all([
    stripe.customers.retrieve(stripeCustomerId, { expand: ["invoice_settings.default_payment_method"] }),
    stripe.subscriptions.list({ customer: stripeCustomerId, status: "all", limit: 1 }),
    stripe.invoices.list({ customer: stripeCustomerId, limit: 12 }),
  ]);

  const paymentMethod =
    !customer.deleted ? extractPaymentMethod(customer.invoice_settings?.default_payment_method) : null;

  const currentSubscription = subscriptions.data[0];
  const subscription: SubscriptionSummary | null = currentSubscription
    ? {
        currentPeriodEnd: new Date(currentSubscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: currentSubscription.cancel_at_period_end,
      }
    : null;

  const invoices: InvoiceSummary[] = invoicesResponse.data.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    created: new Date(invoice.created * 1000).toISOString(),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
  }));

  return { paymentMethod, subscription, invoices };
}

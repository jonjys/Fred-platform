import Stripe from "stripe";

let cachedClient: Stripe | null = null;

/** Cached Stripe client, mirroring the pattern in lib/ai/claude.ts —
 * constructed lazily so a missing env var only breaks the routes that
 * actually need Stripe, not the whole server on boot. */
export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not set. Configure it in your environment before calling Stripe.");
  }

  cachedClient = new Stripe(apiKey);
  return cachedClient;
}

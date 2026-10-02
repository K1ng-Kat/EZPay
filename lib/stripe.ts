import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripeServer() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripe) {
    stripe = new Stripe(key, {
      appInfo: { name: "EZPay", version: "0.1.0" },
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }

  return stripe;
}

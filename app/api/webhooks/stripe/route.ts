import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeServer } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripeServer().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
    case "payment_intent.processing":
    case "charge.refunded":
    case "charge.dispute.created":
    case "invoice.paid":
    case "invoice.payment_failed":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // Persist this verified event when EZPay storage is connected.
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

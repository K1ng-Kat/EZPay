import { NextRequest, NextResponse } from "next/server";
import { checkoutCatalog, type CheckoutProductId } from "@/lib/catalog";
import { isSameOrigin, safeIdempotencyKey } from "@/lib/security";
import { getStripeServer } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { productId?: string };
    const productId = body.productId as CheckoutProductId;
    if (!productId || !(productId in checkoutCatalog)) {
      return NextResponse.json({ error: "Unknown checkout product" }, { status: 400 });
    }

    const product = checkoutCatalog[productId];
    const stripe = getStripeServer();
    const intent = await stripe.paymentIntents.create(
      {
        amount: product.amount,
        currency: product.currency,
        description: product.description,
        automatic_payment_methods: { enabled: true },
        metadata: {
          ezpay_product_id: product.id,
          ezpay_surface: "hosted_checkout",
        },
      },
      {
        idempotencyKey: safeIdempotencyKey(request.headers.get("x-ezpay-idempotency-key")),
      }
    );

    if (!intent.client_secret) {
      return NextResponse.json({ error: "Payment intent did not return a client secret" }, { status: 500 });
    }

    return NextResponse.json(
      {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount: product.amount,
        currency: product.currency,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")
      ? "Payments are not configured yet"
      : "Could not initialize payment";
    return NextResponse.json({ error: message }, { status: message.includes("not configured") ? 503 : 500 });
  }
}

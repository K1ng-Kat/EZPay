import { NextRequest, NextResponse } from "next/server";
import { hasValidPrivateApiKey, safeIdempotencyKey } from "@/lib/security";
import { getStripeServer } from "@/lib/stripe";

export const runtime = "nodejs";

const MIN_AMOUNT = 50;
const MAX_AMOUNT = 100_000_00;

export async function POST(request: NextRequest) {
  if (!hasValidPrivateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      amount?: number;
      currency?: string;
      description?: string;
      customer?: string;
      metadata?: Record<string, string>;
    };

    if (!Number.isSafeInteger(body.amount) || !body.amount || body.amount < MIN_AMOUNT || body.amount > MAX_AMOUNT) {
      return NextResponse.json({ error: "amount must be an integer between 50 and 10000000 minor currency units" }, { status: 400 });
    }

    const currency = (body.currency ?? "usd").toLowerCase();
    if (!/^[a-z]{3}$/.test(currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    const stripe = getStripeServer();
    const intent = await stripe.paymentIntents.create(
      {
        amount: body.amount,
        currency,
        description: body.description?.slice(0, 500),
        customer: body.customer,
        automatic_payment_methods: { enabled: true },
        metadata: { ...(body.metadata ?? {}), ezpay_api: "v1" },
      },
      { idempotencyKey: safeIdempotencyKey(request.headers.get("idempotency-key")) }
    );

    return NextResponse.json({
      id: intent.id,
      object: "ezpay.payment",
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      client_secret: intent.client_secret,
      created: intent.created,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to create payment" }, { status: 500 });
  }
}

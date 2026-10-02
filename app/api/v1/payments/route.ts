import { NextRequest, NextResponse } from "next/server";
import { createSandboxPaymentIntent } from "@/lib/ezpay-core";
import { hasValidPrivateApiKey } from "@/lib/security";

export const runtime = "nodejs";

const MIN_AMOUNT = 50;
const MAX_AMOUNT = 100_000_00;

export async function POST(request: NextRequest) {
  if (!hasValidPrivateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    amount?: number;
    currency?: string;
    description?: string;
    metadata?: Record<string, string>;
  };

  if (!Number.isSafeInteger(body.amount) || !body.amount || body.amount < MIN_AMOUNT || body.amount > MAX_AMOUNT) {
    return NextResponse.json(
      { error: "amount must be an integer between 50 and 10000000 minor currency units" },
      { status: 400 }
    );
  }

  const currency = (body.currency ?? "usd").toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  const intent = createSandboxPaymentIntent({
    amount: body.amount,
    currency,
    description: body.description?.slice(0, 500),
    metadata: body.metadata,
  });

  return NextResponse.json(intent, {
    status: 201,
    headers: {
      "Cache-Control": "no-store",
      "X-EZPay-Environment": "sandbox",
    },
  });
}

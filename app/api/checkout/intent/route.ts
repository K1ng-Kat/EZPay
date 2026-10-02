import { NextRequest, NextResponse } from "next/server";
import { checkoutCatalog, type CheckoutProductId } from "@/lib/catalog";
import { createSandboxPaymentIntent } from "@/lib/ezpay-core";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const body = (await request.json()) as { productId?: string };
  const productId = body.productId as CheckoutProductId;

  if (!productId || !(productId in checkoutCatalog)) {
    return NextResponse.json({ error: "Unknown checkout product" }, { status: 400 });
  }

  const product = checkoutCatalog[productId];
  const intent = createSandboxPaymentIntent({
    amount: product.amount,
    currency: product.currency,
    description: product.description,
    metadata: {
      ezpay_product_id: product.id,
      ezpay_surface: "hosted_checkout",
    },
  });

  return NextResponse.json(intent, {
    headers: {
      "Cache-Control": "no-store",
      "X-EZPay-Environment": "sandbox",
    },
  });
}

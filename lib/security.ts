import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const expectedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return Boolean(expectedHost && originHost === expectedHost);
  } catch {
    return false;
  }
}

export function hasValidPrivateApiKey(request: NextRequest) {
  const configured = process.env.EZPAY_API_SECRET;
  if (!configured) return false;
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const supplied = auth.slice(7);
  const a = Buffer.from(supplied);
  const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function safeIdempotencyKey(value: string | null) {
  if (!value) return undefined;
  const clean = value.replace(/[^a-zA-Z0-9_\\-:.]/g, "").slice(0, 255);
  return clean.length >= 8 ? clean : undefined;
}

import { NextRequest, NextResponse } from "next/server";
import {
  OWNER_SESSION_COOKIE,
  createOwnerSessionToken,
  credentialsConfigured,
  ownerSessionMaxAge,
  verifyOwnerPassword,
} from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  if (!credentialsConfigured()) {
    return NextResponse.redirect(new URL("/login?error=configuration", request.url), 303);
  }

  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  if (!verifyOwnerPassword(password)) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set({
    name: OWNER_SESSION_COOKIE,
    value: createOwnerSessionToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ownerSessionMaxAge,
  });
  return response;
}

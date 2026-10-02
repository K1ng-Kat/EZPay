import { createHmac, timingSafeEqual } from "node:crypto";

export const OWNER_SESSION_COOKIE = "ezpay_owner_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function getSessionSecret() {
  return process.env.EZPAY_SESSION_SECRET ?? "";
}

function sign(payload: string) {
  const secret = getSessionSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function credentialsConfigured() {
  return Boolean(process.env.EZPAY_OWNER_PASSWORD && getSessionSecret());
}

export function verifyOwnerPassword(password: string) {
  const expected = process.env.EZPAY_OWNER_PASSWORD;
  if (!expected) return false;

  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createOwnerSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({
      sub: "owner",
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifyOwnerSessionToken(token?: string) {
  if (!token || !getSessionSecret()) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      exp?: number;
    };

    return data.sub === "owner" &&
      typeof data.exp === "number" &&
      data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export const ownerSessionMaxAge = SESSION_TTL_SECONDS;

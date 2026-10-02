import {cookieMap, error, now} from "./http.js";
import {constantTimeStringEqual, randomToken, sha256} from "./crypto.js";

export const SESSION_COOKIE="ezpay_session";

export async function createSession(env) {
  const token=randomToken(32);
  const hash=await sha256(token);
  const hours=Math.max(1,Math.min(168,Number(env.EZPAY_SESSION_HOURS||12)));
  const expires=now()+hours*60*60*1000;
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash,owner_email,created_at,expires_at) VALUES (?,?,?,?)"
  ).bind(hash,env.EZPAY_OWNER_EMAIL||"owner@ezpay.local",now(),expires).run();
  return {token,expires};
}

export function sessionCookie(token,expires) {
  const maxAge=Math.max(0,Math.floor((expires-now())/1000));
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function destroySession(request,env) {
  const token=cookieMap(request)[SESSION_COOKIE];
  if(!token) return;
  const hash=await sha256(token);
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(hash).run();
}

export async function getSession(request,env) {
  const token=cookieMap(request)[SESSION_COOKIE];
  if(!token) return null;
  const hash=await sha256(token);
  const row=await env.DB.prepare(
    "SELECT owner_email,expires_at FROM sessions WHERE token_hash=?"
  ).bind(hash).first();
  if(!row) return null;
  if(Number(row.expires_at)<=now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(hash).run();
    return null;
  }
  return {email:row.owner_email,expiresAt:Number(row.expires_at)};
}

export async function requireOwner(request,env) {
  const session=await getSession(request,env);
  if(!session) return {response:error("Authentication required",401,"unauthorized")};
  return {session};
}

export async function verifyOwnerPassword(password,env) {
  if(!env.EZPAY_OWNER_PASSWORD) return false;
  return constantTimeStringEqual(String(password||""),String(env.EZPAY_OWNER_PASSWORD));
}

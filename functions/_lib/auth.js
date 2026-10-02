import {cookieMap, error, now} from "./http.js";
import {randomToken, sha256} from "./crypto.js";
import {verifyPassword,newPasswordSalt,derivePasswordHash} from "./password.js";

export const SESSION_COOKIE="ezpay_session";

export async function getOwnerCredential(env) {
  return env.DB.prepare("SELECT * FROM owner_credentials WHERE id='owner'").first();
}

export async function createSession(env) {
  const token=randomToken(32);
  const hash=await sha256(token);
  const hours=Math.max(1,Math.min(168,Number(env.EZPAY_SESSION_HOURS||12)));
  const expires=now()+hours*60*60*1000;
  const owner=await getOwnerCredential(env);
  const email=owner?.email||"owner@ezpay.local";
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash,owner_email,created_at,expires_at) VALUES (?,?,?,?)"
  ).bind(hash,email,now(),expires).run();
  return {token,expires,email,mustChangePassword:Boolean(Number(owner?.must_change_password||0))};
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
  const owner=await getOwnerCredential(env);
  return {
    email:row.owner_email,
    expiresAt:Number(row.expires_at),
    mustChangePassword:Boolean(Number(owner?.must_change_password||0))
  };
}

export async function requireOwner(request,env) {
  const session=await getSession(request,env);
  if(!session) return {response:error("Authentication required",401,"unauthorized")};
  return {session};
}

export async function verifyOwnerPassword(password,env) {
  const owner=await getOwnerCredential(env);
  if(!owner) return {ok:false,owner:null};
  const ok=await verifyPassword(String(password||""),owner);
  return {ok,owner};
}

export async function changeOwnerPassword(env,newPassword) {
  const password=String(newPassword||"");
  if(password.length<12) throw new Error("Password must be at least 12 characters.");
  const salt=newPasswordSalt();
  const iterations=210000;
  const hash=await derivePasswordHash(password,salt,iterations);
  await env.DB.prepare(
    "UPDATE owner_credentials SET password_salt_b64=?,password_hash_b64=?,password_iterations=?,must_change_password=0,updated_at=? WHERE id='owner'"
  ).bind(salt,hash,iterations,now()).run();
  return true;
}

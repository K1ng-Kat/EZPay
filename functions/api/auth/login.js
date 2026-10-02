import {json,error,readJson,sameOrigin,now} from "../../_lib/http.js";
import {createSession,sessionCookie,verifyOwnerPassword} from "../../_lib/auth.js";
import {rateLimit} from "../../_lib/rate-limit.js";

export async function onRequestPost(context) {
  const {request,env}=context;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");
  if(!env.DB) return error("D1 binding DB is not configured",503,"database_unavailable");
  const limited=await rateLimit(request,env,"owner-login",10,15*60*1000);
  if(limited) return limited;

  let body;
  try { body=await readJson(request); }
  catch { return error("Invalid JSON request",400); }

  const ok=await verifyOwnerPassword(body.password,env);
  if(!ok) {
    await env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(now()).run();
    return error("Incorrect password",401,"invalid_credentials");
  }

  await env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(now()).run();
  const session=await createSession(env);
  return json(
    {authenticated:true,email:env.EZPAY_OWNER_EMAIL||"owner@ezpay.local",expiresAt:session.expires},
    200,
    {"set-cookie":sessionCookie(session.token,session.expires)}
  );
}

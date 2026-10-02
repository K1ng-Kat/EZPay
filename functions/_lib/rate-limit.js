import {sha256} from "./crypto.js";
import {error,now} from "./http.js";

export async function rateLimit(request,env,bucket,limit,windowMs) {
  const ip=request.headers.get("cf-connecting-ip")||"unknown";
  const keyHash=await sha256(bucket+":"+ip);
  const cutoff=now()-windowMs;

  const count=await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM rate_limit_events WHERE bucket=? AND key_hash=? AND created_at>=?"
  ).bind(bucket,keyHash,cutoff).first();

  if(Number(count?.total||0)>=limit) {
    return error("Too many requests. Try again later.",429,"rate_limited");
  }

  await env.DB.prepare(
    "INSERT INTO rate_limit_events (bucket,key_hash,created_at) VALUES (?,?,?)"
  ).bind(bucket,keyHash,now()).run();

  // Opportunistic cleanup keeps the table bounded without requiring a scheduler.
  if(Math.random()<0.02) {
    await env.DB.prepare("DELETE FROM rate_limit_events WHERE created_at<?").bind(now()-86400000).run();
  }
  return null;
}

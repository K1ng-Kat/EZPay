import {error,now} from "./http.js";
import {sha256} from "./crypto.js";

export async function requireApiKey(request,env,requiredScope=null) {
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  if(!token.startsWith("ez_")) return {response:error("API key required",401,"unauthorized")};
  const hash=await sha256(token);
  const row=await env.DB.prepare(
    "SELECT * FROM api_keys WHERE key_hash=? AND revoked_at IS NULL"
  ).bind(hash).first();
  if(!row) return {response:error("Invalid API key",401,"unauthorized")};

  const scopes=String(row.scopes||"*").split(",").map(s=>s.trim()).filter(Boolean);
  if(requiredScope&&!scopes.includes("*")&&!scopes.includes(requiredScope)) {
    return {response:error("API key lacks required scope",403,"insufficient_scope")};
  }

  await env.DB.prepare("UPDATE api_keys SET last_used_at=? WHERE id=?").bind(now(),row.id).run();
  return {key:{id:row.id,name:row.name,scopes}};
}

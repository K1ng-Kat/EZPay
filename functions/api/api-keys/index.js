import {json,error,readJson,sameOrigin,randomId,now} from "../../_lib/http.js";
import {requireOwner} from "../../_lib/auth.js";
import {randomToken,sha256} from "../../_lib/crypto.js";
import {audit} from "../../_lib/db.js";

export async function onRequestGet({request,env}) {
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;
  const rows=await env.DB.prepare(
    "SELECT id,name,key_prefix,scopes,created_at,last_used_at,revoked_at FROM api_keys ORDER BY created_at DESC"
  ).all();
  return json({apiKeys:(rows.results||[]).map(row=>({
    id:row.id,name:row.name,prefix:row.key_prefix,scopes:String(row.scopes||"*").split(","),
    created:Number(row.created_at),lastUsedAt:row.last_used_at?Number(row.last_used_at):null,
    revokedAt:row.revoked_at?Number(row.revoked_at):null
  }))});
}

export async function onRequestPost({request,env}) {
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");
  let body={};
  try{body=await readJson(request);}catch{}
  const name=String(body.name||"API key").slice(0,120);
  const scopes=Array.isArray(body.scopes)&&body.scopes.length?body.scopes.map(String).join(","):"*";
  const raw="ez_test_"+randomToken(30);
  const hash=await sha256(raw);
  const id=randomId("key");
  const created=now();
  await env.DB.prepare(
    "INSERT INTO api_keys (id,name,key_hash,key_prefix,scopes,created_at) VALUES (?,?,?,?,?,?)"
  ).bind(id,name,hash,raw.slice(0,15),scopes,created).run();
  await audit(env,auth.session.email,"api_key.create","api_key",id,{name,scopes});
  return json({id,name,key:raw,prefix:raw.slice(0,15),scopes:scopes.split(","),created},201);
}

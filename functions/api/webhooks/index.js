import {json,error,readJson,sameOrigin,randomId,now} from "../../_lib/http.js";
import {requireOwner} from "../../_lib/auth.js";
import {audit} from "../../_lib/db.js";

export async function onRequestGet({request,env}) {
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;
  const endpoints=await env.DB.prepare("SELECT * FROM webhook_endpoints ORDER BY created_at DESC").all();
  const events=await env.DB.prepare("SELECT id,event_type,delivered,attempts,last_error,created_at,delivered_at FROM webhook_events ORDER BY created_at DESC LIMIT 100").all();
  return json({
    endpoints:(endpoints.results||[]).map(r=>({id:r.id,url:r.url,active:Boolean(r.active),created:Number(r.created_at),updated:Number(r.updated_at)})),
    events:(events.results||[]).map(r=>({id:r.id,type:r.event_type,delivered:Boolean(r.delivered),attempts:Number(r.attempts),lastError:r.last_error,created:Number(r.created_at),deliveredAt:r.delivered_at?Number(r.delivered_at):null}))
  });
}

export async function onRequestPost({request,env}) {
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");
  let body;
  try{body=await readJson(request);}catch{return error("Invalid JSON",400);}
  let url;
  try{url=new URL(String(body.url||""));}catch{return error("Valid webhook URL required",400,"invalid_url");}
  if(url.protocol!=="https:") return error("Webhook URL must use HTTPS",400,"invalid_url");
  const id=randomId("wh");
  const timestamp=now();
  await env.DB.prepare(
    "INSERT INTO webhook_endpoints (id,url,active,created_at,updated_at) VALUES (?,?,1,?,?)"
  ).bind(id,url.toString(),timestamp,timestamp).run();
  await audit(env,auth.session.email,"webhook.create","webhook",id,{url:url.toString()});
  return json({id,url:url.toString(),active:true,created:timestamp},201);
}

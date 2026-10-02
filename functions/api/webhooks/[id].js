import {json,error,sameOrigin} from "../../_lib/http.js";
import {requireOwner} from "../../_lib/auth.js";
import {audit} from "../../_lib/db.js";

export async function onRequestDelete({request,env,params}) {
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");
  const id=String(params.id||"");
  const row=await env.DB.prepare("SELECT id FROM webhook_endpoints WHERE id=?").bind(id).first();
  if(!row) return error("Webhook endpoint not found",404,"not_found");
  await env.DB.prepare("DELETE FROM webhook_endpoints WHERE id=?").bind(id).run();
  await audit(env,auth.session.email,"webhook.delete","webhook",id,{});
  return json({ok:true});
}

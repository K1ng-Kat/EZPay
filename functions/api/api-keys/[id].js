import {json,error,sameOrigin,now} from "../../_lib/http.js";
import {requireOwner} from "../../_lib/auth.js";
import {audit} from "../../_lib/db.js";

export async function onRequestDelete({request,env,params}) {
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");
  const id=String(params.id||"");
  const row=await env.DB.prepare("SELECT id FROM api_keys WHERE id=?").bind(id).first();
  if(!row) return error("API key not found",404,"not_found");
  await env.DB.prepare("UPDATE api_keys SET revoked_at=? WHERE id=?").bind(now(),id).run();
  await audit(env,auth.session.email,"api_key.revoke","api_key",id,{});
  return json({ok:true});
}

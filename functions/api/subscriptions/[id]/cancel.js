import {json,error,sameOrigin,now} from "../../../_lib/http.js";
import {requireOwner} from "../../../_lib/auth.js";
import {audit,emitEvent} from "../../../_lib/db.js";

export async function onRequestPost(context) {
  const {request,env,params}=context;
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");

  const id=String(params.id||"");
  const sub=await env.DB.prepare("SELECT * FROM subscriptions WHERE id=?").bind(id).first();
  if(!sub) return error("Subscription not found",404,"not_found");
  if(sub.status==="canceled") return json({ok:true,status:"canceled"});

  const timestamp=now();
  await env.DB.prepare(
    "UPDATE subscriptions SET status='canceled',canceled_at=?,updated_at=? WHERE id=?"
  ).bind(timestamp,timestamp,id).run();
  await audit(env,auth.session.email,"subscription.cancel","subscription",id,{});
  await emitEvent(env,"subscription.canceled",{subscriptionId:id},(p)=>context.waitUntil(p));
  return json({ok:true,status:"canceled",canceledAt:timestamp});
}

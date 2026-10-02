import {json,error,readJson,sameOrigin,randomId,now} from "../../_lib/http.js";
import {requireOwner} from "../../_lib/auth.js";
import {audit,emitEvent} from "../../_lib/db.js";

async function availableBalance(env) {
  const payment=await env.DB.prepare(
    "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status='succeeded'"
  ).first();
  const payout=await env.DB.prepare(
    "SELECT COALESCE(SUM(amount),0) AS total FROM payouts WHERE status='paid'"
  ).first();
  return Math.max(0,Number(payment?.total||0)-Number(payout?.total||0));
}

export async function onRequestGet({request,env}) {
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;
  const rows=await env.DB.prepare("SELECT * FROM payouts ORDER BY created_at DESC LIMIT 500").all();
  return json({
    available:await availableBalance(env),
    payouts:(rows.results||[]).map(row=>({
      id:row.id,amount:Number(row.amount),currency:row.currency,status:row.status,
      destination:row.destination,created:Number(row.created_at)
    }))
  });
}

export async function onRequestPost(context) {
  const {request,env}=context;
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");

  let body={};
  try { body=await readJson(request); } catch {}
  const available=await availableBalance(env);
  const requested=body.amount==null?available:Number(body.amount);
  if(!Number.isSafeInteger(requested)||requested<=0||requested>available) {
    return error("Payout amount exceeds available sandbox balance",400,"invalid_payout_amount");
  }

  const id=randomId("po");
  const created=now();
  const destination=String(body.destination||"Sandbox balance").slice(0,200);
  await env.DB.prepare(
    "INSERT INTO payouts (id,amount,currency,status,destination,created_at) VALUES (?,?,?,?,?,?)"
  ).bind(id,requested,"usd","paid",destination,created).run();

  await audit(env,auth.session.email,"payout.create","payout",id,{amount:requested});
  await emitEvent(env,"payout.paid",{id,amount:requested,currency:"usd",destination},context.waitUntil);
  return json({ok:true,payout:{id,amount:requested,currency:"usd",status:"paid",destination,created},available:available-requested},201);
}

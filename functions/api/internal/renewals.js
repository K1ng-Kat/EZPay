import {json,error,readJson,now,randomId} from "../../_lib/http.js";
import {constantTimeStringEqual} from "../../_lib/crypto.js";
import {emitEvent} from "../../_lib/db.js";

function nextPeriodEnd(start,interval) {
  const d=new Date(start);
  if(interval==="year") d.setUTCFullYear(d.getUTCFullYear()+1);
  else if(interval==="week") d.setUTCDate(d.getUTCDate()+7);
  else d.setUTCMonth(d.getUTCMonth()+1);
  return d.getTime();
}

export async function onRequestPost(context) {
  const {request,env}=context;
  const provided=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  if(!env.EZPAY_INTERNAL_JOB_SECRET||!(await constantTimeStringEqual(provided,env.EZPAY_INTERNAL_JOB_SECRET))) {
    return error("Unauthorized",401,"unauthorized");
  }

  let body={};
  try { body=await readJson(request); } catch {}
  const limit=Math.max(1,Math.min(200,Number(body.limit||100)));
  const due=await env.DB.prepare(
    "SELECT s.*,p.name AS product_name,pr.amount,pr.currency,pr.interval,pr.nickname "+
    "FROM subscriptions s JOIN products p ON p.id=s.product_id JOIN prices pr ON pr.id=s.price_id "+
    "WHERE s.status IN ('active','trialing') AND s.current_period_end<=? ORDER BY s.current_period_end ASC LIMIT ?"
  ).bind(now(),limit).all();

  let renewed=0;
  for(const sub of due.results||[]) {
    const timestamp=now();
    const paymentId=randomId("pay");
    const newEnd=nextPeriodEnd(timestamp,sub.interval);
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO payments (id,amount,currency,status,customer_id,customer_email,product_id,price_id,description,method,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(paymentId,Number(sub.amount),sub.currency,"succeeded",sub.customer_id,sub.customer_email,sub.product_id,sub.price_id,sub.product_name+" · "+sub.nickname+" renewal","Sandbox recurring credential",timestamp),
      env.DB.prepare(
        "UPDATE subscriptions SET status='active',current_period_end=?,updated_at=? WHERE id=?"
      ).bind(newEnd,timestamp,sub.id)
    ]);
    renewed++;
    await emitEvent(env,"invoice.payment_succeeded",{subscriptionId:sub.id,paymentId,currentPeriodEnd:newEnd},context.waitUntil);
  }

  return json({ok:true,renewed});
}

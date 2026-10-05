import {json,error,readJson,now,randomId} from "../../_lib/http.js";
import {constantTimeStringEqual} from "../../_lib/crypto.js";
import {emitEvent} from "../../_lib/db.js";
import {recurringCharge} from "../../_lib/rail.js";

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

  let renewed=0,failed=0;
  for(const sub of due.results||[]) {
    const timestamp=now();
    const claim=await env.DB.prepare(
      "UPDATE subscriptions SET status='past_due',updated_at=? WHERE id=? AND status IN ('active','trialing') AND current_period_end<=?"
    ).bind(timestamp,sub.id,timestamp).run();
    if(Number(claim?.meta?.changes||0)===0) continue;

    const paymentId=randomId("pay");
    try{
      if(!sub.rail_customer_vault_id||!sub.rail_initial_transaction_id) throw Object.assign(new Error("Saved recurring card reference is missing."),{code:"recurring_reference_missing"});
      const railPayment=await recurringCharge(env,{
        amount:Number(sub.amount),
        currency:sub.currency,
        customerVaultId:sub.rail_customer_vault_id,
        initialTransactionId:sub.rail_initial_transaction_id
      });
      const newEnd=nextPeriodEnd(timestamp,sub.interval);
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO payments (id,amount,currency,status,customer_id,customer_email,product_id,price_id,description,method,rail_transaction_id,rail_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
        ).bind(paymentId,Number(sub.amount),sub.currency,"succeeded",sub.customer_id,sub.customer_email,sub.product_id,sub.price_id,sub.product_name+" · "+sub.nickname+" renewal","Saved card",String(railPayment.id||""),String(railPayment.status||"approved"),timestamp),
        env.DB.prepare(
          "UPDATE subscriptions SET status='active',current_period_end=?,updated_at=? WHERE id=?"
        ).bind(newEnd,timestamp,sub.id)
      ]);
      renewed++;
      await emitEvent(env,"invoice.payment_succeeded",{subscriptionId:sub.id,paymentId,currentPeriodEnd:newEnd},(p)=>context.waitUntil(p));
    }catch(err){
      await env.DB.prepare(
        "INSERT INTO payments (id,amount,currency,status,customer_id,customer_email,product_id,price_id,description,method,failure_code,rail_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(paymentId,Number(sub.amount),sub.currency,"failed",sub.customer_id,sub.customer_email,sub.product_id,sub.price_id,sub.product_name+" · "+sub.nickname+" renewal","Saved card",String(err.code||"renewal_failed"),"declined",timestamp).run();
      failed++;
      await emitEvent(env,"invoice.payment_failed",{subscriptionId:sub.id,paymentId,error:String(err.message||"Renewal failed")},(p)=>context.waitUntil(p));
    }
  }

  return json({ok:true,renewed,failed});
}

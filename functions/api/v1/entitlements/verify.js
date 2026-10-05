import {json,error,readJson,randomId,now} from "../../../_lib/http.js";
import {sha256} from "../../../_lib/crypto.js";
import {emitEvent} from "../../../_lib/db.js";
import {rateLimit} from "../../../_lib/rate-limit.js";
import {recurringCharge} from "../../../_lib/rail.js";

function nextPeriodEnd(start,interval) {
  const d=new Date(start);
  if(interval==="year") d.setUTCFullYear(d.getUTCFullYear()+1);
  else if(interval==="week") d.setUTCDate(d.getUTCDate()+7);
  else d.setUTCMonth(d.getUTCMonth()+1);
  return d.getTime();
}

export async function onRequestPost(context) {
  const {request,env}=context;
  const limited=await rateLimit(request,env,"entitlement-verify",120,10*60*1000);
  if(limited) return limited;

  let body;
  try { body=await readJson(request); }
  catch { return error("Invalid JSON request",400); }

  const token=String(body.token||"");
  if(!token.startsWith("ent_")||token.length<30) return error("Invalid entitlement token",401,"invalid_entitlement");
  const hash=await sha256(token);

  const lifetime=await env.DB.prepare(
    "SELECT e.*,p.name AS product_name,pr.amount,pr.currency,pr.interval,pr.nickname FROM entitlements e JOIN products p ON p.id=e.product_id LEFT JOIN prices pr ON pr.id=e.price_id WHERE e.token_hash=?"
  ).bind(hash).first();
  if(lifetime) {
    const active=lifetime.status==="active"&&(!lifetime.expires_at||Number(lifetime.expires_at)>now());
    return json({
      active,
      status:lifetime.status,
      kind:"lifetime",
      entitlementId:lifetime.id,
      customerEmail:lifetime.customer_email,
      product:{id:lifetime.product_id,name:lifetime.product_name},
      price:lifetime.price_id?{id:lifetime.price_id,amount:Number(lifetime.amount),currency:lifetime.currency,interval:lifetime.interval,nickname:lifetime.nickname}:null,
      currentPeriodEnd:null
    });
  }

  let sub=await env.DB.prepare(
    "SELECT s.*,p.name AS product_name,pr.amount,pr.currency,pr.interval,pr.nickname FROM subscriptions s JOIN products p ON p.id=s.product_id JOIN prices pr ON pr.id=s.price_id WHERE s.entitlement_hash=?"
  ).bind(hash).first();
  if(!sub) return error("Entitlement not found",404,"not_found");

  if(sub.status==="canceled") {
    return json({active:false,status:"canceled",kind:"subscription",subscriptionId:sub.id,product:{id:sub.product_id,name:sub.product_name}});
  }

  const current=now();
  if(["active","trialing"].includes(sub.status)&&Number(sub.current_period_end)<=current) {
    const claim=await env.DB.prepare(
      "UPDATE subscriptions SET status='past_due',updated_at=? WHERE id=? AND status IN ('active','trialing') AND current_period_end<=?"
    ).bind(current,sub.id,current).run();

    if(Number(claim?.meta?.changes||0)>0) {
      const paymentId=randomId("pay");
      try{
        if(!sub.rail_customer_vault_id||!sub.rail_initial_transaction_id) throw Object.assign(new Error("Saved recurring card reference is missing."),{code:"recurring_reference_missing"});
        const railPayment=await recurringCharge(env,{
          amount:Number(sub.amount),
          currency:sub.currency,
          customerVaultId:sub.rail_customer_vault_id,
          initialTransactionId:sub.rail_initial_transaction_id
        });
        const newEnd=nextPeriodEnd(current,sub.interval);
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO payments (id,amount,currency,status,customer_id,customer_email,product_id,price_id,description,method,rail_transaction_id,rail_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
          ).bind(
            paymentId,Number(sub.amount),sub.currency,"succeeded",sub.customer_id,sub.customer_email,
            sub.product_id,sub.price_id,sub.product_name+" · "+sub.nickname+" renewal","Saved card",
            String(railPayment.id||""),String(railPayment.status||"approved"),current
          ),
          env.DB.prepare(
            "UPDATE subscriptions SET status='active',current_period_end=?,updated_at=? WHERE id=?"
          ).bind(newEnd,current,sub.id)
        ]);
        await emitEvent(env,"invoice.payment_succeeded",{subscriptionId:sub.id,paymentId,currentPeriodEnd:newEnd},(p)=>context.waitUntil(p));
        sub={...sub,status:"active",current_period_end:newEnd};
      }catch(err){
        await env.DB.prepare(
          "INSERT INTO payments (id,amount,currency,status,customer_id,customer_email,product_id,price_id,description,method,failure_code,rail_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
        ).bind(
          paymentId,Number(sub.amount),sub.currency,"failed",sub.customer_id,sub.customer_email,
          sub.product_id,sub.price_id,sub.product_name+" · "+sub.nickname+" renewal","Saved card",
          String(err.code||"renewal_failed"),"declined",current
        ).run();
        await emitEvent(env,"invoice.payment_failed",{subscriptionId:sub.id,paymentId,error:String(err.message||"Renewal failed")},(p)=>context.waitUntil(p));
        sub={...sub,status:"past_due"};
      }
    } else {
      sub=await env.DB.prepare(
        "SELECT s.*,p.name AS product_name,pr.amount,pr.currency,pr.interval,pr.nickname FROM subscriptions s JOIN products p ON p.id=s.product_id JOIN prices pr ON pr.id=s.price_id WHERE s.id=?"
      ).bind(sub.id).first();
    }
  }

  return json({
    active:["active","trialing"].includes(sub.status)&&Number(sub.current_period_end)>now(),
    status:sub.status,
    kind:"subscription",
    subscriptionId:sub.id,
    customerEmail:sub.customer_email,
    product:{id:sub.product_id,name:sub.product_name},
    price:{id:sub.price_id,amount:Number(sub.amount),currency:sub.currency,interval:sub.interval,nickname:sub.nickname},
    currentPeriodEnd:Number(sub.current_period_end)
  });
}

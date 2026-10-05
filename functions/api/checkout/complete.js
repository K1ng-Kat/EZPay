import {json,error,readJson,sameOrigin,randomId,now} from "../../_lib/http.js";
import {randomToken,sha256} from "../../_lib/crypto.js";
import {audit,emitEvent} from "../../_lib/db.js";
import {rateLimit} from "../../_lib/rate-limit.js";
import {sale,railStatus} from "../../_lib/rail.js";

function nextPeriodEnd(start,interval) {
  const d=new Date(start);
  if(interval==="year") d.setUTCFullYear(d.getUTCFullYear()+1);
  else if(interval==="week") d.setUTCDate(d.getUTCDate()+7);
  else d.setUTCMonth(d.getUTCMonth()+1);
  return d.getTime();
}

function maskedLast4(value) {
  const digits=String(value||"").replace(/\D/g,"");
  return digits.slice(-4);
}

export async function onRequestPost(context) {
  const {request,env}=context;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");
  const limited=await rateLimit(request,env,"checkout",30,10*60*1000);
  if(limited) return limited;

  const rail=railStatus(env);
  if(!rail.configured) return error("Live card processing is not connected.",503,"rail_not_configured");

  const idem=String(request.headers.get("idempotency-key")||"").trim();
  if(idem) {
    const existing=await env.DB.prepare(
      "SELECT response_json FROM idempotency_keys WHERE key=? AND scope='checkout.complete'"
    ).bind(idem).first();
    if(existing?.response_json) return json(JSON.parse(existing.response_json));
  }

  let body;
  try { body=await readJson(request); }
  catch { return error("Invalid JSON request",400); }

  const paymentToken=String(body.paymentToken||"").trim();
  if(paymentToken.length<10) return error("Secure card token required",400,"payment_token_required");

  const page=await env.DB.prepare(
    "SELECT * FROM payment_pages WHERE slug=? AND published=1"
  ).bind(String(body.pageSlug||"").toLowerCase()).first();
  if(!page) return error("Payment page not found",404,"not_found");

  const price=await env.DB.prepare(
    "SELECT p.*,pr.name AS product_name FROM prices p JOIN products pr ON pr.id=p.product_id WHERE p.id=? AND p.product_id=? AND p.active=1 AND pr.active=1"
  ).bind(String(body.priceId||page.price_id),page.product_id).first();
  if(!price) return error("Price unavailable",400,"price_unavailable");

  const email=String(body.email||"").trim().toLowerCase();
  const name=String(body.name||"Customer").trim().slice(0,160);
  const address=String(body.address||"").trim().slice(0,200);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error("Valid email required",400,"invalid_email");

  const recurring=price.interval!=="one_time";
  let railPayment;
  try{
    railPayment=await sale(env,{
      amount:Number(price.amount),
      currency:price.currency,
      paymentToken,
      name,
      email,
      address,
      recurring
    });
  }catch(err){
    const created=now();
    const paymentId=randomId("pay");
    await env.DB.prepare(
      "INSERT INTO payments (id,amount,currency,status,customer_email,product_id,price_id,description,method,failure_code,rail_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      paymentId,Number(price.amount),price.currency,"failed",email,page.product_id,price.id,
      price.product_name+" · "+price.nickname,"Card",String(err.code||"rail_declined"),"declined",created
    ).run();
    const response={ok:false,declined:true,payment:{id:paymentId,status:"failed"},error:{code:String(err.code||"card_declined"),message:err.message||"Payment was declined."}};
    if(idem) await env.DB.prepare(
      "INSERT OR REPLACE INTO idempotency_keys (key,scope,response_json,created_at) VALUES (?,?,?,?)"
    ).bind(idem,"checkout.complete",JSON.stringify(response),created).run();
    await emitEvent(env,"payment.failed",response,(p)=>context.waitUntil(p));
    return json(response,402);
  }

  const created=now();
  let customer=await env.DB.prepare("SELECT * FROM customers WHERE email=? COLLATE NOCASE").bind(email).first();
  if(!customer) {
    const customerId=randomId("cus");
    await env.DB.prepare(
      "INSERT INTO customers (id,name,email,created_at,updated_at) VALUES (?,?,?,?,?)"
    ).bind(customerId,name,email,created,created).run();
    customer={id:customerId,name,email,created_at:created};
  } else if(name&&name!==customer.name) {
    await env.DB.prepare("UPDATE customers SET name=?,updated_at=? WHERE id=?").bind(name,created,customer.id).run();
  }

  const paymentId=randomId("pay");
  const last4=maskedLast4(railPayment?.payment_details?.card_number);
  const cardBrand=String(railPayment?.payment_details?.card_type||"Card");
  await env.DB.prepare(
    "INSERT INTO payments (id,amount,currency,status,customer_id,customer_email,product_id,price_id,description,method,rail_transaction_id,rail_status,card_brand,card_last4,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    paymentId,Number(price.amount),price.currency,"succeeded",customer.id,email,page.product_id,price.id,
    price.product_name+" · "+price.nickname,
    last4?cardBrand+" •••• "+last4:cardBrand,
    String(railPayment.id||""),
    String(railPayment.status||"approved"),
    cardBrand,
    last4,
    created
  ).run();

  let subscription=null;
  let entitlementToken="ent_"+randomToken(32);
  const entitlementHash=await sha256(entitlementToken);

  if(recurring) {
    const existing=await env.DB.prepare(
      "SELECT * FROM subscriptions WHERE customer_id=? AND product_id=? AND status IN ('active','trialing') ORDER BY created_at DESC LIMIT 1"
    ).bind(customer.id,page.product_id).first();

    const status=Number(page.trial_days||0)>0?"trialing":"active";
    const periodEnd=Number(page.trial_days||0)>0
      ? created+Number(page.trial_days)*86400000
      : nextPeriodEnd(created,price.interval);
    const vaultId=String(railPayment.customer_vault_id||"");
    const railTxn=String(railPayment.id||"");

    if(existing) {
      await env.DB.prepare(
        "UPDATE subscriptions SET price_id=?,payment_page_id=?,status=?,current_period_end=?,entitlement_hash=?,rail_customer_vault_id=?,rail_initial_transaction_id=?,rail_provider='card_rail',updated_at=? WHERE id=?"
      ).bind(price.id,page.id,status,periodEnd,entitlementHash,vaultId,railTxn,created,existing.id).run();
      subscription={id:existing.id,status,currentPeriodEnd:periodEnd};
    } else {
      const subscriptionId=randomId("sub");
      await env.DB.prepare(
        "INSERT INTO subscriptions (id,customer_id,customer_email,product_id,price_id,payment_page_id,status,started_at,current_period_end,entitlement_hash,created_at,updated_at,rail_customer_vault_id,rail_initial_transaction_id,rail_provider) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        subscriptionId,customer.id,email,page.product_id,price.id,page.id,status,created,periodEnd,entitlementHash,created,created,vaultId,railTxn,"card_rail"
      ).run();
      subscription={id:subscriptionId,status,currentPeriodEnd:periodEnd};
    }
  } else {
    const entitlementId=randomId("entrec");
    await env.DB.prepare(
      "INSERT INTO entitlements (id,token_hash,customer_id,customer_email,product_id,price_id,payment_id,kind,status,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      entitlementId,entitlementHash,customer.id,email,page.product_id,price.id,paymentId,"lifetime","active",null,created,created
    ).run();
  }

  const response={
    ok:true,
    payment:{
      id:paymentId,
      status:"succeeded",
      amount:Number(price.amount),
      currency:price.currency,
      railTransactionId:String(railPayment.id||"")
    },
    customer:{id:customer.id,email,name},
    subscription,
    entitlementToken,
    successMessage:page.success_message
  };

  if(idem) await env.DB.prepare(
    "INSERT OR REPLACE INTO idempotency_keys (key,scope,response_json,created_at) VALUES (?,?,?,?)"
  ).bind(idem,"checkout.complete",JSON.stringify(response),created).run();

  await audit(env,"public_checkout","checkout.complete","payment",paymentId,{
    pageId:page.id,productId:page.product_id,priceId:price.id,customerId:customer.id,railTransactionId:String(railPayment.id||"")
  });
  await emitEvent(env,"payment.succeeded",response,(p)=>context.waitUntil(p));
  if(subscription) await emitEvent(env,"subscription.updated",response,(p)=>context.waitUntil(p));
  return json(response);
}

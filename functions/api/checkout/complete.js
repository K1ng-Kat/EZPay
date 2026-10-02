import {json,error,readJson,sameOrigin,randomId,now} from "../../_lib/http.js";
import {randomToken,sha256} from "../../_lib/crypto.js";
import {audit,emitEvent} from "../../_lib/db.js";

const TEST_SUCCESS=new Set(["4242424242424242","5555555555554444"]);
const TEST_DECLINE="4000000000000002";

function nextPeriodEnd(start,interval) {
  const d=new Date(start);
  if(interval==="year") d.setUTCFullYear(d.getUTCFullYear()+1);
  else if(interval==="week") d.setUTCDate(d.getUTCDate()+7);
  else d.setUTCMonth(d.getUTCMonth()+1);
  return d.getTime();
}

export async function onRequestPost(context) {
  const {request,env}=context;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");

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
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error("Valid email required",400,"invalid_email");

  const card=String(body.card||"").replace(/\D/g,"");
  if(card!==TEST_DECLINE&&!TEST_SUCCESS.has(card)) {
    return error("Sandbox accepts only EZPay test card numbers. Do not send real card data.",400,"sandbox_test_card_required");
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

  if(card===TEST_DECLINE) {
    const paymentId=randomId("pay");
    await env.DB.prepare(
      "INSERT INTO payments (id,amount,currency,status,customer_id,customer_email,product_id,price_id,description,method,failure_code,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      paymentId,Number(price.amount),price.currency,"failed",customer.id,email,page.product_id,price.id,
      price.product_name+" · "+price.nickname,"Test card •••• 0002","card_declined",created
    ).run();
    const response={ok:false,declined:true,payment:{id:paymentId,status:"failed"},error:{code:"card_declined",message:"Your test card was declined."}};
    if(idem) await env.DB.prepare(
      "INSERT OR REPLACE INTO idempotency_keys (key,scope,response_json,created_at) VALUES (?,?,?,?)"
    ).bind(idem,"checkout.complete",JSON.stringify(response),created).run();
    await emitEvent(env,"payment.failed",response,context.waitUntil);
    return json(response,402);
  }

  const paymentId=randomId("pay");
  await env.DB.prepare(
    "INSERT INTO payments (id,amount,currency,status,customer_id,customer_email,product_id,price_id,description,method,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    paymentId,Number(price.amount),price.currency,"succeeded",customer.id,email,page.product_id,price.id,
    price.product_name+" · "+price.nickname,"Test card •••• "+card.slice(-4),created
  ).run();

  let subscription=null;
  let entitlementToken=null;
  if(price.interval!=="one_time") {
    const existing=await env.DB.prepare(
      "SELECT * FROM subscriptions WHERE customer_id=? AND product_id=? AND status IN ('active','trialing') ORDER BY created_at DESC LIMIT 1"
    ).bind(customer.id,page.product_id).first();

    const status=Number(page.trial_days||0)>0?"trialing":"active";
    const periodEnd=Number(page.trial_days||0)>0
      ? created+Number(page.trial_days)*86400000
      : nextPeriodEnd(created,price.interval);

    if(existing) {
      await env.DB.prepare(
        "UPDATE subscriptions SET price_id=?,payment_page_id=?,status=?,current_period_end=?,updated_at=? WHERE id=?"
      ).bind(price.id,page.id,status,periodEnd,created,existing.id).run();
      subscription={id:existing.id,status,currentPeriodEnd:periodEnd};
    } else {
      const subscriptionId=randomId("sub");
      entitlementToken="ent_"+randomToken(32);
      const entitlementHash=await sha256(entitlementToken);
      await env.DB.prepare(
        "INSERT INTO subscriptions (id,customer_id,customer_email,product_id,price_id,payment_page_id,status,started_at,current_period_end,entitlement_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        subscriptionId,customer.id,email,page.product_id,price.id,page.id,status,created,periodEnd,entitlementHash,created,created
      ).run();
      subscription={id:subscriptionId,status,currentPeriodEnd:periodEnd};
    }
  }

  const response={
    ok:true,
    payment:{id:paymentId,status:"succeeded",amount:Number(price.amount),currency:price.currency},
    customer:{id:customer.id,email,name},
    subscription,
    entitlementToken,
    successMessage:page.success_message
  };

  if(idem) await env.DB.prepare(
    "INSERT OR REPLACE INTO idempotency_keys (key,scope,response_json,created_at) VALUES (?,?,?,?)"
  ).bind(idem,"checkout.complete",JSON.stringify(response),created).run();

  await audit(env,"public_checkout","checkout.complete","payment",paymentId,{
    pageId:page.id,productId:page.product_id,priceId:price.id,customerId:customer.id
  });
  await emitEvent(env,"payment.succeeded",response,context.waitUntil);
  if(subscription) await emitEvent(env,"subscription.updated",response,context.waitUntil);
  return json(response);
}

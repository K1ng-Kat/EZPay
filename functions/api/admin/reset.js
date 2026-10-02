import {json,error,sameOrigin,now} from "../../_lib/http.js";
import {requireOwner} from "../../_lib/auth.js";
import {audit} from "../../_lib/db.js";

export async function onRequestPost({request,env}) {
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");

  await env.DB.batch([
    env.DB.prepare("DELETE FROM idempotency_keys"),
    env.DB.prepare("DELETE FROM webhook_events"),
    env.DB.prepare("DELETE FROM payouts"),
    env.DB.prepare("DELETE FROM payments"),
    env.DB.prepare("DELETE FROM subscriptions"),
    env.DB.prepare("DELETE FROM customers"),
    env.DB.prepare("DELETE FROM payment_pages"),
    env.DB.prepare("DELETE FROM prices"),
    env.DB.prepare("DELETE FROM products"),
    env.DB.prepare("UPDATE workspace_settings SET business_name='EZPay',accent='#635bff',support_email='support@example.com',updated_at=? WHERE id='workspace'").bind(now()),
    env.DB.prepare("INSERT INTO products (id,name,description,active,created_at,updated_at) VALUES ('prod_aura','Aura Pro','Premium access to Aura, including advanced automation, experimental features, and Aura Studio.',1,?,?)").bind(now(),now()),
    env.DB.prepare("INSERT INTO prices (id,product_id,amount,currency,interval,nickname,active,created_at,updated_at) VALUES ('price_aura_monthly','prod_aura',1499,'usd','month','Monthly',1,?,?)").bind(now(),now()),
    env.DB.prepare("INSERT INTO prices (id,product_id,amount,currency,interval,nickname,active,created_at,updated_at) VALUES ('price_aura_annual','prod_aura',14900,'usd','year','Annual',1,?,?)").bind(now(),now()),
    env.DB.prepare(
      "INSERT INTO payment_pages (id,slug,name,product_id,price_id,headline,description,brand,accent,button_text,success_message,collect_name,collect_address,trial_days,published,logo_data,created_at,updated_at) "+
      "VALUES ('page_aura_pro','aura-pro','Aura Pro','prod_aura','price_aura_annual','Upgrade to Aura Pro','Unlock the full Aura experience with premium wallpaper automation, Aura Studio, experimental features, and more.','Aura','#635bff','Subscribe to Aura Pro','Aura Pro is active. You can return to Aura and unlock your premium features.',1,0,0,1,'',?,?)"
    ).bind(now(),now())
  ]);
  await audit(env,auth.session.email,"sandbox.reset","workspace","workspace",{});
  return json({ok:true});
}

import {json,error,readJson,sameOrigin,now} from "../_lib/http.js";
import {requireOwner} from "../_lib/auth.js";
import {audit,normalizeProductRows} from "../_lib/db.js";

function bool(v){ return Boolean(Number(v)); }

export async function onRequestGet({request,env}) {
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;

  const [
    settingsRow,productsRows,pricesRows,pagesRows,customersRows,paymentsRows,subscriptionsRows,payoutsRows
  ]=await Promise.all([
    env.DB.prepare("SELECT * FROM workspace_settings WHERE id='workspace'").first(),
    env.DB.prepare("SELECT * FROM products WHERE active=1 ORDER BY created_at ASC").all(),
    env.DB.prepare("SELECT * FROM prices ORDER BY created_at ASC").all(),
    env.DB.prepare("SELECT * FROM payment_pages ORDER BY updated_at DESC").all(),
    env.DB.prepare("SELECT * FROM customers ORDER BY created_at DESC").all(),
    env.DB.prepare("SELECT * FROM payments ORDER BY created_at DESC LIMIT 1000").all(),
    env.DB.prepare("SELECT * FROM subscriptions ORDER BY started_at DESC LIMIT 1000").all(),
    env.DB.prepare("SELECT * FROM payouts ORDER BY created_at DESC LIMIT 500").all()
  ]);

  const products=normalizeProductRows(productsRows.results||[],pricesRows.results||[]);
  const pages=(pagesRows.results||[]).map(row=>({
    id:row.id,slug:row.slug,name:row.name,productId:row.product_id,priceId:row.price_id,
    headline:row.headline,description:row.description||"",brand:row.brand,accent:row.accent,
    buttonText:row.button_text,successMessage:row.success_message,collectName:bool(row.collect_name),
    collectAddress:bool(row.collect_address),trialDays:Number(row.trial_days||0),
    published:bool(row.published),logoData:row.logo_data||"",created:Number(row.created_at),updated:Number(row.updated_at)
  }));
  const customers=(customersRows.results||[]).map(row=>({
    id:row.id,name:row.name||"",email:row.email,created:Number(row.created_at)
  }));
  const payments=(paymentsRows.results||[]).map(row=>({
    id:row.id,amount:Number(row.amount),currency:row.currency,status:row.status,
    customerId:row.customer_id,customerEmail:row.customer_email,productId:row.product_id,
    priceId:row.price_id,description:row.description,method:row.method,created:Number(row.created_at)
  }));
  const subscriptions=(subscriptionsRows.results||[]).map(row=>({
    id:row.id,customerId:row.customer_id,customerEmail:row.customer_email,
    productId:row.product_id,priceId:row.price_id,paymentPageId:row.payment_page_id,
    status:row.status,started:Number(row.started_at),currentPeriodEnd:Number(row.current_period_end),
    canceledAt:row.canceled_at?Number(row.canceled_at):null
  }));
  const payouts=(payoutsRows.results||[]).map(row=>({
    id:row.id,amount:Number(row.amount),currency:row.currency,status:row.status,
    destination:row.destination,created:Number(row.created_at)
  }));

  return json({
    version:4,
    backend:"cloudflare-d1",
    settings:{
      businessName:settingsRow?.business_name||"EZPay",
      accent:settingsRow?.accent||"#635bff",
      supportEmail:settingsRow?.support_email||""
    },
    products,pages,customers,payments,subscriptions,payouts
  });
}

export async function onRequestPut({request,env}) {
  const auth=await requireOwner(request,env);
  if(auth.response) return auth.response;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");

  let body;
  try { body=await readJson(request); }
  catch { return error("Invalid JSON request",400); }

  const settings=body.settings||{};
  const products=Array.isArray(body.products)?body.products:[];
  const pages=Array.isArray(body.pages)?body.pages:[];

  const statements=[
    env.DB.prepare(
      "INSERT INTO workspace_settings (id,business_name,accent,support_email,updated_at) VALUES ('workspace',?,?,?,?) "+
      "ON CONFLICT(id) DO UPDATE SET business_name=excluded.business_name,accent=excluded.accent,support_email=excluded.support_email,updated_at=excluded.updated_at"
    ).bind(
      String(settings.businessName||"EZPay").slice(0,120),
      /^#[0-9a-f]{6}$/i.test(settings.accent||"")?settings.accent:"#635bff",
      String(settings.supportEmail||"").slice(0,254),
      now()
    )
  ];

  const productIds=[];
  const priceIds=[];
  for(const product of products) {
    if(!product?.id||!product?.name) continue;
    productIds.push(String(product.id));
    statements.push(env.DB.prepare(
      "INSERT INTO products (id,name,description,active,created_at,updated_at) VALUES (?,?,?,1,?,?) "+
      "ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,active=1,updated_at=excluded.updated_at"
    ).bind(
      String(product.id).slice(0,100),String(product.name).slice(0,160),
      String(product.description||"").slice(0,4000),Number(product.created||now()),now()
    ));

    for(const price of Array.isArray(product.prices)?product.prices:[]) {
      if(!price?.id||!Number.isSafeInteger(Number(price.amount))) continue;
      priceIds.push(String(price.id));
      statements.push(env.DB.prepare(
        "INSERT INTO prices (id,product_id,amount,currency,interval,nickname,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) "+
        "ON CONFLICT(id) DO UPDATE SET product_id=excluded.product_id,amount=excluded.amount,currency=excluded.currency,interval=excluded.interval,nickname=excluded.nickname,active=excluded.active,updated_at=excluded.updated_at"
      ).bind(
        String(price.id).slice(0,100),String(product.id).slice(0,100),Number(price.amount),
        String(price.currency||"usd").toLowerCase().slice(0,3),
        ["month","year","week","one_time"].includes(price.interval)?price.interval:"one_time",
        String(price.nickname||"Price").slice(0,120),price.active===false?0:1,now(),now()
      ));
    }
  }

  for(const page of pages) {
    if(!page?.id||!page?.slug||!page?.productId||!page?.priceId) continue;
    statements.push(env.DB.prepare(
      "INSERT INTO payment_pages (id,slug,name,product_id,price_id,headline,description,brand,accent,button_text,success_message,collect_name,collect_address,trial_days,published,logo_data,created_at,updated_at) "+
      "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) "+
      "ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name=excluded.name,product_id=excluded.product_id,price_id=excluded.price_id,headline=excluded.headline,description=excluded.description,brand=excluded.brand,accent=excluded.accent,button_text=excluded.button_text,success_message=excluded.success_message,collect_name=excluded.collect_name,collect_address=excluded.collect_address,trial_days=excluded.trial_days,published=excluded.published,logo_data=excluded.logo_data,updated_at=excluded.updated_at"
    ).bind(
      String(page.id).slice(0,100),String(page.slug).slice(0,80),String(page.name||"Checkout").slice(0,160),
      String(page.productId).slice(0,100),String(page.priceId).slice(0,100),String(page.headline||"Complete your purchase").slice(0,240),
      String(page.description||"").slice(0,6000),String(page.brand||"EZPay").slice(0,120),
      /^#[0-9a-f]{6}$/i.test(page.accent||"")?page.accent:"#635bff",String(page.buttonText||"Subscribe").slice(0,100),
      String(page.successMessage||"You're all set.").slice(0,1000),page.collectName===false?0:1,page.collectAddress?1:0,
      Math.max(0,Math.min(365,Number(page.trialDays||0))),page.published?1:0,String(page.logoData||"").slice(0,600000),
      Number(page.created||now()),now()
    ));
  }

  await env.DB.batch(statements);
  await audit(env,auth.session.email,"workspace.sync","workspace","workspace",{
    productCount:products.length,pageCount:pages.length
  });
  return json({ok:true,updatedAt:now()});
}

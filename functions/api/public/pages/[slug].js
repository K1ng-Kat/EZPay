import {json,error} from "../../../_lib/http.js";

function bool(v){ return Boolean(Number(v)); }

export async function onRequestGet({params,env}) {
  const slug=String(params.slug||"").toLowerCase();
  const page=await env.DB.prepare(
    "SELECT * FROM payment_pages WHERE slug=? AND published=1"
  ).bind(slug).first();
  if(!page) return error("Payment page not found",404,"not_found");

  const product=await env.DB.prepare(
    "SELECT * FROM products WHERE id=? AND active=1"
  ).bind(page.product_id).first();
  if(!product) return error("Product unavailable",404,"product_unavailable");

  const prices=await env.DB.prepare(
    "SELECT * FROM prices WHERE product_id=? AND active=1 ORDER BY amount ASC"
  ).bind(product.id).all();

  return json({
    page:{
      id:page.id,slug:page.slug,name:page.name,productId:page.product_id,priceId:page.price_id,
      headline:page.headline,description:page.description||"",brand:page.brand,accent:page.accent,
      buttonText:page.button_text,successMessage:page.success_message,collectName:bool(page.collect_name),
      collectAddress:bool(page.collect_address),trialDays:Number(page.trial_days||0),
      published:true,logoData:page.logo_data||""
    },
    product:{
      id:product.id,name:product.name,description:product.description||"",
      prices:(prices.results||[]).map(price=>({
        id:price.id,amount:Number(price.amount),currency:price.currency,interval:price.interval,
        nickname:price.nickname,active:Boolean(price.active)
      }))
    }
  });
}

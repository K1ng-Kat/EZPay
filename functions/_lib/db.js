import {now, randomId} from "./http.js";
import {hmacHex} from "./crypto.js";

export async function audit(env,actor,action,resourceType,resourceId,payload={}) {
  await env.DB.prepare(
    "INSERT INTO audit_log (id,actor,action,resource_type,resource_id,payload_json,created_at) VALUES (?,?,?,?,?,?,?)"
  ).bind(randomId("aud"),actor,action,resourceType,resourceId||null,JSON.stringify(payload),now()).run();
}

export async function emitEvent(env,eventType,payload,waitUntil) {
  const id=randomId("evt");
  const body=JSON.stringify({id,type:eventType,created:now(),data:payload});
  await env.DB.prepare(
    "INSERT INTO webhook_events (id,event_type,payload_json,delivered,attempts,created_at) VALUES (?,?,?,0,0,?)"
  ).bind(id,eventType,body,now()).run();

  const rows=await env.DB.prepare("SELECT id,url FROM webhook_endpoints WHERE active=1").all();
  if(!rows.results?.length||!env.EZPAY_WEBHOOK_SIGNING_SECRET) return;

  for(const endpoint of rows.results) {
    const task=(async()=>{
      try {
        const timestamp=Math.floor(Date.now()/1000);
        const signature=await hmacHex(env.EZPAY_WEBHOOK_SIGNING_SECRET,`${timestamp}.${body}`);
        const response=await fetch(endpoint.url,{
          method:"POST",
          headers:{
            "content-type":"application/json",
            "x-ezpay-event-id":id,
            "x-ezpay-timestamp":String(timestamp),
            "x-ezpay-signature":signature
          },
          body
        });
        if(!response.ok) throw new Error("HTTP "+response.status);
        await env.DB.prepare(
          "UPDATE webhook_events SET delivered=1,attempts=attempts+1,delivered_at=? WHERE id=?"
        ).bind(now(),id).run();
      } catch (e) {
        await env.DB.prepare(
          "UPDATE webhook_events SET attempts=attempts+1,last_error=? WHERE id=?"
        ).bind(String(e?.message||e).slice(0,500),id).run();
      }
    })();
    if(waitUntil) waitUntil(task);
    else await task;
  }
}

export function normalizeProductRows(products,prices) {
  return products.map(product=>({
    id:product.id,
    name:product.name,
    description:product.description||"",
    created:Number(product.created_at),
    prices:prices.filter(price=>price.product_id===product.id).map(price=>({
      id:price.id,
      amount:Number(price.amount),
      currency:price.currency,
      interval:price.interval,
      nickname:price.nickname,
      active:Boolean(price.active)
    }))
  }));
}

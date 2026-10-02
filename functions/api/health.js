import {json} from "../_lib/http.js";

export async function onRequestGet({env}) {
  const started=Date.now();
  let database=false;
  try {
    const row=await env.DB.prepare("SELECT 1 AS ok").first();
    database=Number(row?.ok)===1;
  } catch {}
  return json({
    ok:database,
    service:"EZPay",
    runtime:"Cloudflare Pages Functions",
    database,
    latencyMs:Date.now()-started,
    timestamp:Date.now()
  },database?200:503);
}

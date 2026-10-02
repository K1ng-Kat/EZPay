export function json(data,status=200,headers={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

export function error(message,status=400,code="bad_request") {
  return json({error:{message,code}},status);
}

export async function readJson(request) {
  const type=request.headers.get("content-type")||"";
  if(!type.includes("application/json")) throw new Error("Expected application/json");
  return request.json();
}

export function sameOrigin(request) {
  const origin=request.headers.get("origin");
  if(!origin) return true;
  try {
    return new URL(origin).host===new URL(request.url).host;
  } catch {
    return false;
  }
}

export function cookieMap(request) {
  const raw=request.headers.get("cookie")||"";
  const out={};
  for(const part of raw.split(";")) {
    const index=part.indexOf("=");
    if(index<0) continue;
    const key=part.slice(0,index).trim();
    const value=part.slice(index+1).trim();
    if(key) out[key]=decodeURIComponent(value);
  }
  return out;
}

export function randomId(prefix) {
  return prefix+"_"+crypto.randomUUID().replaceAll("-","");
}

export function now() {
  return Date.now();
}

export function validMoney(amount) {
  return Number.isSafeInteger(amount)&&amount>=0&&amount<=1000000000;
}

export function validCurrency(currency) {
  return /^[a-z]{3}$/.test(String(currency||"").toLowerCase());
}

import {error} from "./http.js";

function requireConfigured(env) {
  if(String(env.EZPAY_RAIL_MODE||"disabled").toLowerCase()!=="production") {
    throw Object.assign(new Error("EZPay production rail is not configured."),{code:"rail_not_configured",status:503});
  }
  if(!env.EZPAY_RAIL_API_BASE||!env.EZPAY_RAIL_SECRET) {
    throw Object.assign(new Error("EZPay production rail credentials are incomplete."),{code:"rail_credentials_missing",status:503});
  }
}

async function requestRail(env,path,body,idempotencyKey) {
  requireConfigured(env);
  const response=await fetch(new URL(path,env.EZPAY_RAIL_API_BASE).toString(),{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "authorization":"Bearer "+env.EZPAY_RAIL_SECRET,
      "x-ezpay-account":String(env.EZPAY_RAIL_ACCOUNT_ID||""),
      ...(idempotencyKey?{"idempotency-key":idempotencyKey}:{})
    },
    body:JSON.stringify(body)
  });
  let payload=null;
  try{payload=await response.json();}catch{}
  if(!response.ok) {
    const message=payload?.error?.message||payload?.message||("Rail request failed with HTTP "+response.status);
    const err=new Error(message);
    err.code=payload?.error?.code||"rail_error";
    err.status=response.status;
    throw err;
  }
  return payload;
}

export function railStatus(env) {
  const configured=String(env.EZPAY_RAIL_MODE||"disabled").toLowerCase()==="production"
    && Boolean(env.EZPAY_RAIL_API_BASE)
    && Boolean(env.EZPAY_RAIL_SECRET);
  return {
    mode:configured?"production":"disabled",
    configured,
    accountId:configured?String(env.EZPAY_RAIL_ACCOUNT_ID||""):null,
    tokenizationPublicKey:configured?String(env.EZPAY_RAIL_PUBLIC_TOKENIZATION_KEY||""):null
  };
}

export async function authorize(env,input,idempotencyKey) {
  return requestRail(env,"/v1/authorizations",input,idempotencyKey);
}

export async function capture(env,input,idempotencyKey) {
  return requestRail(env,"/v1/captures",input,idempotencyKey);
}

export async function refund(env,input,idempotencyKey) {
  return requestRail(env,"/v1/refunds",input,idempotencyKey);
}

export async function voidAuthorization(env,input,idempotencyKey) {
  return requestRail(env,"/v1/voids",input,idempotencyKey);
}

export async function createRecurringCredential(env,input,idempotencyKey) {
  return requestRail(env,"/v1/recurring-credentials",input,idempotencyKey);
}

export async function recurringCharge(env,input,idempotencyKey) {
  return requestRail(env,"/v1/recurring-charges",input,idempotencyKey);
}

export async function payout(env,input,idempotencyKey) {
  return requestRail(env,"/v1/payouts",input,idempotencyKey);
}

export function railErrorResponse(err) {
  return error(err?.message||"Payment rail error",Number(err?.status||502),err?.code||"rail_error");
}

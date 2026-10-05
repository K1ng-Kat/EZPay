import {error} from "./http.js";
import {nmiStatus,nmiSale,nmiRecurringSale,nmiRefund} from "./rail-nmi.js";

function railMode(env) {
  return String(env.EZPAY_RAIL_MODE||"disabled").toLowerCase();
}

function requireProduction(env) {
  if(railMode(env)!=="production") {
    const err=new Error("EZPay live payment rail is not enabled.");
    err.code="rail_not_configured";err.status=503;throw err;
  }
}

export function railStatus(env) {
  const adapter=nmiStatus(env);
  const configured=railMode(env)==="production"&&adapter.configured;
  return {
    mode:configured?"production":"disabled",
    configured,
    tokenizationPublicKey:configured?adapter.tokenizationPublicKey:null,
    cardEntry:configured?"embedded-tokenized":"unavailable"
  };
}

export async function sale(env,input) {
  requireProduction(env);
  return nmiSale(env,input);
}

export async function recurringCharge(env,input) {
  requireProduction(env);
  return nmiRecurringSale(env,input);
}

export async function refund(env,input) {
  requireProduction(env);
  return nmiRefund(env,input);
}

export function railErrorResponse(err) {
  return error(err?.message||"Payment rail error",Number(err?.status||502),err?.code||"rail_error");
}

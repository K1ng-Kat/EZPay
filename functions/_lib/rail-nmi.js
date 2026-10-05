function amountFromCents(cents) {
  return (Number(cents||0)/100).toFixed(2);
}

function apiBase(env) {
  const raw=String(env.EZPAY_RAIL_API_BASE||"https://secure.nmi.com/api/v5/").trim();
  return raw.endsWith("/")?raw:raw+"/";
}

function requireKeys(env) {
  if(!env.EZPAY_RAIL_SECRET) {
    const err=new Error("EZPay live rail private key is not configured.");
    err.code="rail_secret_missing";err.status=503;throw err;
  }
  if(!env.EZPAY_RAIL_PUBLIC_TOKENIZATION_KEY) {
    const err=new Error("EZPay live rail tokenization key is not configured.");
    err.code="rail_public_key_missing";err.status=503;throw err;
  }
}

async function railFetch(env,path,body) {
  requireKeys(env);
  const response=await fetch(new URL(path,apiBase(env)).toString(),{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "authorization":String(env.EZPAY_RAIL_SECRET)
    },
    body:JSON.stringify(body)
  });
  let data={};
  try{data=await response.json();}catch{}
  if(!response.ok || String(data.response||"1")!=="1") {
    const err=new Error(data.response_text||data.message||"Payment was not approved.");
    err.code=data.error_code||data.response_code||"rail_declined";
    err.status=response.status>=400?response.status:402;
    err.data=data;
    throw err;
  }
  return data;
}

export function nmiStatus(env) {
  const configured=Boolean(env.EZPAY_RAIL_SECRET&&env.EZPAY_RAIL_PUBLIC_TOKENIZATION_KEY);
  return {
    configured,
    tokenizationPublicKey:configured?String(env.EZPAY_RAIL_PUBLIC_TOKENIZATION_KEY):null
  };
}

export async function nmiSale(env,{amount,currency,paymentToken,name,email,address,recurring=false}) {
  const parts=String(name||"Customer").trim().split(/\s+/);
  const firstName=parts.shift()||"Customer";
  const lastName=parts.join(" ")||"";
  const payload={
    amount:amountFromCents(amount),
    currency:String(currency||"usd").toUpperCase(),
    payment_details:{payment_token:String(paymentToken)},
    billing_address:{
      first_name:firstName.slice(0,50),
      last_name:lastName.slice(0,50),
      address1:String(address||"").slice(0,100)
    },
    customer_receipt:Boolean(email),
    industry:"ecommerce",
    order_details:{order_description:"EZPay checkout"}
  };
  if(recurring) {
    payload.customer_vault={add_customer:true,billing_method:"recurring"};
    payload.cit_mit={
      stored_credential_indicator:"stored",
      initiated_by:"customer"
    };
  }
  return railFetch(env,"payments/sale",payload);
}

export async function nmiRecurringSale(env,{amount,currency,customerVaultId,initialTransactionId}) {
  return railFetch(env,"payments/sale",{
    amount:amountFromCents(amount),
    currency:String(currency||"usd").toUpperCase(),
    payment_details:{customer_vault_id:String(customerVaultId)},
    customer_vault:{billing_method:"recurring"},
    cit_mit:{
      stored_credential_indicator:"used",
      initiated_by:"merchant",
      initial_transaction_id:String(initialTransactionId)
    },
    industry:"ecommerce"
  });
}

export async function nmiRefund(env,{transactionId,amount}) {
  return railFetch(env,`payments/${encodeURIComponent(transactionId)}/refund`,{
    amount:amountFromCents(amount)
  });
}

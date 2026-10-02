export async function onRequest(context) {
  const requestId=crypto.randomUUID();
  const response=await context.next();
  const headers=new Headers(response.headers);
  headers.set("x-content-type-options","nosniff");
  headers.set("x-frame-options","DENY");
  headers.set("referrer-policy","strict-origin-when-cross-origin");
  headers.set("permissions-policy","camera=(), microphone=(), geolocation=(), usb=()");
  headers.set("x-ezpay-request-id",requestId);
  if(new URL(context.request.url).pathname.startsWith("/api/")) {
    headers.set("cache-control","no-store");
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

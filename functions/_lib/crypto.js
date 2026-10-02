function bytesToHex(bytes) {
  return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}

export async function sha256(value) {
  const bytes=new TextEncoder().encode(String(value));
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return bytesToHex(new Uint8Array(digest));
}

export function randomToken(bytes=32) {
  const data=new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let binary="";
  for(const byte of data) binary+=String.fromCharCode(byte);
  return btoa(binary).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
}

export async function constantTimeStringEqual(a,b) {
  const ah=await sha256(a);
  const bh=await sha256(b);
  if(ah.length!==bh.length) return false;
  let diff=0;
  for(let i=0;i<ah.length;i++) diff|=ah.charCodeAt(i)^bh.charCodeAt(i);
  return diff===0;
}

export async function hmacHex(secret,message) {
  const key=await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {name:"HMAC",hash:"SHA-256"},
    false,
    ["sign"]
  );
  const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message));
  return bytesToHex(new Uint8Array(signature));
}

function bytesToBase64(bytes) {
  let binary="";
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary=atob(value);
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}

function constantTimeBytesEqual(a,b) {
  if(a.length!==b.length) return false;
  let diff=0;
  for(let i=0;i<a.length;i++) diff|=a[i]^b[i];
  return diff===0;
}

export async function derivePasswordHash(password,saltB64,iterations=210000) {
  const key=await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(password)),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits=await crypto.subtle.deriveBits(
    {
      name:"PBKDF2",
      hash:"SHA-256",
      salt:base64ToBytes(saltB64),
      iterations:Number(iterations)
    },
    key,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

export async function verifyPassword(password,row) {
  const actual=await derivePasswordHash(password,row.password_salt_b64,row.password_iterations);
  return constantTimeBytesEqual(base64ToBytes(actual),base64ToBytes(row.password_hash_b64));
}

export function newPasswordSalt() {
  const salt=new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bytesToBase64(salt);
}

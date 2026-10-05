import {json,error,readJson,sameOrigin} from "../../_lib/http.js";
import {requireOwner,verifyOwnerPassword,changeOwnerPassword} from "../../_lib/auth.js";
import {audit} from "../../_lib/db.js";

export async function onRequestPost({request,env}) {
  const auth=await requireOwner(request,env,{allowPasswordChange:true});
  if(auth.response) return auth.response;
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");

  let body;
  try { body=await readJson(request); }
  catch { return error("Invalid JSON request",400); }

  const current=await verifyOwnerPassword(body.currentPassword,env);
  if(!current.ok) return error("Current password is incorrect",401,"invalid_credentials");

  const next=String(body.newPassword||"");
  if(next.length<14) return error("New password must be at least 14 characters",400,"weak_password");
  if(next===String(body.currentPassword||"")) return error("Choose a different password",400,"password_reuse");

  await changeOwnerPassword(env,next);
  await audit(env,auth.session.email,"owner.password_change","owner","owner",{});
  return json({ok:true,mustChangePassword:false});
}

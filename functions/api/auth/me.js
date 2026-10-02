import {json} from "../../_lib/http.js";
import {getSession} from "../../_lib/auth.js";

export async function onRequestGet({request,env}) {
  if(!env.DB) return json({authenticated:false},503);
  const session=await getSession(request,env);
  if(!session) return json({authenticated:false},401);
  return json({
    authenticated:true,
    email:session.email,
    expiresAt:session.expiresAt,
    mustChangePassword:session.mustChangePassword
  });
}

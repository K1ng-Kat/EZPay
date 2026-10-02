import {json,error,sameOrigin} from "../../_lib/http.js";
import {clearSessionCookie,destroySession} from "../../_lib/auth.js";

export async function onRequestPost({request,env}) {
  if(!sameOrigin(request)) return error("Invalid origin",403,"invalid_origin");
  await destroySession(request,env);
  return json({authenticated:false},200,{"set-cookie":clearSessionCookie()});
}

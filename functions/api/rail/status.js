import {json} from "../../_lib/http.js";
import {railStatus} from "../../_lib/rail.js";

export async function onRequestGet({env}) {
  return json({rail:railStatus(env)});
}

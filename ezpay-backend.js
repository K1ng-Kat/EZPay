(() => {
  "use strict";
  const EZ=window.EZ;
  EZ.authenticated=false;
  EZ._localSave=EZ.save;
  EZ._syncTimer=null;

  EZ.api=async(path,options={})=>{
    const response=await fetch(path,{
      credentials:"same-origin",
      ...options,
      headers:{
        ...(options.body?{"content-type":"application/json"}:{}),
        ...(options.headers||{})
      }
    });
    let data=null;
    try{data=await response.json();}catch{}
    if(!response.ok){
      const err=new Error(data?.error?.message||data?.error||("Request failed: "+response.status));
      err.status=response.status;
      err.code=data?.error?.code;
      err.data=data;
      throw err;
    }
    return data;
  };

  EZ.applyRemoteState=(remote)=>{
    const fallback=EZ.defaultState();
    EZ.state={
      ...fallback,
      ...remote,
      version:4,
      chartBars:fallback.chartBars,
      settings:{...fallback.settings,...(remote.settings||{})},
      products:Array.isArray(remote.products)?remote.products:[],
      pages:Array.isArray(remote.pages)?remote.pages:[],
      customers:Array.isArray(remote.customers)?remote.customers:[],
      payments:Array.isArray(remote.payments)?remote.payments:[],
      subscriptions:Array.isArray(remote.subscriptions)?remote.subscriptions:[],
      payouts:Array.isArray(remote.payouts)?remote.payouts:[]
    };
    EZ._localSave();
  };

  EZ.loadRemote=async()=>{
    const remote=await EZ.api("/api/state");
    EZ.applyRemoteState(remote);
    return remote;
  };

  EZ.syncRemote=async()=>{
    if(!EZ.authenticated)return;
    try{
      await EZ.api("/api/state",{
        method:"PUT",
        body:JSON.stringify({
          settings:EZ.state.settings,
          products:EZ.state.products,
          pages:EZ.state.pages
        })
      });
    }catch(error){
      EZ.toast("Cloud sync failed",error.message);
    }
  };

  EZ.save=()=>{
    EZ._localSave();
    if(!EZ.authenticated)return;
    clearTimeout(EZ._syncTimer);
    EZ._syncTimer=setTimeout(()=>EZ.syncRemote(),180);
  };

  EZ.showLogin=()=>{
    EZ.openModal(
      "Sign in to EZPay",
      "Your Cloudflare-backed dashboard is private. Public payment pages stay available without signing in.",
      '<form id="ownerLoginForm"><label class="field"><span>Owner password</span><input name="password" type="password" required minlength="8" autocomplete="current-password" placeholder="Enter owner password" /></label><div id="loginError" class="checkout-error hidden"></div><div class="form-actions"><button type="submit" class="primary-button">Sign in</button></div></form>'
    );
    EZ.$("modalClose").style.display="none";
    EZ.$("ownerLoginForm").onsubmit=async(event)=>{
      event.preventDefault();
      const form=new FormData(event.currentTarget);
      const box=EZ.$("loginError");
      box.classList.add("hidden");
      try{
        await EZ.api("/api/auth/login",{method:"POST",body:JSON.stringify({password:String(form.get("password")||"")})});
        EZ.authenticated=true;
        await EZ.loadRemote();
        EZ.$("modalClose").style.display="";
        EZ.closeModal();
        EZ.renderAll();
        EZ.toast("Signed in","Cloudflare D1 is now the source of truth.");
      }catch(error){
        box.textContent=error.message;
        box.classList.remove("hidden");
      }
    };
  };

  EZ.renderDeveloperResources=async()=>{
    if(!EZ.authenticated)return;
    try{
      const [keys,hooks]=await Promise.all([EZ.api("/api/api-keys"),EZ.api("/api/webhooks")]);
      const keyBox=EZ.$("apiKeysList");
      const hookBox=EZ.$("webhookList");
      if(keyBox) keyBox.innerHTML=keys.apiKeys.length?keys.apiKeys.map(k=>
        '<div class="developer-row"><div><strong>'+EZ.escape(k.name)+'</strong><small class="mono">'+EZ.escape(k.prefix)+'… · '+EZ.escape(k.scopes.join(","))+'</small></div><button data-revoke-key="'+EZ.escape(k.id)+'">Revoke</button></div>'
      ).join(""):'<div class="muted-cell">No API keys yet.</div>';
      if(hookBox) hookBox.innerHTML=hooks.endpoints.length?hooks.endpoints.map(h=>
        '<div class="developer-row"><div><strong>'+EZ.escape(h.url)+'</strong><small>'+ (h.active?"Active":"Disabled") +'</small></div><button data-delete-webhook="'+EZ.escape(h.id)+'">Delete</button></div>'
      ).join(""):'<div class="muted-cell">No webhook endpoints yet.</div>';
    }catch(error){
      EZ.toast("Developer data failed",error.message);
    }
  };

  EZ.createApiKey=()=>{
    EZ.openModal("Create API key","The raw key is shown once. Store it somewhere secure.",
      '<form id="createKeyForm"><label class="field"><span>Name</span><input name="name" required placeholder="Aura backend" /></label><label class="field"><span>Scopes</span><input name="scopes" value="*" placeholder="*" /></label><div class="form-actions"><button class="secondary-button" type="button" id="cancelKeyCreate">Cancel</button><button class="primary-button" type="submit">Create key</button></div></form>');
    EZ.$("cancelKeyCreate").onclick=EZ.closeModal;
    EZ.$("createKeyForm").onsubmit=async(e)=>{
      e.preventDefault();
      const fd=new FormData(e.currentTarget);
      try{
        const result=await EZ.api("/api/api-keys",{method:"POST",body:JSON.stringify({
          name:String(fd.get("name")||"API key"),
          scopes:String(fd.get("scopes")||"*").split(",").map(s=>s.trim()).filter(Boolean)
        })});
        EZ.$("modalBody").innerHTML='<div class="test-banner"><strong>Copy this key now</strong><br><code>'+EZ.escape(result.key)+'</code></div><div class="form-actions"><button class="primary-button" id="copyNewKey">Copy key</button></div>';
        EZ.$("copyNewKey").onclick=()=>EZ.copyText(result.key);
        EZ.renderDeveloperResources();
      }catch(error){EZ.toast("API key creation failed",error.message);}
    };
  };

  EZ.createWebhook=()=>{
    EZ.openModal("Add webhook endpoint","EZPay signs each delivery with your webhook signing secret.",
      '<form id="createWebhookForm"><label class="field"><span>HTTPS endpoint</span><input name="url" type="url" required placeholder="https://example.com/ezpay/webhook" /></label><div class="form-actions"><button class="secondary-button" type="button" id="cancelWebhookCreate">Cancel</button><button class="primary-button" type="submit">Add endpoint</button></div></form>');
    EZ.$("cancelWebhookCreate").onclick=EZ.closeModal;
    EZ.$("createWebhookForm").onsubmit=async(e)=>{
      e.preventDefault();
      const fd=new FormData(e.currentTarget);
      try{
        await EZ.api("/api/webhooks",{method:"POST",body:JSON.stringify({url:String(fd.get("url")||"")})});
        EZ.closeModal();EZ.renderDeveloperResources();EZ.toast("Webhook endpoint added");
      }catch(error){EZ.toast("Webhook creation failed",error.message);}
    };
  };

  EZ.bootstrap=async()=>{
    if(location.hash.startsWith("#/checkout/"))return;
    try{
      await EZ.api("/api/auth/me");
      EZ.authenticated=true;
      await EZ.loadRemote();
    }catch(error){
      if(error.status===401){
        EZ.authenticated=false;
        EZ.showLogin();
        return;
      }
      EZ.toast("Backend unavailable",error.message);
    }
  };
})();
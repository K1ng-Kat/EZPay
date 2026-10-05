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

  EZ.hideAuth=()=>{
    document.body.classList.remove("auth-required");
    EZ.$("authShell")?.classList.add("hidden");
  };

  EZ.showPasswordRotation=(knownCurrentPassword="")=>{
    document.body.classList.add("auth-required");
    const shell=EZ.$("authShell");
    shell?.classList.remove("hidden");
    const panel=shell?.querySelector(".auth-panel");
    if(!panel)return;
    panel.innerHTML=
      '<div class="auth-brand"><span class="auth-glyph">EZ</span><div><strong>EZPay</strong><small>Security checkpoint</small></div></div>'+
      '<div class="auth-copy"><span class="eyebrow">PASSWORD ROTATION REQUIRED</span><h1>Lock down your owner account.</h1><p>The bootstrap credential can never unlock the dashboard directly. Replace it with a unique 14+ character password before EZPay exposes protected data.</p></div>'+
      '<form id="passwordRotationForm" class="auth-form">'+
        '<label><span>Current password</span><input name="currentPassword" type="password" required autocomplete="current-password" value="'+EZ.escape(knownCurrentPassword)+'"></label>'+
        '<label><span>New password</span><input name="newPassword" type="password" required minlength="14" autocomplete="new-password" placeholder="14+ characters"></label>'+
        '<label><span>Confirm new password</span><input name="confirmPassword" type="password" required minlength="14" autocomplete="new-password" placeholder="Repeat new password"></label>'+
        '<div id="rotationError" class="auth-error hidden"></div>'+
        '<button type="submit" class="auth-submit">Secure account <span>→</span></button>'+
      '</form>'+
      '<div class="auth-security"><span></span>PBKDF2-SHA256 · 310,000 iterations · server-side session only.</div>';

    EZ.$("passwordRotationForm").onsubmit=async(event)=>{
      event.preventDefault();
      const data=new FormData(event.currentTarget);
      const currentPassword=String(data.get("currentPassword")||"");
      const next=String(data.get("newPassword")||"");
      const confirm=String(data.get("confirmPassword")||"");
      const errorBox=EZ.$("rotationError");
      errorBox.classList.add("hidden");
      if(next.length<14||next!==confirm){
        errorBox.textContent=next!==confirm?"Passwords do not match.":"Use at least 14 characters.";
        errorBox.classList.remove("hidden");
        return;
      }
      try{
        await EZ.api("/api/auth/change-password",{method:"POST",body:JSON.stringify({currentPassword,newPassword:next})});
        await EZ.loadRemote();
        EZ.hideAuth();
        EZ.renderAll();
        EZ.renderPageActions();
        EZ.toast("Owner account secured","Your new password is active.");
      }catch(error){
        errorBox.textContent=error.message;
        errorBox.classList.remove("hidden");
      }
    };
  };

  EZ.showLogin=()=>{
    document.body.classList.add("auth-required");
    const shell=EZ.$("authShell");
    shell?.classList.remove("hidden");
    const email=EZ.$("loginEmail");
    const password=EZ.$("loginPassword");
    const errorBox=EZ.$("loginError");
    if(email)email.value="mk3727.2012@gmail.com";
    if(password)password.value="";
    errorBox?.classList.add("hidden");

    const form=EZ.$("ownerLoginForm");
    if(!form)return;
    form.onsubmit=async(event)=>{
      event.preventDefault();
      const data=new FormData(event.currentTarget);
      const submittedPassword=String(data.get("password")||"");
      try{
        const result=await EZ.api("/api/auth/login",{method:"POST",body:JSON.stringify({
          email:"mk3727.2012@gmail.com",
          password:submittedPassword
        })});
        EZ.authenticated=true;
        if(result.mustChangePassword){
          EZ.showPasswordRotation(submittedPassword);
          return;
        }
        await EZ.loadRemote();
        EZ.hideAuth();
        EZ.renderAll();
        EZ.renderPageActions();
        EZ.toast("Welcome back","Private owner session unlocked.");
      }catch(error){
        const box=EZ.$("loginError");
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
    if(location.hash.startsWith("#/checkout/")||location.pathname.endsWith("/entitlement-test.html")){
      EZ.hideAuth();
      return;
    }
    document.body.classList.add("auth-required");
    try{
      const session=await EZ.api("/api/auth/me");
      EZ.authenticated=true;
      if(session.mustChangePassword){
        EZ.showPasswordRotation();
        return;
      }
      await EZ.loadRemote();
      EZ.hideAuth();
    }catch(error){
      if(error.status===401){
        EZ.authenticated=false;
        EZ.showLogin();
        return;
      }
      EZ.showLogin();
      const box=EZ.$("loginError");
      if(box){
        box.textContent="Backend unavailable: "+error.message;
        box.classList.remove("hidden");
      }
    }
  };

})();
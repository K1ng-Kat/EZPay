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
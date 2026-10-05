(() => {
  "use strict";
  const EZ=window.EZ;

  EZ.copyText=async(value)=>{
    try{await navigator.clipboard.writeText(value);}
    catch{
      const t=document.createElement("textarea");t.value=value;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove();
    }
    EZ.toast("Copied to clipboard",value);
  };

  EZ.openCheckout=(page)=>{
    if(!page||!page.published){EZ.toast("Payment page unavailable");return;}
    location.hash="/checkout/"+encodeURIComponent(page.slug);
  };

  EZ.renderCheckout=(page)=>{
    const product=EZ.product(page.productId);
    if(!product){EZ.$("checkoutRouteContent").innerHTML='<div class="card panel-pad">Missing product.</div>';return;}
    const prices=product.prices.filter((p)=>p.active);
    const defaultPrice=EZ.price(product,page.priceId)||prices[0];
    const accent=/^#[0-9a-f]{6}$/i.test(page.accent)?page.accent:"#635bff";
    const options=prices.map((p)=>'<option value="'+p.id+'"'+(p.id===defaultPrice?.id?" selected":"")+'>'+EZ.escape(p.nickname)+' · '+EZ.money(p.amount,p.currency)+' '+EZ.escape(EZ.interval(p))+'</option>').join("");
    EZ.$("checkoutRouteContent").innerHTML=
      '<div class="live-checkout"><div class="live-checkout-inner">'+
      '<section class="live-summary" style="background:linear-gradient(155deg,#10172a 0%,'+EZ.escape(accent)+' 160%)">'+
      '<div class="checkout-brand-preview">'+(page.logoData?'<img src="'+EZ.escape(page.logoData)+'" alt="" />':'<span class="brand-fallback">'+EZ.escape((page.brand||"E")[0].toUpperCase())+'</span>')+EZ.escape(page.brand||"EZPay")+'</div>'+
      '<h1>'+EZ.escape(page.headline)+'</h1><p>'+EZ.escape(page.description||product.description||"")+'</p>'+
      '<div class="live-price" id="livePrice">'+(defaultPrice?EZ.money(defaultPrice.amount,defaultPrice.currency):"$0.00")+' <small>'+EZ.escape(EZ.interval(defaultPrice))+'</small></div>'+
      '<div class="preview-order"><span>'+EZ.escape(product.name)+'</span><strong>Sandbox</strong></div></section>'+
      '<section class="live-form"><h2>Subscribe to '+EZ.escape(product.name)+'</h2><p>This checkout creates real sandbox customer, payment, and subscription records inside EZPay.</p>'+
      '<div class="test-banner"><strong>Test cards only:</strong> <code>4242 4242 4242 4242</code> succeeds · <code>4000 0000 0000 0002</code> declines. Real card numbers are rejected and never stored.</div>'+
      '<form id="liveCheckoutForm" class="checkout-form-grid">'+
      (page.collectName?'<label class="field"><span>Name</span><input name="name" required autocomplete="name" placeholder="Jane Appleseed" /></label>':"")+
      '<label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email" placeholder="jane@example.com" /></label>'+
      (prices.length>1?'<label class="field"><span>Plan</span><select name="priceId" id="livePriceSelect">'+options+'</select></label>':'<input type="hidden" name="priceId" value="'+EZ.escape(defaultPrice?.id||"")+'" />')+
      (page.collectAddress?'<label class="field"><span>Billing address</span><input name="address" required placeholder="123 Main Street" /></label>':"")+
      '<label class="field"><span>Card number</span><input name="card" required inputmode="numeric" autocomplete="off" placeholder="4242 4242 4242 4242" maxlength="19" /></label>'+
      '<div class="card-row"><label class="field"><span>Cardholder name</span><input name="cardName" required autocomplete="off" placeholder="Jane Appleseed" /></label><label class="field"><span>Expiry</span><input name="expiry" required autocomplete="off" placeholder="12/34" maxlength="5" /></label><label class="field"><span>CVC</span><input name="cvc" required autocomplete="off" inputmode="numeric" placeholder="123" maxlength="4" /></label></div>'+
      '<div id="checkoutError" class="checkout-error hidden"></div><button class="submit-payment" style="background:'+EZ.escape(accent)+'" type="submit">'+EZ.escape(page.buttonText||"Subscribe")+'</button></form></section></div></div>';

    EZ.$("livePriceSelect")?.addEventListener("change",(e)=>{
      const p=EZ.price(product,e.target.value);
      if(p)EZ.$("livePrice").innerHTML=EZ.money(p.amount,p.currency)+" <small>"+EZ.escape(EZ.interval(p))+"</small>";
    });
    document.querySelector('#liveCheckoutForm input[name="card"]')?.addEventListener("input",(e)=>{
      const digits=e.target.value.replace(/\D/g,"").slice(0,16);
      e.target.value=digits.replace(/(\d{4})(?=\d)/g,"$1 ");
    });
    EZ.$("liveCheckoutForm").onsubmit=(event)=>EZ.completeCheckout(event,page,product);
  };

  EZ.completeCheckout=async(event,page,product)=>{
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const priceId=String(form.get("priceId")||page.priceId);
    const error=EZ.$("checkoutError");
    error.classList.add("hidden");

    try{
      const result=await EZ.api("/api/checkout/complete",{
        method:"POST",
        headers:{"idempotency-key":crypto.randomUUID()},
        body:JSON.stringify({
          pageSlug:page.slug,
          priceId,
          name:String(form.get("name")||form.get("cardName")||"Customer").trim(),
          email:String(form.get("email")||"").trim().toLowerCase(),
          address:String(form.get("address")||"").trim(),
          card:String(form.get("card")||"").replace(/\D/g,"")
        })
      });

      if(EZ.authenticated){
        try{await EZ.loadRemote();EZ.renderAll();}catch{}
      }

      const entitlementBlock=result.entitlementToken
        ? '<div class="test-banner" style="text-align:left"><strong>Aura entitlement token</strong><br><code id="entitlementTokenValue">'+EZ.escape(result.entitlementToken)+'</code><br><span>Copy this into Aura while testing. Production Aura can verify it through EZPay.</span></div><div class="form-actions"><button class="secondary-button" id="copyEntitlementButton">Copy entitlement token</button><button class="primary-button" id="verifyEntitlementButton">Verify entitlement</button></div><div id="entitlementVerifyResult" class="muted-cell"></div>'
        : "";

      EZ.$("checkoutRouteContent").innerHTML=
        '<div class="live-checkout"><div class="checkout-success-view"><div class="success-check">✓</div><h2>'+EZ.escape(result.successMessage||page.successMessage||"Payment successful")+'</h2><p>'+
        (result.subscription
          ? 'EZPay created payment '+EZ.escape(result.payment.id)+' and subscription '+EZ.escape(result.subscription.id)+'.'
          : 'EZPay created payment '+EZ.escape(result.payment.id)+'.')+
        '</p>'+entitlementBlock+'<button class="primary-button" id="successDashboardButton">View in EZPay</button></div></div>';

      EZ.$("copyEntitlementButton")?.addEventListener("click",()=>EZ.copyText(result.entitlementToken));
      EZ.$("verifyEntitlementButton")?.addEventListener("click",async()=>{
        const box=EZ.$("entitlementVerifyResult");
        try{
          const verified=await EZ.api("/api/v1/entitlements/verify",{method:"POST",body:JSON.stringify({token:result.entitlementToken})});
          box.textContent=verified.active?"Verified: Aura Pro is active through "+new Date(verified.currentPeriodEnd).toLocaleString():"Verified: "+verified.status;
          box.dataset.active=verified.active?"true":"false";
        }catch(error){
          box.textContent="Verification failed: "+error.message;
          box.dataset.active="false";
        }
      });
      EZ.$("successDashboardButton").onclick=()=>{
        history.replaceState(null,"",location.pathname+"#/subscriptions");
        EZ.$("checkoutRoute").classList.add("hidden");
        EZ.setView(result.subscription?"subscriptions":"payments");
      };
    }catch(apiError){
      const message=apiError?.data?.error?.message||apiError.message||"Payment failed";
      error.textContent=message;
      error.classList.remove("hidden");
      if(EZ.authenticated){
        try{await EZ.loadRemote();EZ.renderAll();}catch{}
      }
    }
  };

  EZ.handleRoute=async()=>{
    const hash=location.hash||"";
    if(hash.startsWith("#/checkout/")){
      const slug=decodeURIComponent(hash.slice("#/checkout/".length));
      EZ.$("checkoutRoute").classList.remove("hidden");
      try{
        const data=await EZ.api("/api/public/pages/"+encodeURIComponent(slug));
        const product={...data.product,created:Date.now()};
        const page={...data.page,created:Date.now(),updated:Date.now()};
        const pi=EZ.state.products.findIndex((p)=>p.id===product.id);
        if(pi>=0)EZ.state.products[pi]=product;else EZ.state.products.push(product);
        const gi=EZ.state.pages.findIndex((p)=>p.id===page.id);
        if(gi>=0)EZ.state.pages[gi]=page;else EZ.state.pages.push(page);
        EZ.renderCheckout(page);
      }catch(error){
        EZ.$("checkoutRouteContent").innerHTML='<article class="card panel-pad"><h2>Payment page unavailable</h2><p class="muted-cell">'+EZ.escape(error.message)+'</p></article>';
      }
      return;
    }
    EZ.$("checkoutRoute").classList.add("hidden");
    if(hash.startsWith("#/"))EZ.setView(hash.slice(2));
  };

  EZ.exportCsv=(kind)=>{
    let rows=[];
    if(kind==="payments")rows=[["id","amount","currency","status","customer_email","description","method","created"],...EZ.state.payments.map((p)=>[p.id,p.amount,p.currency,p.status,p.customerEmail,p.description,p.method,new Date(p.created).toISOString()])];
    if(kind==="customers")rows=[["id","name","email","created"],...EZ.state.customers.map((c)=>[c.id,c.name,c.email,new Date(c.created).toISOString()])];
    if(kind==="subscriptions")rows=[["id","customer_email","product_id","price_id","status","started","current_period_end"],...EZ.state.subscriptions.map((s)=>[s.id,s.customerEmail,s.productId,s.priceId,s.status,new Date(s.started).toISOString(),new Date(s.currentPeriodEnd).toISOString()])];
    const csv=rows.map((row)=>row.map((cell)=>'"'+String(cell??"").replaceAll('"','""')+'"').join(",")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    const a=document.createElement("a");a.href=url;a.download="ezpay-"+kind+".csv";a.click();URL.revokeObjectURL(url);
    EZ.toast("CSV exported",kind+".csv");
  };

  EZ.createPayout=async()=>{
    try{
      const result=await EZ.api("/api/payouts",{method:"POST",body:JSON.stringify({})});
      await EZ.loadRemote();
      EZ.renderAll();
      EZ.toast("Sandbox payout created",EZ.money(result.payout.amount));
    }catch(error){
      EZ.toast("Payout failed",error.message);
    }
  };

  EZ.globalSearch=(query)=>{
    const q=String(query||"").trim().toLowerCase();if(!q)return;
    const page=EZ.state.pages.find((p)=>p.name.toLowerCase().includes(q)||p.slug.includes(q));if(page){EZ.setView("pages");return;}
    const product=EZ.state.products.find((p)=>p.name.toLowerCase().includes(q));if(product){EZ.setView("products");return;}
    const customer=EZ.state.customers.find((c)=>(c.name+" "+c.email).toLowerCase().includes(q));if(customer){EZ.setView("customers");EZ.$("customerSearch").value=customer.email;EZ.renderCustomers();return;}
    const payment=EZ.state.payments.find((p)=>(p.customerEmail+" "+p.description).toLowerCase().includes(q));if(payment){EZ.setView("payments");EZ.$("paymentSearch").value=payment.customerEmail;EZ.renderPayments();return;}
    EZ.toast("No matching EZPay record",query);
  };

  document.addEventListener("click",(event)=>{
    const nav=event.target.closest(".nav-item");
    if(nav){location.hash="/"+nav.dataset.view;EZ.setView(nav.dataset.view);return;}
    const jump=event.target.closest("[data-view-jump]");
    if(jump){location.hash="/"+jump.dataset.viewJump;EZ.setView(jump.dataset.viewJump);return;}
    const action=event.target.closest("[data-action]");
    if(action){
      const type=action.dataset.action;
      if(type==="new-product")EZ.productForm();
      if(type==="new-page")EZ.openBuilder();
      if(type==="open-aura")EZ.openCheckout(EZ.state.pages.find((p)=>p.slug==="aura-pro"));
      if(type==="export-payments")EZ.exportCsv("payments");
      if(type==="export-customers")EZ.exportCsv("customers");
      if(type==="export-subscriptions")EZ.exportCsv("subscriptions");
      return;
    }
    const editProduct=event.target.closest("[data-edit-product]");if(editProduct){EZ.productForm(EZ.product(editProduct.dataset.editProduct));return;}
    const productPage=event.target.closest("[data-product-page]");if(productPage){EZ.openBuilder(null,productPage.dataset.productPage);return;}
    const editPage=event.target.closest("[data-edit-page]");if(editPage){EZ.openBuilder(editPage.dataset.editPage);return;}
    const openPage=event.target.closest("[data-open-page]");if(openPage){EZ.openCheckout(EZ.page(openPage.dataset.openPage));return;}
    const copyPage=event.target.closest("[data-copy-page]");if(copyPage){const page=EZ.page(copyPage.dataset.copyPage);if(page)EZ.copyText(EZ.pageLink(page));}
    const cancelSub=event.target.closest("[data-cancel-sub]");
    if(cancelSub){
      (async()=>{try{
        await EZ.api("/api/subscriptions/"+encodeURIComponent(cancelSub.dataset.cancelSub)+"/cancel",{method:"POST",body:JSON.stringify({})});
        await EZ.loadRemote();EZ.renderAll();EZ.toast("Subscription canceled");
      }catch(error){EZ.toast("Cancel failed",error.message);}})();
      return;
    }
    const revokeKey=event.target.closest("[data-revoke-key]");
    if(revokeKey){
      (async()=>{try{
        await EZ.api("/api/api-keys/"+encodeURIComponent(revokeKey.dataset.revokeKey),{method:"DELETE"});
        await EZ.renderDeveloperResources();EZ.toast("API key revoked");
      }catch(error){EZ.toast("Revoke failed",error.message);}})();
      return;
    }
    const deleteWebhook=event.target.closest("[data-delete-webhook]");
    if(deleteWebhook){
      (async()=>{try{
        await EZ.api("/api/webhooks/"+encodeURIComponent(deleteWebhook.dataset.deleteWebhook),{method:"DELETE"});
        await EZ.renderDeveloperResources();EZ.toast("Webhook removed");
      }catch(error){EZ.toast("Delete failed",error.message);}})();
      return;
    }
  });

  EZ.$("logoutButton").onclick=async()=>{
    try{await EZ.api("/api/auth/logout",{method:"POST",body:JSON.stringify({})});}catch{}
    EZ.authenticated=false;
    EZ.toast("Signed out");
    EZ.showLogin();
  };
  EZ.$("createApiKeyButton").onclick=()=>EZ.createApiKey();
  EZ.$("addWebhookButton").onclick=()=>EZ.createWebhook();
  EZ.$("mobileMenu").onclick=()=>EZ.$("sidebar").classList.toggle("open");
  EZ.$("refreshButton").onclick=async()=>{try{if(EZ.authenticated)await EZ.loadRemote();EZ.renderAll();EZ.toast("EZPay refreshed");}catch(error){EZ.toast("Refresh failed",error.message);}};
  EZ.$("modalClose").onclick=EZ.closeModal;
  EZ.$("modalBackdrop").onclick=(e)=>{if(e.target===EZ.$("modalBackdrop"))EZ.closeModal();};
  EZ.$("paymentSearch").oninput=EZ.renderPayments;
  EZ.$("paymentStatusFilter").onchange=EZ.renderPayments;
  EZ.$("customerSearch").oninput=EZ.renderCustomers;
  EZ.$("subscriptionSearch").oninput=EZ.renderSubscriptions;
  EZ.$("createPayoutButton").onclick=EZ.createPayout;
  EZ.$("globalSearch").addEventListener("keydown",(e)=>{if(e.key==="Enter")EZ.globalSearch(e.target.value);});

  window.addEventListener("keydown",(e)=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();EZ.$("globalSearch").focus();}
    if(e.key==="Escape"){if(!EZ.$("pageBuilder").classList.contains("hidden"))EZ.closeBuilder();if(!EZ.$("modalBackdrop").classList.contains("hidden"))EZ.closeModal();}
  });

  EZ.$("settingAccentColor").oninput=(e)=>EZ.$("settingAccentHex").value=e.target.value;
  EZ.$("settingAccentHex").oninput=(e)=>{if(/^#[0-9a-f]{6}$/i.test(e.target.value))EZ.$("settingAccentColor").value=e.target.value;};
  EZ.$("saveSettingsButton").onclick=()=>{
    EZ.state.settings.businessName=EZ.$("settingBusinessName").value.trim()||"EZPay";
    EZ.state.settings.accent=/^#[0-9a-f]{6}$/i.test(EZ.$("settingAccentHex").value)?EZ.$("settingAccentHex").value:EZ.$("settingAccentColor").value;
    EZ.state.settings.supportEmail=EZ.$("settingSupportEmail").value.trim();
    EZ.save();EZ.toast("Settings saved");
  };

  EZ.$("resetDemoButton").onclick=()=>{
    EZ.openModal("Reset sandbox data?","This restores the seeded Aura product and checkout.",
      '<p style="font-size:9px;color:#667085;line-height:1.6">This clears the sandbox records stored by EZPay in this browser.</p><div class="form-actions"><button class="secondary-button" id="resetCancel">Cancel</button><button class="primary-button" id="resetConfirm">Reset sandbox</button></div>');
    EZ.$("resetCancel").onclick=EZ.closeModal;
    EZ.$("resetConfirm").onclick=async()=>{try{if(EZ.authenticated){await EZ.api("/api/admin/reset",{method:"POST",body:JSON.stringify({})});await EZ.loadRemote();}else{EZ.state=EZ.defaultState();EZ._localSave();}EZ.closeModal();EZ.renderAll();EZ.toast("Sandbox reset");}catch(error){EZ.toast("Reset failed",error.message);}};
  };

  EZ.$("builderClose").onclick=EZ.closeBuilder;
  EZ.$("builderPublishButton").onclick=EZ.publishBuilder;
  EZ.$("builderPreviewButton").onclick=()=>{
    const page=EZ.editingPageId?EZ.page(EZ.editingPageId):null;
    if(page)EZ.openCheckout(page);else EZ.toast("Publish first","Publishing creates a shareable checkout URL.");
  };
  EZ.$("builderLogo").addEventListener("change",(event)=>{
    const file=event.target.files?.[0];
    if(!file)return;
    if(file.size>400*1024){EZ.toast("Logo is too large","Use an image under 400 KB.");event.target.value="";return;}
    const reader=new FileReader();
    reader.onload=()=>{EZ.builderLogoData=String(reader.result||"");EZ.updatePreview();EZ.toast("Logo added");};
    reader.readAsDataURL(file);
  });

  EZ.$("builderProduct").onchange=()=>{
    EZ.populateBuilderPrices();
    const product=EZ.product(EZ.$("builderProduct").value);
    if(product)EZ.$("builderDescription").value=product.description||"";
    EZ.updatePreview();
  };
  ["builderPrice","builderName","builderHeadline","builderDescription","builderButtonText","builderSuccessMessage","builderBrand","builderAccent","builderAccentHex","builderCollectName","builderCollectAddress","builderTrialDays"].forEach((id)=>{
    const node=EZ.$(id);
    node.addEventListener(node.type==="checkbox"||node.tagName==="SELECT"?"change":"input",()=>{
      if(id==="builderAccent")EZ.$("builderAccentHex").value=node.value;
      if(id==="builderAccentHex"&&/^#[0-9a-f]{6}$/i.test(node.value))EZ.$("builderAccent").value=node.value;
      EZ.updatePreview();
    });
  });

  EZ.$("checkoutBackButton").onclick=()=>{history.replaceState(null,"",location.pathname+"#/pages");EZ.$("checkoutRoute").classList.add("hidden");EZ.setView("pages");};
  window.addEventListener("hashchange",EZ.handleRoute);

  EZ.renderAll();
  EZ.renderPageActions();
  EZ.handleRoute();
})();
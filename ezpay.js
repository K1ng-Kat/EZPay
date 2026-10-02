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
      const digits=e.target.value.replace(/D/g,"").slice(0,16);
      e.target.value=digits.replace(/(d{4})(?=d)/g,"$1 ");
    });
    EZ.$("liveCheckoutForm").onsubmit=(event)=>EZ.completeCheckout(event,page,product);
  };

  EZ.completeCheckout=(event,page,product)=>{
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const card=String(form.get("card")||"").replace(/D/g,"");
    const email=String(form.get("email")||"").trim().toLowerCase();
    const name=String(form.get("name")||form.get("cardName")||"Customer").trim();
    const priceId=String(form.get("priceId")||page.priceId);
    const price=EZ.price(product,priceId);
    const error=EZ.$("checkoutError");
    error.classList.add("hidden");
    if(!price){error.textContent="That price is no longer available.";error.classList.remove("hidden");return;}

    const allowed=["4242424242424242","5555555555554444","4000000000000002"];
    if(!allowed.includes(card)){
      error.textContent="Sandbox safety rule: only the listed EZPay test card numbers are accepted. Do not enter a real card.";
      error.classList.remove("hidden");return;
    }
    if(card==="4000000000000002"){
      EZ.state.payments.push({id:EZ.uid("pay"),amount:price.amount,currency:price.currency,status:"failed",customerId:null,customerEmail:email,productId:product.id,priceId:price.id,description:product.name+" · "+price.nickname,method:"Test card •••• 0002",created:Date.now()});
      EZ.save();EZ.renderAll();error.textContent="Your test card was declined. Use 4242 4242 4242 4242 for success.";error.classList.remove("hidden");return;
    }

    let customer=EZ.state.customers.find((c)=>c.email.toLowerCase()===email);
    if(!customer){customer={id:EZ.uid("cus"),name,email,created:Date.now()};EZ.state.customers.push(customer);}
    else if(name)customer.name=name;

    const payment={id:EZ.uid("pay"),amount:price.amount,currency:price.currency,status:"succeeded",customerId:customer.id,customerEmail:email,productId:product.id,priceId:price.id,description:product.name+" · "+price.nickname,method:"Test card •••• "+card.slice(-4),created:Date.now()};
    EZ.state.payments.push(payment);

    let subscription=null;
    if(price.interval!=="one_time"){
      subscription=EZ.state.subscriptions.find((s)=>s.customerId===customer.id&&s.productId===product.id&&["active","trialing"].includes(s.status));
      if(subscription){
        subscription.priceId=price.id;
        subscription.status=page.trialDays>0?"trialing":"active";
        subscription.currentPeriodEnd=page.trialDays>0?Date.now()+page.trialDays*86400000:EZ.nextRenewal(Date.now(),price.interval);
      }else{
        subscription={id:EZ.uid("sub"),customerId:customer.id,customerEmail:email,productId:product.id,priceId:price.id,status:page.trialDays>0?"trialing":"active",started:Date.now(),currentPeriodEnd:page.trialDays>0?Date.now()+page.trialDays*86400000:EZ.nextRenewal(Date.now(),price.interval),paymentPageId:page.id};
        EZ.state.subscriptions.push(subscription);
      }
    }

    EZ.save();EZ.renderAll();
    EZ.$("checkoutRouteContent").innerHTML=
      '<div class="live-checkout"><div class="checkout-success-view"><div class="success-check">✓</div><h2>'+EZ.escape(page.successMessage||"Payment successful")+'</h2><p>'+
      (price.interval==="one_time"?"A successful sandbox payment was created for "+EZ.escape(email)+".":"EZPay created customer "+EZ.escape(customer.id)+", payment "+EZ.escape(payment.id)+", and subscription "+EZ.escape(subscription?.id||"")+".")+
      '</p><button class="primary-button" id="successDashboardButton">View in EZPay</button></div></div>';
    EZ.$("successDashboardButton").onclick=()=>{
      history.replaceState(null,"",location.pathname+"#/subscriptions");
      EZ.$("checkoutRoute").classList.add("hidden");
      EZ.setView(price.interval==="one_time"?"payments":"subscriptions");
    };
  };

  EZ.handleRoute=()=>{
    const hash=location.hash||"";
    if(hash.startsWith("#/checkout/")){
      const page=EZ.pageSlug(decodeURIComponent(hash.slice("#/checkout/".length)));
      EZ.$("checkoutRoute").classList.remove("hidden");
      if(page)EZ.renderCheckout(page);
      else EZ.$("checkoutRouteContent").innerHTML='<article class="card panel-pad"><h2>Payment page not found</h2><p class="muted-cell">This page may be unpublished or deleted.</p></article>';
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

  EZ.createPayout=()=>{
    const m=EZ.metrics();
    if(m.available<=0){EZ.toast("No available balance");return;}
    EZ.state.payouts.push({id:EZ.uid("po"),amount:m.available,currency:"usd",status:"paid",destination:"Sandbox balance",created:Date.now()});
    EZ.save();EZ.renderAll();EZ.toast("Sandbox payout created",EZ.money(m.available));
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
  });

  EZ.$("mobileMenu").onclick=()=>EZ.$("sidebar").classList.toggle("open");
  EZ.$("refreshButton").onclick=()=>{EZ.renderAll();EZ.toast("EZPay refreshed");};
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
    EZ.$("resetConfirm").onclick=()=>{EZ.state=EZ.defaultState();EZ.save();EZ.closeModal();EZ.renderAll();EZ.toast("Sandbox reset");};
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
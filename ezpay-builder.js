(() => {
  "use strict";
  const EZ=window.EZ;
  EZ.editingPageId=null;
  EZ.builderLogoData="";

  EZ.openModal=(title,subtitle,html)=>{
    EZ.$("modalTitle").textContent=title;
    EZ.$("modalSubtitle").textContent=subtitle||"";
    EZ.$("modalBody").innerHTML=html;
    EZ.$("modalBackdrop").classList.remove("hidden");
  };
  EZ.closeModal=()=>{EZ.$("modalBackdrop").classList.add("hidden");EZ.$("modalBody").innerHTML="";};

  EZ.productForm=(product=null)=>{
    const existing=!!product;
    const monthly=product?.prices.find((p)=>p.interval==="month");
    const annual=product?.prices.find((p)=>p.interval==="year");
    const oneTime=product?.prices.find((p)=>p.interval==="one_time");
    const html=
      '<form id="productForm"><div class="form-grid">'+
      '<label class="field full-span"><span>Product name</span><input required name="name" value="'+EZ.escape(product?.name||"")+'" placeholder="Aura Pro" /></label>'+
      '<label class="field full-span"><span>Description</span><textarea name="description" rows="3">'+EZ.escape(product?.description||"")+'</textarea></label>'+
      '<label class="field"><span>Monthly price (USD)</span><input name="monthly" inputmode="decimal" value="'+(monthly?(monthly.amount/100).toFixed(2):"")+'" placeholder="14.99" /></label>'+
      '<label class="field"><span>Yearly price (USD)</span><input name="annual" inputmode="decimal" value="'+(annual?(annual.amount/100).toFixed(2):"")+'" placeholder="149.00" /></label>'+
      '<label class="field"><span>One-time price (USD)</span><input name="oneTime" inputmode="decimal" value="'+(oneTime?(oneTime.amount/100).toFixed(2):"")+'" placeholder="79.00" /></label>'+
      '</div><div class="form-actions">'+
      (existing?'<button type="button" class="secondary-button" id="deleteProductButton">Delete</button>':"")+
      '<button type="button" class="secondary-button" id="cancelProductButton">Cancel</button>'+
      '<button type="submit" class="primary-button">'+(existing?"Save changes":"Add product")+'</button></div></form>';
    EZ.openModal(existing?"Edit product":"Add product","Products describe what you sell. Prices define how much and how often.",html);
    EZ.$("cancelProductButton").onclick=EZ.closeModal;
    if(existing)EZ.$("deleteProductButton").onclick=()=>{
      if(EZ.state.pages.some((p)=>p.productId===product.id)||EZ.state.subscriptions.some((s)=>s.productId===product.id)){
        EZ.toast("Can't delete product","Remove linked payment pages/subscriptions first.");return;
      }
      EZ.state.products=EZ.state.products.filter((p)=>p.id!==product.id);
      EZ.save();EZ.closeModal();EZ.renderAll();EZ.toast("Product deleted");
    };
    EZ.$("productForm").onsubmit=(event)=>{
      event.preventDefault();
      const form=new FormData(event.currentTarget);
      const name=String(form.get("name")||"").trim();
      if(!name)return;
      let target=product;
      if(!target){target={id:EZ.uid("prod"),name,description:"",created:Date.now(),prices:[]};EZ.state.products.push(target);}
      target.name=name;
      target.description=String(form.get("description")||"").trim();
      [["month","Monthly",form.get("monthly")],["year","Annual",form.get("annual")],["one_time","One time",form.get("oneTime")]].forEach(([interval,nickname,raw])=>{
        const amount=Math.round(Number(raw)*100);
        const current=target.prices.find((p)=>p.interval===interval);
        if(Number.isFinite(amount)&&amount>0){
          if(current){current.amount=amount;current.active=true;current.nickname=nickname;}
          else target.prices.push({id:EZ.uid("price"),amount,currency:"usd",interval,nickname,active:true});
        }else if(current)current.active=false;
      });
      EZ.save();EZ.closeModal();EZ.renderAll();EZ.toast(existing?"Product updated":"Product created",name);
    };
  };

  EZ.populateBuilderProducts=(productId)=>{
    EZ.$("builderProduct").innerHTML=EZ.state.products.map((p)=>'<option value="'+p.id+'">'+EZ.escape(p.name)+'</option>').join("");
    if(productId&&EZ.state.products.some((p)=>p.id===productId))EZ.$("builderProduct").value=productId;
    EZ.populateBuilderPrices();
  };
  EZ.populateBuilderPrices=(priceId)=>{
    const product=EZ.product(EZ.$("builderProduct").value);
    const prices=product?.prices.filter((p)=>p.active)||[];
    EZ.$("builderPrice").innerHTML=prices.map((p)=>'<option value="'+p.id+'">'+EZ.escape(p.nickname)+' · '+EZ.money(p.amount,p.currency)+' '+EZ.escape(EZ.interval(p))+'</option>').join("");
    if(priceId&&prices.some((p)=>p.id===priceId))EZ.$("builderPrice").value=priceId;
  };
  EZ.builderDraft=()=>({
    id:EZ.editingPageId||EZ.uid("page"),
    name:EZ.$("builderName").value.trim()||"Untitled checkout",
    productId:EZ.$("builderProduct").value,
    priceId:EZ.$("builderPrice").value,
    headline:EZ.$("builderHeadline").value.trim()||"Complete your purchase",
    description:EZ.$("builderDescription").value.trim(),
    brand:EZ.$("builderBrand").value.trim()||EZ.state.settings.businessName,
    logoData:EZ.builderLogoData||"",
    accent:EZ.$("builderAccent").value||"#635bff",
    buttonText:EZ.$("builderButtonText").value.trim()||"Subscribe",
    successMessage:EZ.$("builderSuccessMessage").value.trim()||"You're all set.",
    collectName:EZ.$("builderCollectName").checked,
    collectAddress:EZ.$("builderCollectAddress").checked,
    trialDays:Math.max(0,Math.min(365,Number(EZ.$("builderTrialDays").value)||0))
  });

  EZ.previewHtml=(page)=>{
    const product=EZ.product(page.productId);
    const price=EZ.price(product,page.priceId);
    const accent=/^#[0-9a-f]{6}$/i.test(page.accent)?page.accent:"#635bff";
    return '<div class="checkout-shell-preview">'+
      '<section class="checkout-summary-preview" style="background:linear-gradient(155deg,#10172a 0%,'+EZ.escape(accent)+' 160%)">'+
      '<div class="checkout-brand-preview">'+(page.logoData?'<img src="'+EZ.escape(page.logoData)+'" alt="" />':'<span class="brand-fallback">'+EZ.escape((page.brand||"E")[0].toUpperCase())+'</span>')+EZ.escape(page.brand||"EZPay")+'</div>'+
      '<h2>'+EZ.escape(page.headline)+'</h2><p>'+EZ.escape(page.description||product?.description||"")+'</p>'+
      '<div class="checkout-price-preview">'+(price?EZ.money(price.amount,price.currency):"$0.00")+' <span>'+EZ.escape(EZ.interval(price))+'</span></div>'+
      '<div class="preview-order"><span>'+EZ.escape(product?.name||"Product")+'</span><strong>'+(price?EZ.money(price.amount,price.currency):"—")+'</strong></div></section>'+
      '<section class="checkout-form-preview"><h3>Subscribe</h3><p>Customer information and sandbox payment method.</p>'+
      (page.collectName?'<div class="preview-field"><span>Name</span><b>Jane Appleseed</b></div>':"")+
      '<div class="preview-field"><span>Email</span><b>jane@example.com</b></div>'+
      (page.collectAddress?'<div class="preview-field"><span>Billing address</span><b>123 Main Street</b></div>':"")+
      '<div class="preview-wallets"><div class="preview-wallet"> Pay</div><div class="preview-wallet light">G Pay</div></div>'+
      '<div class="preview-field"><span>Card information</span><b>4242 4242 4242 4242</b></div>'+
      '<button class="preview-button" style="background:'+EZ.escape(accent)+'">'+EZ.escape(page.buttonText||"Subscribe")+'</button></section></div>';
  };
  EZ.updatePreview=()=>{EZ.$("builderPreview").innerHTML=EZ.previewHtml(EZ.builderDraft());};

  EZ.openBuilder=(pageId=null,productId=null)=>{
    if(!EZ.state.products.length){EZ.toast("Create a product first","A payment page needs a product and active price.");EZ.productForm();return;}
    EZ.editingPageId=pageId;
    const page=pageId?EZ.clone(EZ.page(pageId)):null;
    EZ.$("pageBuilder").classList.remove("hidden");
    EZ.$("builderTitle").textContent=page?"Edit "+page.name:"Create payment page";
    EZ.$("builderStatus").textContent=page?.published?"Published":"Draft";
    EZ.populateBuilderProducts(page?.productId||productId||EZ.state.products[0].id);
    EZ.populateBuilderPrices(page?.priceId);
    const product=EZ.product(EZ.$("builderProduct").value);
    EZ.$("builderName").value=page?.name||(product?product.name+" checkout":"Checkout");
    EZ.$("builderHeadline").value=page?.headline||(product?"Upgrade to "+product.name:"Complete your purchase");
    EZ.$("builderDescription").value=page?.description||product?.description||"";
    EZ.$("builderButtonText").value=page?.buttonText||"Subscribe";
    EZ.$("builderSuccessMessage").value=page?.successMessage||"You're all set. Your subscription is active.";
    EZ.$("builderBrand").value=page?.brand||(product?.name.startsWith("Aura")?"Aura":EZ.state.settings.businessName);
    EZ.builderLogoData=page?.logoData||"";
    EZ.$("builderLogo").value="";
    EZ.$("builderAccent").value=page?.accent||EZ.state.settings.accent;
    EZ.$("builderAccentHex").value=page?.accent||EZ.state.settings.accent;
    EZ.$("builderCollectName").checked=page?.collectName??true;
    EZ.$("builderCollectAddress").checked=page?.collectAddress??false;
    EZ.$("builderTrialDays").value=String(page?.trialDays||0);
    EZ.updatePreview();
  };
  EZ.closeBuilder=()=>{EZ.$("pageBuilder").classList.add("hidden");EZ.editingPageId=null;};
  EZ.publishBuilder=()=>{
    const draft=EZ.builderDraft();
    const product=EZ.product(draft.productId);
    const price=EZ.price(product,draft.priceId);
    if(!product||!price){EZ.toast("Choose a product and price");return;}
    const existing=EZ.editingPageId?EZ.page(EZ.editingPageId):null;
    let slug=existing?.slug||EZ.slugify(draft.name||product.name),unique=slug,index=2;
    while(EZ.state.pages.some((p)=>p.id!==draft.id&&p.slug===unique))unique=slug+"-"+index++;
    const saved={...draft,slug:unique,published:true,created:existing?.created||Date.now(),updated:Date.now()};
    if(existing)Object.assign(existing,saved);
    else{EZ.state.pages.push(saved);EZ.editingPageId=saved.id;}
    EZ.save();EZ.renderAll();EZ.$("builderStatus").textContent="Published";EZ.toast("Payment page published",EZ.pageLink(saved));
  };
})();
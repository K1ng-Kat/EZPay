(() => {
  "use strict";
  const EZ = window.EZ = window.EZ || {};
  EZ.STORAGE_KEY = "ezpay_sandbox_v3";
  EZ.$ = (id) => document.getElementById(id);
  EZ.uid = (prefix) => prefix + "_" + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-5);
  EZ.escape = (value="") => String(value).replace(/[&<>"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
  EZ.money = (amount=0,currency="usd") => new Intl.NumberFormat("en-US",{style:"currency",currency:currency.toUpperCase()}).format(amount/100);
  EZ.shortDate = (ts) => new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric"}).format(new Date(ts));
  EZ.shortTime = (ts) => new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(ts));
  EZ.slugify = (value) => String(value||"payment").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"payment";
  EZ.clone = (value) => JSON.parse(JSON.stringify(value));

  EZ.defaultState = () => {
    const now=Date.now();
    return {
      version:3,
      settings:{businessName:"EZPay",accent:"#635bff",supportEmail:"support@example.com"},
      products:[{
        id:"prod_aura",name:"Aura Pro",
        description:"Premium access to Aura, including advanced automation, experimental features, and Aura Studio.",
        created:now-691200000,
        prices:[
          {id:"price_aura_monthly",amount:1499,currency:"usd",interval:"month",nickname:"Monthly",active:true},
          {id:"price_aura_annual",amount:14900,currency:"usd",interval:"year",nickname:"Annual",active:true}
        ]
      }],
      pages:[{
        id:"page_aura_pro",slug:"aura-pro",name:"Aura Pro",productId:"prod_aura",priceId:"price_aura_annual",
        headline:"Upgrade to Aura Pro",
        description:"Unlock the full Aura experience with premium wallpaper automation, Aura Studio, experimental features, and more.",
        brand:"Aura",accent:"#635bff",buttonText:"Subscribe to Aura Pro",
        successMessage:"Aura Pro is active. You can return to Aura and unlock your premium features.",
        collectName:true,collectAddress:false,trialDays:0,published:true,created:now-345600000,updated:now-7200000
      }],
      customers:[{id:"cus_demo_1",name:"Demo Customer",email:"demo@example.com",created:now-172800000}],
      payments:[{
        id:"pay_demo_1",amount:14900,currency:"usd",status:"succeeded",customerId:"cus_demo_1",
        customerEmail:"demo@example.com",productId:"prod_aura",priceId:"price_aura_annual",
        description:"Aura Pro · Annual",method:"Test card •••• 4242",created:now-2520000
      }],
      subscriptions:[{
        id:"sub_demo_1",customerId:"cus_demo_1",customerEmail:"demo@example.com",productId:"prod_aura",
        priceId:"price_aura_annual",status:"active",started:now-2520000,currentPeriodEnd:now+31536000000,
        paymentPageId:"page_aura_pro"
      }],
      payouts:[],
      chartBars:[31,44,38,59,48,54,67,52,72,62,69,81,58,65,76,70,84,61,73,79,66,88,75,82]
    };
  };

  EZ.load = () => {
    try {
      const parsed=JSON.parse(localStorage.getItem(EZ.STORAGE_KEY)||"null");
      return parsed&&parsed.version===3?parsed:EZ.defaultState();
    } catch { return EZ.defaultState(); }
  };
  EZ.state = EZ.load();
  EZ.save = () => localStorage.setItem(EZ.STORAGE_KEY,JSON.stringify(EZ.state));
  EZ.product = (id) => EZ.state.products.find((x)=>x.id===id);
  EZ.page = (id) => EZ.state.pages.find((x)=>x.id===id);
  EZ.pageSlug = (slug) => EZ.state.pages.find((x)=>x.slug===slug&&x.published);
  EZ.customer = (id) => EZ.state.customers.find((x)=>x.id===id);
  EZ.price = (product,id) => product?.prices?.find((x)=>x.id===id)||null;
  EZ.interval = (price) => !price?"":price.interval==="one_time"?"one time":"per "+price.interval;
  EZ.nextRenewal = (from,interval) => {
    const d=new Date(from);
    if(interval==="year")d.setFullYear(d.getFullYear()+1);
    else if(interval==="week")d.setDate(d.getDate()+7);
    else d.setMonth(d.getMonth()+1);
    return d.getTime();
  };
  EZ.metrics = () => {
    const successful=EZ.state.payments.filter((p)=>p.status==="succeeded");
    const failed=EZ.state.payments.filter((p)=>p.status==="failed");
    const gross=successful.reduce((s,p)=>s+p.amount,0);
    const activeSubs=EZ.state.subscriptions.filter((s)=>["active","trialing"].includes(s.status));
    let mrr=0;
    activeSubs.forEach((sub)=>{
      const price=EZ.price(EZ.product(sub.productId),sub.priceId);
      if(!price)return;
      if(price.interval==="month")mrr+=price.amount;
      if(price.interval==="year")mrr+=Math.round(price.amount/12);
      if(price.interval==="week")mrr+=Math.round(price.amount*4.345);
    });
    const paidOut=EZ.state.payouts.filter((p)=>p.status==="paid").reduce((s,p)=>s+p.amount,0);
    return {successful,failed,gross,activeSubs,mrr,available:Math.max(0,gross-paidOut)};
  };
  EZ.statusPill = (status) => {
    const tone=["succeeded","active","paid"].includes(status)?"success":["failed","canceled"].includes(status)?"danger":["processing","trialing"].includes(status)?"warning":"neutral";
    return '<span class="pill '+tone+'">'+EZ.escape(String(status).replaceAll("_"," "))+"</span>";
  };
  EZ.toast = (title,message="") => {
    const node=document.createElement("div");
    node.className="toast";
    node.innerHTML="<strong>"+EZ.escape(title)+"</strong>"+(message?"<span>"+EZ.escape(message)+"</span>":"");
    EZ.$("toastStack").appendChild(node);
    setTimeout(()=>node.remove(),3200);
  };
})();
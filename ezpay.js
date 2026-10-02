const meta={
home:["Overview","Your payments system at a glance."],
payments:["Payments","Authorization, authentication, capture, clearing and settlement."],
methods:["Payment methods","Configure the rails and wallets EZPay can support."],
balances:["Balances & payouts","Internal ledger balances, settlement and disbursement."],
customers:["Customers","Profiles, payment history and lifetime value."],
products:["Products","Products and pricing objects."],
subscriptions:["Subscriptions","Recurring billing and lifecycle management."],
invoices:["Invoices","Accounts receivable and invoice collection."],
links:["Payment links","Hosted checkout link management."],
risk:["Risk engine","Fraud prevention, authentication and review rules."],
disputes:["Disputes","Chargebacks, evidence and representment workflows."],
ledger:["Ledger","Immutable double-entry accounting and reconciliation."],
settlement:["Settlement","Acquirer, network, bank and payout adapters."],
developers:["Developer home","Stable EZPay APIs that stay independent from upstream rails."],
keys:["API keys","Scoped credentials for your applications."],
webhooks:["Webhooks","Signed asynchronous event delivery."],
security:["Security","The controls required for a real payments platform."]
};
document.querySelectorAll(".nav").forEach(btn=>btn.addEventListener("click",()=>{
 document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));
 document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
 btn.classList.add("active");
 const id=btn.dataset.view;
 document.getElementById(id)?.classList.add("active");
 document.getElementById("pageTitle").textContent=meta[id][0];
 document.getElementById("pageSubtitle").textContent=meta[id][1];
 document.getElementById("sidebar").classList.remove("open");
 history.replaceState(null,"","#"+id);
}));
const heights=[38,54,46,72,58,67,83,64,90,75,84,97,69,78,92,81,99,73,88,94,82,100,91,96];
const chart=document.getElementById("chart");
heights.forEach((h,i)=>{const el=document.createElement("div");el.className="bar";el.style.height=h+"%";el.title="Day "+(i+1);chart.appendChild(el)});
document.getElementById("menuButton").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.querySelectorAll(".mode button").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".mode button").forEach(x=>x.classList.remove("on"));btn.classList.add("on")}));
document.getElementById("globalSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){const q=e.target.value.toLowerCase().trim();const match=[...document.querySelectorAll(".nav")].find(b=>b.textContent.toLowerCase().includes(q));if(match)match.click()}});
const initial=location.hash.replace("#","");
if(initial&&meta[initial])document.querySelector('.nav[data-view="'+initial+'"]')?.click();
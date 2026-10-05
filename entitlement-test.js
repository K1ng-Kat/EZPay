(() => {
  "use strict";
  const form=document.getElementById("entitlementTestForm");
  const input=document.getElementById("entitlementToken");
  const output=document.getElementById("entitlementResult");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    output.textContent="Verifying…";
    try {
      const response=await fetch("/api/v1/entitlements/verify",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({token:input.value.trim()})
      });
      const data=await response.json();
      output.textContent=JSON.stringify({httpStatus:response.status,...data},null,2);
      output.dataset.active=String(Boolean(data.active));
    } catch (error) {
      output.textContent=JSON.stringify({error:String(error?.message||error)},null,2);
      output.dataset.active="false";
    }
  });
})();
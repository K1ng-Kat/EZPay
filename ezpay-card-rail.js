(() => {
  "use strict";
  const EZ=window.EZ;
  const CARD_SCRIPT_ID="ezpay-secure-card-fields";
  let currentKey="";
  let pendingToken=null;

  window.EZPayCardTokenized=(response)=>{
    if(!pendingToken)return;
    const pending=pendingToken;
    pendingToken=null;
    if(response?.token) pending.resolve(response);
    else pending.reject(new Error("Card details could not be tokenized."));
  };

  window.EZPayCardTimeout=()=>{
    if(!pendingToken)return;
    const pending=pendingToken;
    pendingToken=null;
    pending.reject(new Error("Secure card fields timed out. Check your connection and try again."));
  };

  function loadTokenizer(publicKey){
    return new Promise((resolve,reject)=>{
      if(window.CollectJS&&currentKey===publicKey){resolve();return;}
      document.getElementById(CARD_SCRIPT_ID)?.remove();
      currentKey=publicKey;
      const script=document.createElement("script");
      script.id=CARD_SCRIPT_ID;
      script.src="https://secure.nmi.com/token/Collect.js";
      script.async=true;
      script.dataset.tokenizationKey=publicKey;
      script.onload=()=>resolve();
      script.onerror=()=>reject(new Error("Secure card fields could not load."));
      document.head.appendChild(script);
    });
  }

  EZ.cardRail={
    configured:false,
    async mount(accent="#7c5cff"){
      const status=await EZ.api("/api/rail/status");
      if(!status?.rail?.configured||!status.rail.tokenizationPublicKey){
        this.configured=false;
        throw new Error("Live card processing is not connected yet.");
      }
      await loadTokenizer(status.rail.tokenizationPublicKey);
      if(!window.CollectJS) throw new Error("Secure card fields did not initialize.");

      window.CollectJS.configure({
        blockEval:"true",
        variant:"inline",
        timeoutDuration:12000,
        timeoutCallback:"EZPayCardTimeout",
        callback:"EZPayCardTokenized",
        invalidCss:{
          color:"#ff7085",
          "border-color":"transparent",
          "background-color":"transparent",
          "font-size":"14px"
        },
        validCss:{
          color:"#f7f9ff",
          "border-color":"transparent",
          "background-color":"transparent",
          "font-size":"14px"
        },
        focusCss:{
          color:"#ffffff",
          "border-color":"transparent",
          "background-color":"transparent",
          "font-size":"14px"
        },
        placeholderCss:{
          color:"#667287",
          "background-color":"transparent",
          "font-size":"14px"
        },
        fields:{
          ccnumber:{
            selector:"#ezCardNumber",
            title:"Card number",
            placeholder:"1234 5678 9012 3456",
            enableCardBrandPreviews:true
          },
          ccexp:{
            selector:"#ezCardExpiry",
            title:"Expiration",
            placeholder:"MM / YY"
          },
          cvv:{
            display:"show",
            selector:"#ezCardCvv",
            title:"Security code",
            placeholder:"CVC"
          }
        }
      });
      this.configured=true;
      document.querySelectorAll(".secure-card-shell").forEach(node=>node.style.setProperty("--checkout-accent",accent));
    },

    tokenize(){
      if(!this.configured||!window.CollectJS) return Promise.reject(new Error("Secure card fields are unavailable."));
      if(pendingToken) return Promise.reject(new Error("A card request is already in progress."));
      return new Promise((resolve,reject)=>{
        pendingToken={resolve,reject};
        try{
          window.CollectJS.startPaymentRequest();
        }catch(err){
          pendingToken=null;
          reject(err instanceof Error?err:new Error("Could not tokenize card."));
        }
      });
    },

    clear(){
      try{window.CollectJS?.clearInputs?.();}catch{}
    }
  };
})();
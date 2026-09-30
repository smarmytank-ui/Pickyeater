(()=>{
  const sessionId=crypto.randomUUID();
  const query=new URLSearchParams(location.search);
  const allowedSources=new Set(['tiktok','instagram','facebook','organic']);
  const sourceAliases=new Map([['ig','instagram'],['fb','facebook']]);
  const rawSource=String(query.get('utm_source') || '').toLowerCase();
  const campaignSource=sourceAliases.get(rawSource) || rawSource;
  const allowedCreatives=new Set(['four_safe_foods','taco_swap','picky_adults','link_in_bio']);
  const rawCreative=String(query.get('utm_content') || '').toLowerCase();
  const campaign={campaign_source:allowedSources.has(campaignSource)?campaignSource:'unknown',campaign_creative:allowedCreatives.has(rawCreative)?rawCreative:'unknown'};
  const emit=event=>fetch('/api/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event,sessionId,path:location.pathname,details:campaign}),keepalive:true}).catch(()=>{});
  emit('kit_page_viewed');
  const checkoutUrl=String(window.FMW_CONFIG?.survivalKitCheckoutUrl || '').trim();
  const valid=(()=>{try{const url=new URL(checkoutUrl);return url.protocol==='https:' && ['buy.stripe.com','checkout.stripe.com'].includes(url.hostname);}catch{return false;}})();
  for(const id of ['kitCheckout','kitCheckoutBottom']){
    const link=document.getElementById(id);
    if(!link) continue;
    if(valid){
      link.href=checkoutUrl;
      link.addEventListener('click',()=>emit('kit_checkout_started'));
    }else{
      link.classList.add('is-unavailable');
      link.setAttribute('aria-disabled','true');
      link.addEventListener('click',event=>{event.preventDefault();link.textContent='Checkout opening soon';});
    }
  }
  document.querySelector('.app-step a')?.addEventListener('click',()=>emit('kit_app_clicked'));
  const form=document.getElementById('kitSignIn');
  const status=document.getElementById('kitStatus');
  const download=document.getElementById('kitDownload');
  const refreshAccess=async()=>{
    try{
      const response=await fetch('/api/auth/session',{headers:{accept:'application/json'}});
      const state=await response.json();
      const ownsKit=state.authenticated && (state.entitlements || [state.entitlement]).some(item=>item?.plan==='survival_kit' && item?.status==='active');
      if(ownsKit){
        form?.classList.add('hidden');
        download?.classList.remove('hidden');
        if(status) status.textContent='Purchase verified.';
      }else if(state.authenticated && status){
        status.textContent='Signed in, but no active Survival Kit purchase was found for this email.';
      }
    }catch{}
  };
  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button');
    button.disabled=true;
    if(status) status.textContent='Sending your secure link...';
    try{
      const response=await fetch('/api/auth/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:form.email.value,returnTo:'/survival-kit.html?download=1'})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || 'Sign-in link could not be sent.');
      if(status) status.textContent='Check your email. The link expires in 15 minutes.';
    }catch(error){if(status) status.textContent=error.message;}
    finally{button.disabled=false;}
  });
  download?.addEventListener('click',()=>emit('kit_downloaded'));
  refreshAccess();
})();

import { hasDigitalKitAccess } from './survival-kit-access.mjs';
import { checkoutWithAttribution, attributedInternalUrl } from './checkout-attribution.mjs';
(()=>{
  const sessionId=crypto.randomUUID();
  const query=new URLSearchParams(location.search);
  const allowedSources=new Set(['tiktok','instagram','facebook','meta','organic']);
  const sourceAliases=new Map([['ig','instagram'],['fb','facebook']]);
  const rawSource=String(query.get('utm_source') || '').toLowerCase();
  const campaignSource=sourceAliases.get(rawSource) || rawSource;
  const allowedCreatives=new Set(['four_safe_foods','taco_swap','picky_adults','link_in_bio']);
  const rawCreative=String(query.get('utm_content') || '').toLowerCase();
  const campaign={campaign_source:allowedSources.has(campaignSource)?campaignSource:'unknown',campaign_creative:allowedCreatives.has(rawCreative)?rawCreative:'unknown'};
  const veyzloReference=query.get('veyzlo_ref');
  if(/^vz_[a-f0-9]{48}$/.test(veyzloReference || ''))campaign.veyzlo_reference=veyzloReference;
  const emit=event=>{
    if(!window.FMW_CONFIG?.telemetryEnabled) return;
    return fetch('/api/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event,sessionId,path:location.pathname,details:campaign}),keepalive:true}).catch(()=>{});
  };
  emit('kit_page_viewed');
  let checkoutUrl=String(window.FMW_CONFIG?.survivalKitCheckoutUrl || '').trim();
  checkoutUrl=checkoutWithAttribution(checkoutUrl,location.search);
  document.querySelectorAll('a[href="./"]')?.forEach(link=>{link.href=attributedInternalUrl(link.getAttribute('href'),location.search);});
  const valid=(()=>{try{const url=new URL(checkoutUrl);return url.protocol==='https:' && ['buy.stripe.com','checkout.stripe.com'].includes(url.hostname) && !url.username && !url.password && !url.port;}catch{return false;}})();
  let kitOfferState='checking';
  let kitOwnedPlan=null;
  const originalOfferCopy=new Map(['kitAppReturn','kitAppHeading','kitAppCopy','kitAppLink','kitQuestionsHeading'].map(id=>[id,document.getElementById(id)?.textContent]));
  const renderKitOffer=()=>{
    const owned=kitOfferState==='owned';
    const available=kitOfferState==='free' && valid;
    for(const id of ['kitCheckout','kitCheckoutBottom']){
      const link=document.getElementById(id);
      if(!link) continue;
      link.href=owned?attributedInternalUrl('./digital-kit.html',location.search):available?checkoutUrl:'#access';
      link.classList.toggle('is-unavailable',!owned && !available);
      if(owned || available) link.removeAttribute('aria-disabled'); else link.setAttribute('aria-disabled','true');
      link.textContent=owned?'Open my Kit':available?'Get the Kit ΓÇö $19':'Check my Kit access';
    }
    for(const id of ['kitPurchaseSummary','kitPurchaseFineprint']) document.getElementById(id)?.classList.toggle('hidden',owned || kitOfferState!=='free');
    const memberCopy={
      kitAppReturn:'Back to my app',
      kitAppHeading:'Keep cooking your way.',
      kitAppCopy:kitOwnedPlan==='founding'?'Your Founding membership includes unlimited saved recipes, premium app features, and your interactive Survival Kit and printable PDF.':'Your Survival Kit is ready. The free Food My Way app lets you create recipes, swap ingredients, and save up to three recipes.',
      kitAppLink:'Open my app',
      kitQuestionsHeading:'Kit questions'
    };
    for(const [id,original] of originalOfferCopy){
      const element=document.getElementById(id);
      if(element && original!==undefined) element.textContent=owned?memberCopy[id]:original;
    }
  };
  for(const id of ['kitCheckout','kitCheckoutBottom']){
    const link=document.getElementById(id);
    if(!link) continue;
    if(valid){
      link.addEventListener('click',event=>{
        if(kitOfferState==='free') emit('kit_checkout_started');
        else if(kitOfferState!=='owned'){
          event.preventDefault();
          const status=document.getElementById('kitStatus');
          if(status) status.textContent='Check access before buying. Sign in with your checkout email or refresh to try again.';
          document.getElementById('kitEmail')?.focus();
          document.getElementById('access')?.scrollIntoView({behavior:'smooth',block:'start'});
        }
      });
    }else{
      link.classList.add('is-unavailable');
      link.setAttribute('aria-disabled','true');
      link.addEventListener('click',event=>{if(kitOfferState!=='owned'){event.preventDefault();link.textContent='Checkout opening soon';}});
    }
  }
  renderKitOffer();
  document.querySelector('.app-step a')?.addEventListener('click',()=>emit('kit_app_clicked'));
  const form=document.getElementById('kitSignIn');
  const status=document.getElementById('kitStatus');
  const download=document.getElementById('kitDownload');
  const refreshAccess=async()=>{
    try{
      const response=await fetch('/api/auth/session',{headers:{accept:'application/json'}});
      const state=await response.json();
      if(!response.ok || state.entitlementUnavailable) throw new Error('Purchase verification is temporarily unavailable. Please refresh this page to try again.');
      const ownsKit=hasDigitalKitAccess(state);
      kitOwnedPlan=ownsKit?((state.entitlements || [state.entitlement]).some(item=>item?.plan==='founding' && item?.status==='active')?'founding':'survival_kit'):null;
      kitOfferState=ownsKit?'owned':'free';
      renderKitOffer();
      if(ownsKit){
        form?.classList.add('hidden');
        download?.classList.remove('hidden');
        document.getElementById('kitOpen')?.classList.remove('hidden');
        if(status) status.textContent='Purchase verified.';
      }else if(state.authenticated && status){
        status.textContent='No active Kit or Founding purchase was found for this email. Use the email on your Stripe receipt. If you just paid, wait a moment and refresh. Need help? Email support@foodmyway.app.';
      }
    }catch(error){kitOfferState='unavailable';kitOwnedPlan=null;renderKitOffer();if(status) status.textContent=error.message || 'Purchase verification is temporarily unavailable. Please refresh to try again.';}
  };
  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button');
    button.disabled=true;
    if(status) status.textContent='Sending your secure link...';
    try{
      const response=await fetch('/api/auth/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:form.email.value,returnTo:'/survival-kit.html?download=1#access'})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || 'Sign-in link could not be sent.');
      if(status) status.textContent='Check your email. The link expires in 15 minutes.';
    }catch(error){if(status) status.textContent=error.message;}
    finally{button.disabled=false;}
  });
  let downloading=false;
  download?.addEventListener('click',async event=>{
    event.preventDefault();
    if(downloading) return;
    downloading=true;
    download.setAttribute('aria-busy','true');
    if(status) status.textContent='Preparing your PDF...';
    try{
      const response=await fetch('/api/survival-kit-download',{headers:{accept:'application/pdf'}});
      if(!response.ok){
        const result=await response.json().catch(()=>({}));
        throw new Error(result.error || 'The download is temporarily unavailable. Please try again.');
      }
      if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/pdf')) throw new Error('The PDF could not be verified. Please try again or email support@foodmyway.app.');
      const blob=await response.blob();
      if(!blob.size) throw new Error('The PDF is empty. Please try again or email support@foodmyway.app.');
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;
      link.download='FoodMyWay-Picky-Eater-Survival-Kit.pdf';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      // A complete PDF reached this browser; this does not prove the user saved or opened it.
      emit('kit_download_ready');
      if(status) status.textContent='Your PDF is ready. Check your browser downloads.';
    }catch(error){if(status) status.textContent=error.message || 'The download failed. Please try again.';}
    finally{downloading=false;download.removeAttribute('aria-busy');}
  });
  refreshAccess();
})();

import {consentedLanding,stagePendingClick,readPendingClick,pendingCookieStorage,PENDING_CLICK_KEY} from './click-id.mjs?v=2.68.8';
import {createConsentController,createTikTokTransport,DISABLED_PIXEL,browserPixelEnabled} from './pixel-browser.mjs?v=2.68.8';
const $=id=>document.getElementById(id),config=window.FMW_CONFIG?.adPixel||DISABLED_PIXEL,context={url:location.href,referrer:document.referrer,gpc:navigator.globalPrivacyControl===true,dnt:navigator.doNotTrack==='1'},transport=createTikTokTransport(document,window);
const pendingStorage=pendingCookieStorage(document);
const api=async (input,{signal}={})=>{const response=await fetch('/api/tracking/measurement',{method:'POST',cache:'no-store',referrerPolicy:'no-referrer',signal,headers:{'content-type':'application/json'},credentials:'same-origin',keepalive:input.action==='withdraw',body:JSON.stringify(input)});const result=await response.json();if(input.action==='grant'&&result.state==='granted'){const pending=readPendingClick(pendingStorage);if(pending?.requestId===input.requestId&&pending.ttclid===input.ttclid&&pending.offer===input.offer)pendingStorage.removeItem(PENDING_CLICK_KEY);}return result;};
// Functional check only: independent of advertising choice/storage/controller.
// Render a fixed allowlist, never server-provided identity or arbitrary text.
const ownerCheck=$('owner-check'),ownerStatus=$('owner-check-status');
if(ownerCheck&&ownerStatus)ownerCheck.onclick=async()=>{if(ownerCheck.disabled)return;ownerCheck.disabled=true;ownerStatus.textContent='Checking signed-in account only...';const abort=new AbortController();let timer;try{const result=await Promise.race([api({action:'owner-exclusion-status'},{signal:abort.signal}),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('Deadline'));},8000);})]);const labels=({'owner-excluded':'Owner/test exclusion verified for this signed-in account. No measurement was allowed.','not-authorized':'This account does not match the reviewed owner/test exclusions. Classification remains unknown; do not use it for tracking validation.','sign-in-required':'Not signed in. Sign in through the Kit normally, then return here.','unavailable':'Exclusion check unavailable. Keep measurement off.','forbidden':'Exclusion check refused. Keep measurement off.'});ownerStatus.textContent=Object.hasOwn(labels,result?.state)?labels[result.state]:'Exclusion check uncertain. Keep measurement off.';}catch{ownerStatus.textContent='Exclusion check uncertain. Keep measurement off. No automatic retry.';}finally{clearTimeout(timer);}};
let controller;try{controller=createConsentController({config,context,storage:localStorage,api,transport});}catch{$('status').textContent='Storage unavailable. Use standard checkout.';}
const say=r=>{$('status').textContent=({consented:'Optional measurement allowed. Continue through existing checkout.','pending-clean-navigation':'Your optional choice is saved for 15 minutes. Opening a clean page; sign in through the Kit, return here, and confirm before paying.','sdk-enqueued-NOT-delivered':'A verified Purchase was queued to the SDK. Delivery is not verified.','not-paid-or-ineligible':'No eligible paid receipt confirmed. A checkout return is not payment proof.','not-consented':'Consent is unavailable or expired. You can continue without it.','refused':'Optional measurement declined.','sign-in-required':'Your pending choice is not active measurement. Sign in using the Kit, then return through its optional ad-choices link and confirm before paying.','locally-withdrawn-server-unconfirmed':'Stopped here. Server withdrawal is unconfirmed; sign in through the Kit or contact support.','fenced-no-retry':'An earlier attempt cannot safely be repeated. No automatic resend.'})[r.state]||'Optional measurement is unavailable or uncertain. Continue through the Kit without it.';};
const run=async work=>{try{if(controller)say(await work());}catch{$('status').textContent='Measurement unavailable or uncertain. Continue without it.';}};
$('agree').onclick=()=>run(async()=>{
 if(new URL(location.href).search){
  const prior=controller.state();if(prior?.grantUncertain||prior?.sdkUncertain||prior?.validationUncertain||prior?.dispatchFence)return {state:'fenced-no-retry'};
  const landing=consentedLanding({...context,url:location.href,permitted:browserPixelEnabled(config),replace:()=>{}});if(!landing)return {state:'disabled-or-unsafe'};
  stagePendingClick({storage:pendingStorage,ttclid:landing.ttclid,offer:$('offer').value,requestId:crypto.randomUUID()});
  // A NEW document is mandatory: history replacement cannot erase referrer.
  // Existing document meta/header no-referrer applies to this navigation.
  location.replace('/ad-measurement');return {state:'pending-clean-navigation'};
 }
 if(!browserPixelEnabled(config))return {state:'disabled-or-unsafe'};
 const pending=readPendingClick(pendingStorage),result=await controller.grant(pending?.offer??$('offer').value,pending?.ttclid??null,pending?{requestId:pending.requestId}:{});
 return result;
});
$('decline').onclick=()=>run(async()=>{pendingStorage.removeItem(PENDING_CLICK_KEY);return controller.refuse();});$('receipt').onclick=()=>run(()=>controller.receipt());
$('checkout').onclick=async()=>{const state=controller?.state(),offer=state?.status==='granted'?state.offer:$('offer').value;location.assign(offer==='founding'?'./#pricing':'./survival-kit');};
// Pending state NEVER auto-grants, loads SDK or claims an order on return/login.
if(browserPixelEnabled(config)){
 try{const pending=readPendingClick(pendingStorage);if(pending){$('offer').value=pending.offer;$('status').textContent='Pending choice saved for up to 15 minutes, not active tracking. Sign in through the Kit, return here and confirm before paying.';}else if(controller?.state()?.status==='granted')run(()=>controller.receipt());}catch{$('status').textContent='Pending choice unavailable. Continue without measurement.';}
}

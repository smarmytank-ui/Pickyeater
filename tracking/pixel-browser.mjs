import {validClickId,setClickCookie,pendingCookieStorage,PENDING_CLICK_KEY} from './click-id.mjs?v=2.68.8';
export const DISABLED_PIXEL=Object.freeze({enabled:false,pixelId:'DBJA0E3C77U7TR2UDESG',advertiserId:'7702295908318494741',accountVerified:false,dataSharingApproved:false,sdkApproved:false,settingsVerified:false,safeScopeApproved:false});
export function safePixelPage({url,referrer='',gpc=false,dnt=false},{allowLocalTest=false}={}){
 try{const u=new URL(url),production=u.origin==='https://foodmyway.app',local=allowLocalTest===true&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)&&['http:','https:'].includes(u.protocol);return (production||local)&&!u.username&&!u.password&&u.pathname==='/ad-measurement'&&!u.search&&!u.hash&&!referrer&&!gpc&&!dnt;}catch{return false;}
}
export function browserPixelEnabled(c){return c?.enabled===true&&c.pixelId==='DBJA0E3C77U7TR2UDESG'&&c.accountVerified===true&&c.dataSharingApproved===true&&c.sdkApproved===true&&c.settingsVerified===true&&c.safeScopeApproved===true;}
// Real SDK loading path. Called ONLY by the consent controller after all guards.
// No generated snippet's immediate ttq.page call is executed during module load.
export function createTikTokTransport(doc,win,{allowLocalTest=false}={}){
 let ready=false,stopped=false,started=false,script=null,timer=null,settleLoad=null,revokeAttempted=false,consentExpiry=0,approvedConfig=null;
 const currentScope=()=>({url:win.location?.href,referrer:doc.referrer||'',gpc:win.navigator?.globalPrivacyControl===true,dnt:win.navigator?.doNotTrack==='1'});
 const revoke=()=>{if(!started||revokeAttempted)return;revokeAttempted=true;const q=win.ttq;
  // Before SDK execution, discard commands that must never be released after
  // withdrawal, then queue the documented revokeConsent for any late execution.
  if(!ready&&Array.isArray(q)){q.length=0;for(const instance of Object.values(q._i||{}))if(Array.isArray(instance))instance.length=0;}
  try{q?.revokeConsent?.();}catch{ /* unknown provider state; reload and retain fence */ }
 };
 function stop(reason='SDK consent revoked'){
  const wasStopped=stopped;stopped=true;revoke();ready=false;try{setClickCookie(doc,null,0);}catch{}
  // Settle/reject a pending load once. Captured late onload/error callbacks are
  // harmless; they cannot restore ready state or release queued events.
  settleLoad?.(reason);try{script?.remove?.();}catch{}
  if(started&&!wasStopped)win.location?.replace?.('/ad-measurement');
  return {revocationRequested:revokeAttempted,deliveryVerified:false};
 }
 function requireReady(){if(!ready||stopped)throw Error('Not consented/ready');if(!safePixelPage(currentScope(),{allowLocalTest})||!browserPixelEnabled(approvedConfig)||consentExpiry<=Date.now()){stop();throw Error('Scope or consent expired');}}
 return {
  async load(pixelId,authorization){
   if(!browserPixelEnabled(authorization?.config)||!safePixelPage(currentScope(),{allowLocalTest})||authorization?.consent?.status!=='granted'||!Number.isFinite(authorization.consent.expiresAt)||authorization.consent.expiresAt<=Date.now()||pixelId!==authorization.config.pixelId)throw Error('Explicit consent and approved clean scope required');
   if(stopped||started||win.ttq)throw Error('No SDK retry or unknown existing SDK');
   if(pendingCookieStorage(doc).getItem(PENDING_CLICK_KEY)!==null)throw Error('Unconfirmed pending click; no SDK');
   if(authorization.ttclid!==undefined&&authorization.ttclid!==null&&!validClickId(authorization.ttclid))throw Error('Invalid click binding');
   started=true;consentExpiry=authorization.consent.expiresAt;approvedConfig=authorization.config;
   try{setClickCookie(doc,authorization.ttclid??null,consentExpiry);}catch{stop('Click storage unavailable');throw Error('Click storage unavailable');}
   const ttq=[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','grantConsent','revokeConsent'];ttq.setAndDefer=(target,name)=>{target[name]=(...args)=>target.push([name,...args]);};for(const name of ttq.methods)ttq.setAndDefer(ttq,name);ttq.instance=id=>{const instance=ttq._i[id]||[];for(const name of ttq.methods)ttq.setAndDefer(instance,name);return instance;};ttq._i={[pixelId]:[]};ttq._i[pixelId]._u='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._t={[pixelId]:Date.now()};ttq._o={[pixelId]:{}};win.TiktokAnalyticsObject='ttq';win.ttq=ttq;
   await new Promise((resolve,reject)=>{let settled=false;
    settleLoad=error=>{if(settled)return;settled=true;clearTimeout(timer);if(script){script.onload=null;script.onerror=null;}if(error||stopped){ready=false;reject(Error(error||'SDK stopped'));}else{ready=true;resolve();}};
    try{script=doc.createElement('script');script.async=true;script.src='https://analytics.tiktok.com/i18n/pixel/events.js?sdkid='+encodeURIComponent(pixelId)+'&lib=ttq';script.referrerPolicy='no-referrer';script.onload=()=>{if(stopped)return;settleLoad();};script.onerror=()=>stop('SDK unavailable or uncertain');timer=setTimeout(()=>stop('SDK load timeout'),5000);doc.head.appendChild(script);}catch{stop('SDK startup unavailable');}
   });
  },
  page(){requireReady();win.ttq.page();return {enqueued:true,deliveryVerified:false};},
  purchase(p){requireReady();win.ttq.track('Purchase',p.properties,{event_id:p.event_id});return {enqueued:true,deliveryVerified:false};},
  stop
 };
}
export function minimalReceipt(p){if(!p||Object.keys(p).sort().join(',')!=='event,event_id,event_time,properties'||p.event!=='Purchase'||!/^fmw_[a-f0-9]{64}$/.test(p.event_id)||!Number.isSafeInteger(p.event_time)||p.event_time<=0)throw Error('Invalid paid receipt');const x=p.properties;if(!x||Object.keys(x).sort().join(',')!=='content_ids,content_type,currency,value'||x.currency!=='USD'||x.content_type!=='product'||!Array.isArray(x.content_ids)||x.content_ids.length!==1||!['survival_kit','founding'].includes(x.content_ids[0])||!Number.isFinite(x.value)||x.value<=0||Math.round(x.value*100)/100!==x.value)throw Error('Invalid paid receipt');return {event:'Purchase',event_id:p.event_id,event_time:p.event_time,properties:{content_ids:[x.content_ids[0]],content_type:'product',currency:'USD',value:x.value}};}
export function createConsentController({config=DISABLED_PIXEL,context,storage,api,transport,now=()=>Date.now(),uuid=()=>crypto.randomUUID(),validationTimeoutMs=2500}){
 const key='fmw-ad-consent-minimal-v1';let stopped=false,initialized=false,expiryTimer;
 const read=()=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}},write=x=>storage.setItem(key,JSON.stringify(x));
 const allowed=()=>!stopped&&browserPixelEnabled(config)&&safePixelPage(context)&&read()?.status==='granted'&&typeof read().consentId==='string'&&Number.isFinite(read().expiresAt)&&read().expiresAt>now();
 let initializing=null;
 async function initialize(){
  if(!allowed())return false;if(initialized)return true;if(initializing)return initializing;
  const c=read();if(c.sdkUncertain||c.validationUncertain)return false;
  initializing=(async()=>{
   let timer,abort;try{
    write({...read(),validationUncertain:true});abort=new AbortController();
    const wait=Math.max(1,Math.min(2500,Number.isFinite(validationTimeoutMs)?validationTimeoutMs:2500));
    const result=await Promise.race([Promise.resolve().then(()=>api({action:'validate',choice:'granted',consentId:c.consentId},{signal:abort.signal})),new Promise(resolve=>{timer=setTimeout(()=>resolve({state:'validation-timeout'}),wait);})]);
    const known=['disabled','not-authorized','sign-in-required','refused'].includes(result?.state);
    if(known){write({...read(),validationUncertain:false,validationBlocked:result.state});return false;}
    if(result?.state!=='sdk-authorized'||result.consentId!==c.consentId||result.pixelId!==config.pixelId||result.policyVersion!=='fmw-tiktok-v1'||!Number.isFinite(result.expiresAt)||result.expiresAt<=now()||(result.ttclid!==undefined&&result.ttclid!==null&&!validClickId(result.ttclid)))return false;
    if(!allowed())return false;
    write({...read(),validationUncertain:false,validationBlocked:null,expiresAt:Math.min(read().expiresAt,result.expiresAt),sdkUncertain:true});
    await transport.load(config.pixelId,{config,consent:read(),ttclid:result.ttclid??null});if(!allowed()){transport.stop();return false;}
    transport.page();write({...read(),sdkUncertain:false});initialized=true;expiryTimer=setTimeout(()=>{stopped=true;transport.stop();},Math.max(0,read().expiresAt-now()));expiryTimer.unref?.();return true;
   }catch{return false;}finally{clearTimeout(timer);abort?.abort();}
  })();
  try{return await initializing;}finally{initializing=null;}
 }
 return {state:read,
  async grant(offer='survival_kit',ttclid=null,{requestId:pendingRequestId}={}){
   if((ttclid!==null&&!validClickId(ttclid))||stopped||!browserPixelEnabled(config)||!safePixelPage(context))return {state:'disabled-or-unsafe'};
   if(read()?.grantUncertain)return {state:'consent-uncertain-no-retry'};
   if(pendingRequestId!==undefined&&!/^[a-f0-9-]{36}$/.test(pendingRequestId))return {state:'disabled-or-unsafe'};
   const previous=read(),requestId=pendingRequestId??uuid();write({...previous,grantUncertain:true,status:'pending'});let result;
   try{result=await api({action:'grant',choice:'granted',offer,requestId,...(ttclid===null?{}:{ttclid})});}catch{return {state:'consent-uncertain-no-retry'};}
   if(result.state!=='granted'||!/^[a-f0-9-]{36}$/.test(result.consentId||'')||!Number.isFinite(result.expiresAt)||result.expiresAt<=now()){const known=['disabled','sign-in-required','ineligible-or-legacy-fenced','refused','invalid'].includes(result.state);write({...read(),grantUncertain:!known,status:'denied'});return {state:known?result.state:'consent-uncertain-no-retry'};}
   if(stopped||read()?.status==='denied'){write({...read(),consentId:result.consentId,status:'denied'});try{await api({action:'withdraw',consentId:result.consentId});}catch{}return {state:'refused'};}
   write({...read(),consentId:result.consentId,expiresAt:result.expiresAt,offer,status:'granted',grantUncertain:false});return {state:await initialize()?'consented':'sdk-unavailable-no-retry'};
  },
  async refuse(){const c=read();stopped=true;clearTimeout(expiryTimer);write({...c,status:'denied',expiresAt:0});let pending;try{pending=c?.consentId?api({action:'withdraw',consentId:c.consentId}):null;}catch{transport.stop();return {state:'locally-withdrawn-server-unconfirmed'};}transport.stop();if(pending){try{if((await pending).state!=='withdrawn')return {state:'locally-withdrawn-server-unconfirmed'};}catch{return {state:'locally-withdrawn-server-unconfirmed'};}}return {state:'refused'};},
  async checkout(offer){return {state:'standard-checkout',destination:offer==='founding'?'./#pricing':'./survival-kit'};},
  async receipt(){
   if(!allowed())return {state:'not-consented-or-unbound'};if(read().dispatchFence)return {state:'fenced-no-retry'};if(!await initialize())return {state:'sdk-unavailable-no-retry'};
   const c=read();write({...c,dispatchFence:'claim-uncertain'});let result;try{result=await api({action:'claim',choice:'granted',consentId:c.consentId});}catch{return {state:'claim-uncertain-no-retry'};}
   if(result.state!=='dispatch-reserved'){if(['not-paid-or-ineligible','not-consented','sign-in-required','disabled','refused'].includes(result.state))write({...read(),dispatchFence:null});return result;}
   try{const payload=minimalReceipt(result.payload);if(!allowed())return {state:'withdrawn-no-dispatch'};write({...read(),dispatchFence:'sdk-dispatch-uncertain'});transport.purchase(payload);write({...read(),dispatchFence:'sdk-enqueued-NOT-delivered'});try{await api({action:'enqueued',choice:'granted',consentId:c.consentId,eventId:payload.event_id});}catch{}return {state:'sdk-enqueued-NOT-delivered',deliveryVerified:false};}catch{return {state:'sdk-dispatch-uncertain-no-retry'};}
  }
 };
}

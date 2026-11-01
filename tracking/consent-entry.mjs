// Links only: no SDK, network, account or recipe reads on purchase/access pages.
const enabled=c=>c?.pixelId==='DBJA0E3C77U7TR2UDESG'&&['enabled','accountVerified','dataSharingApproved','sdkApproved','settingsVerified','safeScopeApproved'].every(k=>c[k]===true);
export function mountMeasurementLinks({document,config,storage,now=Date.now()}){
 if(!enabled(config))return {mounted:false};
 const section=document.getElementById('kitPurchaseSummary');
 if(section&&!document.getElementById('measurementBeforeCheckout')){const p=document.createElement('p'),a=document.createElement('a');a.id='measurementBeforeCheckout';a.href='./ad-measurement';a.rel='noreferrer';a.textContent='Optional ad choices before checkout';p.appendChild(a);section.appendChild(p);}
 let consent;try{consent=JSON.parse(storage?.getItem('fmw-ad-consent-minimal-v1')||'null');}catch{return {mounted:!!section};}
 const handoff=document.getElementById('measurementHandoff');
 if(handoff&&consent?.status==='granted'&&typeof consent.consentId==='string'&&Number.isFinite(consent.expiresAt)&&consent.expiresAt>now){const a=document.createElement('a');a.href='./ad-measurement';a.rel='noreferrer';a.textContent='Finish optional purchase measurement';const p=document.createElement('p');p.textContent='Only if you opted in before checkout. Access works without this; a secure paid-receipt check happens on the separate page.';handoff.appendChild(p);handoff.appendChild(a);handoff.hidden=false;return {mounted:true,handoff:true};}
 return {mounted:!!section,handoff:false};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&enabled(window.FMW_CONFIG?.adPixel)){let storage;try{storage=window.localStorage;}catch{}mountMeasurementLinks({document,config:window.FMW_CONFIG.adPixel,storage});}

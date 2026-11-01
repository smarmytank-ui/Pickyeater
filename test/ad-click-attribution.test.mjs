import {onRequest as measurementMiddleware} from '../functions/ad-measurement.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {consentedLanding,validClickId,readPendingClick} from '../tracking/click-id.mjs';
import {createConsentController,createTikTokTransport,DISABLED_PIXEL,safePixelPage} from '../tracking/pixel-browser.mjs';
import {fixture,grant,pay,request} from './helpers/ad-minimal-fixture.mjs';
import {onRequestPost as route} from '../functions/api/tracking/measurement.js';
import {grantConsent,validateConsent,withdrawConsent} from '../functions/_shared/ad-measurement.mjs';
const url='https://foodmyway.app/ad-measurement',click='E.C.P.synthetic_click-123',config={...DISABLED_PIXEL,enabled:true,accountVerified:true,dataSharingApproved:true,sdkApproved:true,settingsVerified:true,safeScopeApproved:true};
test('landing parser is explicit-permission only, exact scope, one bounded identifier and clean replacement',()=>{
 const replacements=[],input={url:url+'?ttclid='+click,replace:x=>replacements.push(x)};
 assert.equal(consentedLanding(input),null);assert.deepEqual(replacements,[]);
 for(const changed of [{gpc:true},{dnt:true},{referrer:'https://private.invalid/?email=secret'},{url:url+'?ttclid='+click+'&email=secret'},{url:url+'?ttclid=a&ttclid=b'},{url:url+'?ttclid=%0Asecret'},{url:url+'?ttclid='+('x'.repeat(1025))},{url:url+'?ttclid='+click+'#secret'},{url:'http://foodmyway.app/ad-measurement?ttclid='+click},{url:'https://foodmyway.app:444/ad-measurement?ttclid='+click},{url:'https://foodmyway.app/recipe?ttclid='+click}])assert.equal(consentedLanding({...input,permitted:true,...changed}),null);
 assert.deepEqual(replacements,[]);assert.deepEqual(consentedLanding({...input,permitted:true}),{ttclid:click,cleanUrl:url});assert.deepEqual(replacements,['/ad-measurement']);
 assert.equal(safePixelPage({url:input.url}),false);assert.equal(validClickId('a'.repeat(1024)),true);assert.equal(validClickId('name@example.invalid'),false);
});
test('immutable owned click binding is never read from payment return or another account',async()=>{const f=await fixture();try{
 const id=crypto.randomUUID(),opts={db:f.d1,account:f.account,offer:'survival_kit',requestId:id,ttclid:click,env:f.env,now:Date.now()-3000},c=await grantConsent(opts);
 assert.equal(c.state,'granted');assert.equal((await grantConsent({...opts,ttclid:'different'})).state,'refused');
 assert.equal((await validateConsent({...opts,consentId:c.consentId})).ttclid,click);
 assert.equal((await validateConsent({...opts,account:{user_id:'other'},consentId:c.consentId})).state,'not-authorized');
 assert.throws(()=>f.db.exec("UPDATE ad_consents SET ttclid='forged'"),/Immutable/);
 await withdrawConsent({...opts,consentId:c.consentId});assert.equal((await validateConsent({...opts,consentId:c.consentId})).state,'not-authorized');
}finally{f.close();}});
test('unknown invalid click cannot grant; regular no-click consent and purchase remain supported',async()=>{const f=await fixture();try{
 for(const ttclid of ['x'.repeat(1025),'x;y=z','https://private.invalid/?email=secret',{},''])assert.equal((await grant(f,{ttclid})).state,'invalid');
 assert.equal(f.db.prepare('SELECT count(*) n FROM ad_consents').get().n,0);const c=await grant(f);assert.equal((await validateConsent({db:f.d1,account:f.account,env:f.env,consentId:c.consentId})).ttclid,null);
 await pay(f);const r=await route({env:f.env,request:request({action:'claim',choice:'granted',consentId:c.consentId,ttclid:'forged'})});assert.equal((await r.json()).state,'dispatch-reserved');
}finally{f.close();}});
function browser(api){const data=new Map(),cookies=[],scripts=[],win={navigator:{},location:{href:url,replace(){}}},doc={referrer:'',head:{appendChild(s){scripts.push(s);queueMicrotask(()=>s.onload?.());}},createElement(){return {remove(){}};},set cookie(s){cookies.push(s);}},storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},transport=createTikTokTransport(doc,win),controller=createConsentController({config,context:{url},storage,api,transport});return {controller,storage,data,cookies,scripts,win,doc};}
test('actual controller and adapter carry server-owned consent click across unchanged signed fulfillment, synthetic SDK only',async()=>{const f=await fixture();try{
 const actions=[],b=browser(async input=>{actions.push(input.action);return (await route({env:f.env,request:request(input)})).json();});
 assert.equal(b.cookies.length,0);assert.equal(b.scripts.length,0);
 assert.equal((await b.controller.grant('survival_kit',click)).state,'consented');
 assert.match(b.cookies[0],new RegExp('^ttclid='+click.replaceAll('.','\\.')+'; Path=/ad-measurement; Max-Age=35[0-9]{2}; SameSite=Lax; Secure$'));
 assert.equal(JSON.stringify([...b.data]).includes(click),false);assert.deepEqual(Array.from(b.win.ttq),[['page']]);
 // Existing Payment Link/webhook path is unchanged: no click passed to Stripe.
 // Use grant fixture time alignment for Stripe's second-resolution paid timestamp.
 // Synthetic authoritative signed event must occur after the grant.
 await new Promise(r=>setTimeout(r,2100));await pay(f);
 const receipt=await b.controller.receipt();assert.equal(receipt.state,'sdk-enqueued-NOT-delivered');assert.equal(receipt.deliveryVerified,false);
 const events=Array.from(b.win.ttq);assert.equal(events[1][0],'track');assert.equal(events[1][1],'Purchase');assert.doesNotMatch(JSON.stringify(events),/synthetic_click|email|recipe|ingredient|pi_synthetic|cs_synthetic/);
 assert.equal((await b.controller.receipt()).state,'fenced-no-retry');assert.equal(actions.filter(a=>a==='claim').length,1);
 await b.controller.refuse();assert.match(b.cookies.at(-1),/^ttclid=;.*Max-Age=0/);assert.equal(b.win.ttq.at(-1)[0],'revokeConsent');
}finally{f.close();}});
test('preflight click is trusted instead of locally supplied click and invalid preflight never creates cookie/script',async()=>{
 const id='11111111-1111-4111-8111-111111111111';
 for(const unsafe of ['email@example.invalid','a'.repeat(1025)]){const b=browser(async input=>input.action==='grant'?{state:'granted',consentId:id,expiresAt:Date.now()+10000}:{state:'sdk-authorized',consentId:id,pixelId:config.pixelId,policyVersion:'fmw-tiktok-v1',expiresAt:Date.now()+10000,ttclid:unsafe});
 assert.equal((await b.controller.grant('survival_kit',click)).state,'sdk-unavailable-no-retry');assert.equal(b.cookies.length,0);assert.equal(b.scripts.length,0);}
});
test('decline and disabled/GPC/referrer paths never create advertising cookies or load SDK',async()=>{const b=browser(async()=>{throw Error('No request');});await b.controller.refuse();assert.equal(b.scripts.length,0);assert.equal(b.cookies.some(x=>!x.includes('Max-Age=0')),false);
 for(const ctx of [{url,gpc:true},{url,dnt:true},{url,referrer:'https://private.invalid/'},{url:url+'?ttclid='+click}]){const calls=[],controller=createConsentController({config,context:ctx,storage:{getItem(){return null;},setItem(){throw Error('No storage');}},api(){throw Error('No request');},transport:{load(){calls.push('load');}}});assert.equal((await controller.grant('survival_kit',click)).state,'disabled-or-unsafe');assert.deepEqual(calls,[]);}
});
test('fresh transport refusal removes the scoped cookie even before any SDK load',async()=>{const b=browser(async()=>{throw Error('No request');});await b.controller.refuse();assert.match(b.cookies.at(-1),/^ttclid=; Path=\/ad-measurement; Max-Age=0;/);assert.equal(b.win.ttq,undefined);assert.equal(b.scripts.length,0);});
test('withdrawal during pending synthetic SDK load clears cookie, removes script, rejects load and fences late completion',async()=>{
 const cookies=[],scripts=[],win={navigator:{},location:{href:url,replace(){}}},doc={referrer:'',set cookie(v){cookies.push(v);},head:{appendChild(s){scripts.push(s);}},createElement(){return {remove(){this.removed=true;}};}},transport=createTikTokTransport(doc,win);
 const pending=transport.load(config.pixelId,{config,consent:{status:'granted',expiresAt:Date.now()+10000},ttclid:click});const rejection=assert.rejects(pending,/revoked/),late=scripts[0].onload;
 assert.match(cookies[0],/^ttclid=E\.C\.P\./);transport.stop();await rejection;assert.match(cookies.at(-1),/Max-Age=0/);assert.equal(scripts[0].removed,true);late();assert.throws(()=>transport.page(),/Not consented/);assert.deepEqual(Array.from(win.ttq),[['revokeConsent']]);
});
test('actual landing handler stages only after permission and requests a NEW clean document without API or SDK',async()=>{
 const {measurementView}=await import('./helpers/measurement-dom.mjs');
 await measurementView({url:url+'?ttclid='+click,referrer:'https://www.tiktok.com/'},async v=>{
  assert.equal(v.data.size,0);assert.deepEqual(v.requests,[]);assert.deepEqual(v.scripts,[]);assert.deepEqual(v.cookies,[]);
  await v.nodes.agree.onclick();assert.equal(v.requests.length,0);assert.equal(v.scripts.length,0);assert.equal(v.cookies.length,1);assert.match(v.cookies[0],/^fmw_ad_pending_v1=.*Max-Age=900;/);assert.equal(v.document.referrer,'https://www.tiktok.com/');
  assert.deepEqual(v.navigations,[{kind:'replace',path:'/ad-measurement'}]);const p=readPendingClick(v.pendingStorage);assert.equal(p.ttclid,click);assert.doesNotMatch(JSON.stringify(p),/https|tiktok.com|referrer|email/);
  await v.nodes.decline.onclick();assert.equal(readPendingClick(v.pendingStorage),null);
 });
});
test('mounted CSP permits only bounded landing and clean canonical page, never arbitrary queries',async()=>{for(const suffix of ['','?ttclid='+click,'?ttclid=a&ttclid=b','?ttclid=a&email=secret','?private=value','?ttclid=%0A']){const original=new Response('fixture',{headers:{'content-security-policy':"default-src 'self'"}}),r=await measurementMiddleware({request:new Request(url+suffix),next:async()=>original});if(['','?ttclid='+click].includes(suffix)){assert.match(r.headers.get('content-security-policy'),/analytics\.tiktok\.com/);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');}else assert.equal(r,original);}});

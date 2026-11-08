import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {hasDigitalKitAccess} from '../survival-kit-access.mjs';
import {checkoutWithAttribution,attributedInternalUrl} from '../checkout-attribution.mjs';

const script=(await readFile(new URL('../survival-kit.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
const paymentLink='https://buy.stripe.com/3cI14n7YYeLogNk1KxaMU01';
function element(hidden=false){
  const classes=new Set(hidden?['hidden']:[]);
  return {href:'',textContent:'',events:{},attributes:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},
    setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(k,v){this.events[k]=v;},focus(){},scrollIntoView(){}};
}
async function page({response=()=>Response.json({authenticated:false}),checkout=paymentLink,timeout=false,search=''}={}){
  const ids=Object.fromEntries(['kitCheckout','kitCheckoutBottom','kitGuestCheckout','kitGuestCheckoutBottom','kitGuestNotice','kitGuestNoticeBottom','kitSignIn','kitEmail','access','kitStatus','kitOpen','kitDownload','kitPurchaseSummary','kitPurchaseFineprint'].map(x=>[x,element(['kitOpen','kitDownload','kitGuestNotice','kitGuestNoticeBottom'].includes(x))]));
  const calls=[],events=[],timers=[];
  const context={hasDigitalKitAccess,checkoutWithAttribution,attributedInternalUrl,crypto,URL,URLSearchParams,
    location:{pathname:'/survival-kit',search},window:{FMW_CONFIG:{survivalKitCheckoutUrl:checkout,telemetryEnabled:true}},
    document:{getElementById:id=>ids[id],querySelector:()=>null,querySelectorAll:()=>[]},
    setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},clearTimeout(){},
    fetch:async(url,options)=>{calls.push(url);if(url==='/api/events'){events.push(JSON.parse(options.body).event);return Response.json({});}if(url==='/api/auth/session')return response();throw Error('Unexpected request');}};
  vm.runInNewContext(script,context);
  await new Promise(resolve=>setImmediate(resolve));
  if(timeout){assert.equal(timers.length,1);assert.equal(timers[0].ms,5000);timers[0].fn();await new Promise(resolve=>setImmediate(resolve));}
  return {ids,calls,events,timers};
}
function click(link){let prevented=false;link.events.click({preventDefault(){prevented=true;}});return prevented;}

for(const [name,response] of [
  ['network failure',()=>{throw Error('network failed');}],
  ['non-JSON response',()=>new Response('<html>temporarily unavailable</html>',{headers:{'content-type':'text/html'}})],
  ['HTTP 503',()=>Response.json({error:'unavailable'},{status:503})],
  ['unrecognized session schema',()=>Response.json({})],
])test(`${name}: explicit guest escape works without declaring non-ownership or requiring sign-in`,async()=>{
  const result=await page({response});
  assert.equal(result.ids.kitCheckout.href,'#access');
  for(const id of ['kitGuestCheckout','kitGuestCheckoutBottom']){assert.equal(result.ids[id].href,paymentLink);assert.equal(click(result.ids[id]),false);}
  assert.equal(result.ids.kitGuestNotice.classList.contains('hidden'),false);
  assert.equal(result.ids.kitGuestNoticeBottom.classList.contains('hidden'),false);
  assert.equal(result.ids.kitOpen.classList.contains('hidden'),true);
  assert.equal(result.ids.kitDownload.classList.contains('hidden'),true);
  assert.deepEqual(result.calls.filter(x=>x!=='/api/events'),['/api/auth/session']);
  assert.equal(result.events.filter(x=>x==='kit_checkout_started').length,2);
});

test('confirmed signed-out visitor is not blocked by an irrelevant entitlement-unavailable flag',async()=>{
  const result=await page({response:()=>Response.json({authenticated:false,entitlementUnavailable:true})});
  assert.equal(result.ids.kitCheckout.href,paymentLink);
  assert.equal(result.ids.kitGuestNotice.classList.contains('hidden'),true);
});

test('known signed-in entitlement outage keeps recovery and does not invite another purchase',async()=>{
  const result=await page({response:()=>Response.json({authenticated:true,entitlementUnavailable:true})});
  assert.equal(result.ids.kitCheckout.href,'#access');
  assert.equal(result.ids.kitGuestNotice.classList.contains('hidden'),true);
  assert.equal(result.ids.kitGuestCheckout.href,'#access');
  assert.equal(click(result.ids.kitGuestCheckout),true);
  assert.equal(result.events.includes('kit_checkout_started'),false);
});

for(const plan of ['survival_kit','founding'])test(`${plan} owner keeps access and has no guest-purchase fallback`,async()=>{
  const result=await page({response:()=>Response.json({authenticated:true,entitlements:[{plan,status:'active'}]})});
  assert.equal(result.ids.kitCheckout.href,'/digital-kit.html');
  assert.equal(result.ids.kitGuestNotice.classList.contains('hidden'),true);
  assert.equal(click(result.ids.kitGuestCheckout),true);
  assert.equal(result.events.includes('kit_checkout_started'),false);
});

test('invalid checkout config never provides an alternate purchase route',async()=>{
  const result=await page({checkout:'https://user:password@buy.stripe.com/not-approved',response:()=>{throw Error('offline');}});
  assert.equal(result.ids.kitGuestNotice.classList.contains('hidden'),true);
  assert.equal(result.ids.kitGuestCheckout.href,'#access');
  assert.equal(click(result.ids.kitGuestCheckout),true);
  assert.equal(result.events.includes('kit_checkout_started'),false);
});

test('timeout provides a finite explicit escape; a late session result never rerenders or retries',async()=>{
  let release;
  const result=await page({response:()=>new Promise(resolve=>{release=resolve;}),timeout:true});
  assert.equal(result.ids.kitGuestCheckout.href,paymentLink);
  assert.equal(result.calls.filter(x=>x==='/api/auth/session').length,1);
  release(Response.json({authenticated:false}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(result.ids.kitCheckout.href,'#access');
  assert.equal(result.ids.kitGuestCheckout.href,paymentLink);
});

test('guest fallback preserves only existing safe campaign fields',async()=>{
  const result=await page({response:()=>{throw Error('offline');},search:'?utm_source=tiktok&utm_content=link_in_bio&email=private@example.com&ttclid=never-forward'});
  const url=new URL(result.ids.kitGuestCheckout.href);
  assert.equal(url.pathname,new URL(paymentLink).pathname);
  assert.equal(url.searchParams.get('client_reference_id'),'fmw1-tiktok-link_in_bio');
  assert.doesNotMatch(url.href,/private|email|ttclid|never-forward/);
});

test('both fallback notices warn existing buyers and leave recovery optional',async()=>{
  const html=await readFile(new URL('../survival-kit.html',import.meta.url),'utf8');
  for(const id of ['kitGuestNotice','kitGuestNoticeBottom']){
    const notice=html.match(new RegExp(`<p[^>]*id="${id}"[^>]*>([\\s\\S]*?)</p>`))?.[1];
    assert.ok(notice);
    assert.match(notice,/Already paid/);
    assert.match(notice,/href="#access"/);
    assert.match(notice,/haven't bought/);
    assert.match(notice,/plus applicable tax/);
  }
});

test('Kit module uses a fresh matching HTML/precache identity without changing Pixel OFF config',async()=>{
  const html=await readFile(new URL('../survival-kit.html',import.meta.url),'utf8');
  const sw=await readFile(new URL('../service-worker.js',import.meta.url),'utf8');
  const config=await readFile(new URL('../config.js',import.meta.url),'utf8');
  assert.match(html,/survival-kit\.js\?v=2\.68\.8-guest-20261106/);
  assert.match(sw,/survival-kit\.js\?v=2\.68\.8-guest-20261106/);
  assert.match(config,/adPixel: Object\.freeze\(\{enabled:false/);
});

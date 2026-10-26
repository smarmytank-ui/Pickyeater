import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {hasDigitalKitAccess} from '../survival-kit-access.mjs';
import {checkoutWithAttribution,attributedInternalUrl} from '../checkout-attribution.mjs';

const source=(await readFile(new URL('../survival-kit.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
function element(){
  const classes=new Set(['hidden']); const attributes={};
  return {textContent:'',href:'',listeners:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},
    addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(k,v){attributes[k]=v;},getAttribute:k=>attributes[k],removeAttribute:k=>delete attributes[k]};
}
async function landing(state,{ok=true,reject=false}={}){
  const ids=Object.fromEntries(['kitCheckout','kitCheckoutBottom','kitSignIn','kitStatus','kitDownload','kitOpen'].map(id=>[id,element()]));
  const events=[];
  const context={hasDigitalKitAccess,checkoutWithAttribution,attributedInternalUrl,crypto:{randomUUID:()=> 'test-session'},URL,URLSearchParams,location:{search:'',pathname:'/survival-kit'},window:{FMW_CONFIG:{telemetryEnabled:true,survivalKitCheckoutUrl:'https://buy.stripe.com/test'}},document:{getElementById:id=>ids[id],querySelector:()=>null,querySelectorAll:()=>[]},fetch:async(url,options)=>{
    if(url==='/api/events'){events.push(JSON.parse(options.body).event);return {};}
    if(reject)throw new Error('Network unavailable');
    return {ok,json:async()=>state};
  }};
  vm.runInNewContext(source,context);
  await new Promise(resolve=>setImmediate(resolve));
  return {ids,events};
}
for(const plan of ['survival_kit','founding'])test(`${plan} buyer gets Kit and PDF, not another checkout`,async()=>{
  const {ids,events}=await landing({authenticated:true,entitlements:[{plan,status:'active'}]});
  assert.equal(ids.kitSignIn.classList.contains('hidden'),true);
  assert.equal(ids.kitOpen.classList.contains('hidden'),false);
  assert.equal(ids.kitDownload.classList.contains('hidden'),false);
  assert.match(ids.kitStatus.textContent,/verified/);
  assert.equal(ids.kitCheckout.href,'/digital-kit.html');
  ids.kitCheckout.listeners.click();
  assert.equal(events.includes('kit_checkout_started'),false);
});
test('free and refunded buyers retain recovery guidance without delivery links',async()=>{
  for(const entitlements of [[],[{plan:'founding',status:'refunded'}]]){
    const {ids}=await landing({authenticated:true,entitlements});
    assert.equal(ids.kitOpen.classList.contains('hidden'),true);
    assert.match(ids.kitStatus.textContent,/support@foodmyway/);
    assert.equal(ids.kitCheckout.href,'https://buy.stripe.com/test');
  }
});
test('purchase outage is unavailable rather than a false no-purchase result',async()=>{
  for(const [state,options] of [[{authenticated:true,entitlementUnavailable:true},{}],[{}, {ok:false}]]){
    const {ids}=await landing(state,options);
    assert.match(ids.kitStatus.textContent,/temporarily unavailable/);
    assert.equal(ids.kitOpen.classList.contains('hidden'),true);
  }
});
test('signed-out visitors keep checkout and sign-in; network errors surface',async()=>{
  const {ids,events}=await landing({authenticated:false});
  ids.kitCheckout.listeners.click();
  assert.equal(events.includes('kit_checkout_started'),true);
  const failed=await landing({}, {reject:true});
  assert.match(failed.ids.kitStatus.textContent,/Network unavailable/);
});

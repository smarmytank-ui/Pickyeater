import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const script=await readFile(new URL('../survival-kit.js',import.meta.url),'utf8');
class Element{
  constructor(hidden=false){
    this.classes=new Set(hidden?['hidden']:[]);
    this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};
    this.events={};this.attributes={};this.textContent='';
  }
  addEventListener(name,listener){this.events[name]=listener;}
  setAttribute(name,value){this.attributes[name]=value;}
  removeAttribute(name){delete this.attributes[name];}
  click(){this.clicked=true;}
  remove(){}
  focus(){}
  scrollIntoView(){}
}
async function page({state={authenticated:false},sessionStatus=200,downloadStatus=200,downloadType='application/pdf',downloadBody='%PDF-fixture',telemetryEnabled=true,checkout='https://buy.stripe.com/example'}={}){
  const ids=Object.fromEntries(['kitSignIn','kitStatus','kitDownload','kitOpen','kitCheckout','kitCheckoutBottom','kitPurchaseSummary','kitPurchaseFineprint','kitAppReturn','kitAppHeading','kitAppCopy','kitAppLink','kitQuestionsHeading'].map(id=>[id,new Element(['kitDownload','kitOpen'].includes(id))]));
  for(const [id,value] of Object.entries({kitAppReturn:'Try the app free',kitAppHeading:'Try a swap before you buy.',kitAppCopy:'Free app with three saves. $19 Kit.',kitAppLink:'Try Food My Way free',kitQuestionsHeading:'Before you buy'})) ids[id].textContent=value;
  const events=[];const links=[];
  const context={
    crypto,URL:class extends URL{static createObjectURL(){return 'blob:local-test';}static revokeObjectURL(){}},URLSearchParams,
    location:{search:'',pathname:'/survival-kit.html'},setTimeout(){},
    window:{FMW_CONFIG:{survivalKitCheckoutUrl:checkout,telemetryEnabled}},
    document:{getElementById:id=>ids[id],querySelector:()=>null,createElement:()=>new Element(),body:{append:element=>links.push(element)}},
    fetch:async(url,options)=>{
      if(url==='/api/events'){events.push(JSON.parse(options.body));return new Response('{}');}
      if(url==='/api/auth/session')return Response.json(state,{status:sessionStatus});
      if(url==='/api/survival-kit-download')return new Response(downloadBody,{status:downloadStatus,headers:{'content-type':downloadType}});
      throw new Error('Unexpected network request '+url);
    }
  };
  vm.runInNewContext(script,context);
  await new Promise(resolve=>setImmediate(resolve));
  return {ids,events,links,download:()=>ids.kitDownload.events.click({preventDefault(){}})};
}
test('Founding and Kit buyers can reach their purchased PDF; refunded accounts cannot',async()=>{
  for(const plan of ['founding','survival_kit']){
    const result=await page({state:{authenticated:true,entitlements:[{plan,status:'active'}]}});
    assert.equal(result.ids.kitDownload.classes.has('hidden'),false);
    assert.equal(result.ids.kitOpen.classes.has('hidden'),false);
    assert.equal(result.ids.kitSignIn.classes.has('hidden'),true);
    assert.equal(result.ids.kitCheckout.href,'./digital-kit.html');
    assert.equal(result.ids.kitCheckout.textContent,'Open my Kit');
    assert.equal(result.ids.kitPurchaseSummary.classes.has('hidden'),true);
  }
  const result=await page({state:{authenticated:true,entitlements:[{plan:'founding',status:'refunded'}]}});
  assert.equal(result.ids.kitDownload.classes.has('hidden'),true);
  assert.equal(result.ids.kitCheckout.href,'https://buy.stripe.com/example');
  assert.match(result.ids.kitStatus.textContent,/email on your Stripe receipt/);
});
test('purchase storage failures show retry feedback instead of a false missing purchase',async()=>{
  const result=await page({state:{authenticated:true,entitlementUnavailable:true}});
  assert.match(result.ids.kitStatus.textContent,/temporarily unavailable/);
  assert.equal(result.ids.kitDownload.classes.has('hidden'),true);
  assert.equal(result.ids.kitCheckout.href,'#access');
  let prevented=false;
  result.ids.kitCheckout.events.click({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(result.events.some(item=>item.event==='kit_checkout_started'),false);
});

test('owned copy distinguishes Founding from Kit-only without selling the owned Kit again',async()=>{
  for(const plan of ['founding','survival_kit']){
    const result=await page({state:{authenticated:true,entitlements:[{plan,status:'active'}]}});
    assert.equal(result.ids.kitAppReturn.textContent,'Back to my app');
    assert.equal(result.ids.kitAppLink.textContent,'Open my app');
    assert.equal(result.ids.kitQuestionsHeading.textContent,'Kit questions');
    assert.equal(result.ids.kitAppHeading.textContent,'Keep cooking your way.');
    assert.doesNotMatch(result.ids.kitAppCopy.textContent,/\$19|before you buy/);
    if(plan==='founding') assert.match(result.ids.kitAppCopy.textContent,/unlimited saved recipes, premium app features/);
    else{
      assert.match(result.ids.kitAppCopy.textContent,/save up to three recipes/);
      assert.doesNotMatch(result.ids.kitAppCopy.textContent,/unlimited|premium app features/);
    }
  }
});

test('free and unavailable membership preserve public copy without claiming ownership',async()=>{
  for(const state of [{authenticated:false},{authenticated:true,entitlementUnavailable:true}]){
    const result=await page({state});
    assert.equal(result.ids.kitAppReturn.textContent,'Try the app free');
    assert.equal(result.ids.kitQuestionsHeading.textContent,'Before you buy');
    assert.equal(result.ids.kitAppCopy.textContent,'Free app with three saves. $19 Kit.');
  }
});
test('failed downloads stay on the page with feedback and never count as ready',async()=>{
  for(const options of [
    {downloadStatus:503,downloadType:'application/json',downloadBody:JSON.stringify({error:'The download is temporarily unavailable.'})},
    {downloadType:'text/html',downloadBody:'not a PDF'},
    {downloadBody:''}
  ]){
    const result=await page(options);await result.download();
    assert.equal(result.links.length,0);
    assert.equal(result.events.some(item=>item.event==='kit_download_ready'||item.event==='kit_downloaded'),false);
    assert.equal(result.ids.kitDownload.attributes['aria-busy'],undefined);
    assert.match(result.ids.kitStatus.textContent,/unavailable|verified|empty/);
  }
});
test('a complete PDF is handed to the browser before recording download readiness',async()=>{
  const result=await page();await result.download();
  assert.equal(result.links.length,1);
  assert.equal(result.links[0].clicked,true);
  assert.equal(result.links[0].download,'FoodMyWay-Picky-Eater-Survival-Kit.pdf');
  assert.equal(result.events.filter(item=>item.event==='kit_download_ready').length,1);
  assert.equal(result.events.some(item=>item.event==='kit_downloaded'),false);
});
test('Kit page respects disabled telemetry and rejects checkout URLs carrying credentials',async()=>{
  const result=await page({telemetryEnabled:false,checkout:'https://user:password@buy.stripe.com/example'});
  await result.download();
  assert.equal(result.events.length,0);
  assert.equal(result.ids.kitCheckout.attributes['aria-disabled'],'true');
});

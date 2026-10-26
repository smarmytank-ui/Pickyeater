const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
function harness(session,status='ready'){
  const elements={};
  const element=id=>elements[id]??=( {textContent:'',disabled:false,dataset:{},hidden:false,classList:{toggle(name,on){elements[id].hidden=on;},contains(){return true;},add(){},remove(){}},click(){this.clicked=true;}} );
  const context=vm.createContext({URL,TextEncoder,TextDecoder,Uint8Array,Buffer,console,setTimeout,clearTimeout});
  vm.runInContext(script,context);
  context.document={getElementById:element};
  context.input=session;context.inputStatus=status;
  const checkout=script.slice(script.indexOf('  const openFounderOffer = async()=>{'),script.indexOf("  founderCta?.addEventListener('click', openFounderOffer);"));
  vm.runInContext(`
    accountSession=input;accountSessionStatus=inputStatus;
    getPublicConfig=()=>({accountsEnabled:true,premiumEnforced:true,founderCheckoutUrl:'https://buy.stripe.com/example'});
    checkoutIsPending=()=>false;clearCheckoutPending=()=>{};
    track=()=>{globalThis.tracked=true};
    const checkoutReady=true,checkoutUrl='https://buy.stripe.com/example';
    globalThis.location={assign(url){globalThis.redirect=url;}};
    ${checkout}
    globalThis.api={render:renderAccountState,premium:()=>requirePremium('weekly_planning'),checkout:openFounderOffer,founding:()=>accountHasActivePlan('founding')};
  `,context);
  return {context,elements,api:context.api};
}
test('Founding membership from verified entitlement collection replaces acquisition with access',async()=>{
  const {api,elements,context}=harness({authenticated:true,email:'owner@example.test',entitlements:[{plan:'survival_kit',status:'active'},{plan:'founding',status:'active'}]});
  api.render();
  assert.equal(api.premium(),true);
  assert.equal(elements.pricing.hidden,true);
  assert.equal(elements.memberAccessPanel.hidden,false);
  assert.match(elements.memberAccessStatus.textContent,/premium app and Survival Kit/);
  await api.checkout();
  assert.equal(elements.openAccount.clicked,true);
  assert.equal(context.redirect,undefined);
  assert.equal(context.tracked,undefined);
});
test('Kit ownership does not grant Founding premium or hide its optional upgrade',async()=>{
  const {api,elements,context}=harness({authenticated:true,entitlements:[{plan:'survival_kit',status:'active'}]});
  api.render();
  assert.equal(api.founding(),false);
  assert.equal(elements.pricing.hidden,false);
  assert.match(elements.memberAccessStatus.textContent,/separate optional upgrade/);
  await api.checkout();assert.equal(context.redirect,'https://buy.stripe.com/example');
});
test('free and signed-out visitors keep their existing Founding offer',async()=>{
  for(const session of [{authenticated:false},{authenticated:true,entitlements:[]}]){
    const {api,elements,context}=harness(session);api.render();
    assert.equal(elements.pricing.hidden,false);
    assert.equal(elements.memberAccessPanel.hidden,true);
    await api.checkout();assert.equal(context.redirect,'https://buy.stripe.com/example');
  }
});
test('loading, failed and unavailable membership suppress re-purchase and do not grant premium',async()=>{
  for(const [session,status] of [[{authenticated:false},'loading'],[{authenticated:false},'error'],[{authenticated:true,entitlementUnavailable:true,entitlement:{plan:'founding',status:'active'}},'ready']]){
    const {api,elements,context}=harness(session,status);api.render();
    assert.equal(api.founding(),false);
    assert.equal(elements.pricing.hidden,true);
    assert.match(elements.memberAccessStatus.textContent,/has not been verified/);
    await api.checkout();assert.equal(context.redirect,undefined);
    assert.equal(elements.openAccount.clicked,true);
    assert.match(elements.accountError.textContent,/without buying again/);
  }
});
test('a refunded entitlement and an unauthenticated stale entitlement cannot unlock premium',async()=>{
  for(const session of [{authenticated:true,entitlement:{plan:'founding',status:'refunded'}},{authenticated:false,entitlement:{plan:'founding',status:'active'}}]){
    const {api}=harness(session);assert.equal(api.founding(),false);
  }
});

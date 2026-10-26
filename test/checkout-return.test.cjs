const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const pendingKey='foodMyWayCheckoutPending';
function storage(initial={}){
  const data=new Map(Object.entries(initial));
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
function runReturn(result,{pending=false}={}){
  const savedMarker=String(Date.now()-1000);
  const local=storage(pending?{[pendingKey]:savedMarker}:{}),session=storage();
  const output={toasts:[],events:[],cleaned:[],bannerShown:false};
  const context=vm.createContext({URL,URLSearchParams,TextEncoder,TextDecoder,Uint8Array,console,setTimeout,clearTimeout});
  // Load the real application; its browser initialization is not invoked.
  vm.runInContext(source,context,{filename:'app.js'});
  Object.assign(context,{
    localStorage:local,sessionStorage:session,
    location:{search:`?founding=${result}`,pathname:'/',hash:'#inputCard'},
    history:{replaceState:(_state,_title,url)=>output.cleaned.push(url)},
    document:{getElementById:id=>id==='checkoutStatus'?{classList:{remove:name=>{if(name==='hidden')output.bannerShown=true;}}}:null},
    output,
    fetch(){throw Error('A return URL must not call a payment or account provider.');}
  });
  vm.runInContext(`
    showToast=message=>output.toasts.push(message);
    track=(event,details)=>output.events.push({event,...details});
    handleCheckoutReturn();
    globalThis.resultAccount=JSON.stringify(accountSession);
  `,context);
  return {output,local,session,savedMarker,account:JSON.parse(context.resultAccount)};
}
test('cancel without an earlier checkout does not create pending payment or claim a charge outcome',()=>{
  const {output,local,session}=runReturn('cancel');
  assert.deepEqual(output.toasts,['Checkout canceled. You can try again when you are ready.']);
  assert.equal(local.getItem(pendingKey),null);
  assert.equal(session.getItem(pendingKey),null);
  assert.equal(output.bannerShown,false);
});
test('cancel preserves a separate earlier pending checkout and explains the remaining access check',()=>{
  const {output,local,savedMarker}=runReturn('cancel',{pending:true});
  assert.deepEqual(output.toasts,['Checkout canceled. An earlier checkout is still awaiting an access check.']);
  assert.equal(local.getItem(pendingKey),savedMarker);
  assert.equal(output.bannerShown,true);
});
test('success return is only a pending access check and cannot grant authentication or paid entitlement',()=>{
  const {output,local,account}=runReturn('success');
  assert.equal(output.toasts.length,1);
  assert.match(output.toasts[0],/^Checking your purchase\./);
  assert.ok(Number(local.getItem(pendingKey))>0);
  assert.equal(output.bannerShown,true);
  assert.equal(account.authenticated,false);
  assert.equal(account.entitlement,null);
  assert.doesNotMatch(output.toasts.join(' '),/received|verified|unlocked|paid/i);
});
test('recognized return queries are consumed once and preserve the application path and anchor',()=>{
  for(const result of ['cancel','success']){
    const {output}=runReturn(result);
    assert.deepEqual(output.cleaned,['/#inputCard']);
    assert.equal(output.events.length,1);
    assert.equal(output.events[0].event,'founder_checkout_returned');
    assert.equal(output.events[0].result,result);
  }
  const {output}=runReturn('unrecognized');
  assert.deepEqual(output.cleaned,[]);
  assert.equal(output.events.length,0);
  assert.equal(output.toasts.length,0);
});

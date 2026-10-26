import { sqliteD1 } from './helpers/sqlite-d1.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { onRequestPost } from '../functions/api/stripe-webhook.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

class D1Statement{
  constructor(database,sql){ this.database=database; this.sql=sql; this.values=[]; }
  bind(...values){ this.values=values; return this; }
  async run(){ return sqliteD1(this.database,this.sql,'run',this.values); }
}

class TestD1{
  constructor(database){ this.database=database; }
  prepare(sql){ return new D1Statement(this.database,sql); }
  async batch(statements){
    this.database.exec('BEGIN');
    try{
      const results=[];
      for(const statement of statements) results.push(await statement.run());
      this.database.exec('COMMIT');
      return results;
    }catch(error){
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

async function signature(payload,secret,timestamp){
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,encoder.encode(`${timestamp}.${payload}`));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function deliver(event,env){
  const payload=JSON.stringify(event);
  const deliveredAt=Math.floor(Date.now()/1000);
  const digest=await signature(payload,env.STRIPE_WEBHOOK_SECRET,deliveredAt);
  const request=new Request('https://foodmyway.app/api/stripe-webhook',{
    method:'POST',body:payload,headers:{'stripe-signature':`t=${deliveredAt},v1=${digest}`}
  });
  return onRequestPost({request,env});
}

async function deliverWithSecret(event,env,secret){
  const payload=JSON.stringify(event);
  const deliveredAt=Math.floor(Date.now()/1000);
  const digest=await signature(payload,secret,deliveredAt);
  const request=new Request('https://foodmyway.app/api/stripe-webhook',{
    method:'POST',body:payload,headers:{'stripe-signature':`t=${deliveredAt},v1=${digest}`}
  });
  return onRequestPost({request,env});
}

function purchaseEvent(created=100){
  return {id:`evt_purchase_${created}`,created,type:'checkout.session.completed',data:{object:{
    id:'cs_ordered',mode:'payment',payment_status:'paid',currency:'usd',amount_subtotal:2900,amount_total:2900,
    customer:'cus_ordered',payment_intent:'pi_ordered',customer_details:{email:'Buyer@Example.com'},
    metadata:{offer:'food_my_way_founding'}
  }}};
}

function refundEvent(created=200){
  return {id:`evt_refund_${created}`,created,type:'charge.refunded',data:{object:{
    payment_intent:'pi_ordered',amount:2900,amount_refunded:2900,refunded:true
  }}};
}

async function environment(){
  const database=new DatabaseSync(':memory:');
  database.exec(await readFile(path.join(root,'migrations/0002_purchase_entitlements.sql'),'utf8'));
  database.exec(await readFile(path.join(root,'migrations/0006_refund_tombstones.sql'),'utf8'));
  database.exec(await readFile(path.join(root,'migrations/0007_survival_kit_entitlement.sql'),'utf8'));
  database.exec(await readFile(path.join(root,'migrations/0008_paid_orders.sql'),'utf8'));
  return {database,env:{PURCHASES:new TestD1(database),STRIPE_WEBHOOK_SECRET:'whsec_integration'}};
}

test('a full refund revokes an existing founding entitlement',async()=>{
  const {database,env}=await environment();
  assert.equal((await deliver(purchaseEvent(),env)).status,200);
  assert.equal((await deliver(refundEvent(),env)).status,200);
  assert.equal(database.prepare("SELECT status FROM entitlements WHERE email='buyer@example.com'").get().status,'refunded');
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM refunded_payments').get().count,1);
  assert.equal(database.prepare('SELECT status FROM paid_orders').get().status,'refunded');
  database.close();
});

test('a refund delivered first prevents delayed checkout fulfillment',async()=>{
  const {database,env}=await environment();
  assert.equal((await deliver(refundEvent(),env)).status,200);
  assert.equal((await deliver(purchaseEvent(),env)).status,200);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM entitlements').get().count,0);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM refunded_payments').get().count,1);
  assert.equal(database.prepare('SELECT status FROM paid_orders').get().status,'refunded');
  database.close();
});

for(const [offer,plan,amount] of [['food_my_way_founding','founding',2900],['food_my_way_survival_kit','survival_kit',1900]]){
  test(`a new ${plan} purchase restores access after refund without resurrecting the refunded payment`,async()=>{
    const {database,env}=await environment();
    try{
      const original=purchaseEvent();
      Object.assign(original.data.object,{amount_subtotal:amount,amount_total:amount,metadata:{offer}});
      const originalRefund=refundEvent();
      Object.assign(originalRefund.data.object,{amount,amount_refunded:amount});
      assert.equal((await deliver(original,env)).status,200);
      assert.equal((await deliver(originalRefund,env)).status,200);
      const replacement={...original,id:'evt_repurchase',created:300,data:{object:{...original.data.object,id:'cs_repurchase',payment_intent:'pi_repurchase'}}};
      assert.equal((await deliver(replacement,env)).status,200);
      const read=()=>database.prepare('SELECT plan,status,stripe_payment_intent_id FROM entitlements').get();
      assert.deepEqual({...read()},{plan,status:'active',stripe_payment_intent_id:'pi_repurchase'});

      // A later delivery/event timestamp does not make a refunded payment valid again.
      const replay={...original,id:'evt_old_payment_later',created:400};
      assert.equal((await deliver(replay,env)).status,200);
      assert.equal((await deliver({...originalRefund,id:'evt_old_refund_later',created:500},env)).status,200);
      assert.deepEqual({...read()},{plan,status:'active',stripe_payment_intent_id:'pi_repurchase'});
      assert.equal((await deliver({...originalRefund,id:'evt_repurchase_refund',created:600,data:{object:{...originalRefund.data.object,payment_intent:'pi_repurchase'}}},env)).status,200);
      assert.equal(read().status,'refunded');
    }finally{database.close();}
  });
}
test('a genuinely new payment restores access after a refund without reviving the refunded payment',async()=>{
  const {database,env}=await environment();
  try{
    await deliver(purchaseEvent(),env);
    await deliver(refundEvent(),env);
    const repurchase=purchaseEvent(300);
    repurchase.data.object.id='cs_repurchase';
    repurchase.data.object.payment_intent='pi_repurchase';
    assert.equal((await deliver(repurchase,env)).status,200);
    assert.deepEqual({...database.prepare('SELECT status,stripe_payment_intent_id FROM entitlements').get()},{status:'active',stripe_payment_intent_id:'pi_repurchase'});
    // A later-created async event for the original refunded payment must not replace the repurchase.
    const delayed=purchaseEvent(400);delayed.type='checkout.session.async_payment_succeeded';
    assert.equal((await deliver(delayed,env)).status,200);
    await deliver(refundEvent(),env);
    await deliver(repurchase,env);
    assert.deepEqual({...database.prepare('SELECT status,stripe_payment_intent_id FROM entitlements').get()},{status:'active',stripe_payment_intent_id:'pi_repurchase'});
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM stripe_events WHERE event_id='evt_purchase_300'").get().count,1);
  }finally{database.close();}
});

test('refund tombstones prevent same-second and later async events from resurrecting a refunded payment',async()=>{
  for(const checkoutCreated of [200,300]){
    const {database,env}=await environment();
    try{
      assert.equal((await deliver(refundEvent(200),env)).status,200);
      const checkout=purchaseEvent(checkoutCreated);checkout.type='checkout.session.async_payment_succeeded';
      assert.equal((await deliver(checkout,env)).status,200);
      assert.equal(database.prepare('SELECT COUNT(*) AS count FROM entitlements').get().count,0);
    }finally{database.close();}
  }
});

test('unpaid checkout completion never grants access and a successful async payment does',async()=>{
  const {database,env}=await environment();
  try{
    const pending=purchaseEvent(100);pending.data.object.payment_status='unpaid';
    assert.equal((await deliver(pending,env)).status,200);
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM entitlements').get().count,0);
    const paid=purchaseEvent(150);paid.type='checkout.session.async_payment_succeeded';
    assert.equal((await deliver(paid,env)).status,200);
    assert.equal(database.prepare('SELECT status FROM entitlements').get().status,'active');
  }finally{database.close();}
});

test('the isolated rehearsal accepts only its test link and designated email',async()=>{
  const {database,env}=await environment();
  Object.assign(env,{
    STRIPE_TEST_WEBHOOK_SECRET:'whsec_test_rehearsal',
    STRIPE_TEST_PAYMENT_LINK_ID:'plink_test_rehearsal',
    STRIPE_TEST_CUSTOMER_EMAIL:'support+launch-test@foodmyway.app'
  });
  const event={id:'evt_test_rehearsal',created:300,type:'checkout.session.completed',data:{object:{
    id:'cs_test_rehearsal',livemode:false,mode:'payment',payment_status:'paid',currency:'usd',amount_subtotal:1900,amount_total:1900,
    customer:'cus_test_rehearsal',payment_intent:'pi_test_rehearsal',payment_link:'plink_test_rehearsal',
    customer_details:{email:'support+launch-test@foodmyway.app'},metadata:{offer:'food_my_way_survival_kit'}
  }}};
  const accepted=await deliverWithSecret(event,env,env.STRIPE_TEST_WEBHOOK_SECRET);
  assert.equal(accepted.status,200,await accepted.text());
  assert.equal(database.prepare("SELECT status FROM entitlements WHERE email='support+launch-test@foodmyway.app' AND plan='survival_kit'").get().status,'active');
  assert.equal(database.prepare("SELECT payment_mode FROM paid_orders WHERE stripe_session_id='cs_test_rehearsal'").get().payment_mode,'test');

  const wrongEmail={...event,id:'evt_wrong_email',data:{object:{...event.data.object,id:'cs_wrong_email',payment_intent:'pi_wrong_email',customer_details:{email:'someone@example.com'}}}};
  assert.equal((await deliverWithSecret(wrongEmail,env,env.STRIPE_TEST_WEBHOOK_SECRET)).status,422);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM entitlements WHERE email='someone@example.com'").get().count,0);

  const wrongSignatureEvent={...event,id:'evt_live_secret_test'};
  assert.equal((await deliverWithSecret(wrongSignatureEvent,env,env.STRIPE_WEBHOOK_SECRET)).status,503);
  database.close();
});

test('signed orders retain attribution once per session and keep repurchases separate',async()=>{
  const {database,env}=await environment();
  try{
    const first=purchaseEvent();
    Object.assign(first.data.object,{livemode:true,client_reference_id:'fmw1-tiktok-four_safe_foods'});
    assert.equal((await deliver(first,env)).status,200);
    assert.equal((await deliver({...first,id:'evt_repeat'},env)).status,200);
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM paid_orders').get().n,1);
    const original=database.prepare('SELECT * FROM paid_orders').get();
    assert.equal(original.payment_mode,'live');
    assert.equal(original.campaign_source,'tiktok');
    assert.equal(original.campaign_creative,'four_safe_foods');
    const changed={...first,id:'evt_changed_attribution',data:{object:{...first.data.object,client_reference_id:'fmw1-facebook-taco_swap'}}};
    assert.equal((await deliver(changed,env)).status,200);
    assert.equal(database.prepare('SELECT campaign_source FROM paid_orders').get().campaign_source,'tiktok');
    assert.equal((await deliver(refundEvent(),env)).status,200);
    const second={...first,id:'evt_second',created:300,data:{object:{...first.data.object,id:'cs_second',payment_intent:'pi_second',client_reference_id:'unrecognized'}}};
    assert.equal((await deliver(second,env)).status,200);
    assert.deepEqual(database.prepare('SELECT status,campaign_source FROM paid_orders ORDER BY stripe_event_created').all().map(row=>({...row})),[
      {status:'refunded',campaign_source:'tiktok'},{status:'paid',campaign_source:'unknown'}
    ]);
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM entitlements').get().n,1);
  }finally{database.close();}
});

test('invalid signatures never create an attributed order',async()=>{
  const {database,env}=await environment();
  try{
    assert.equal((await onRequestPost({request:new Request('https://foodmyway.app/api/stripe-webhook',{method:'POST',body:JSON.stringify(purchaseEvent()),headers:{'stripe-signature':'invalid'}}),env})).status,400);
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM paid_orders').get().n,0);
  }finally{database.close();}
});

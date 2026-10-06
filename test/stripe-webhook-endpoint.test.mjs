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
  async run(){ return this.database.prepare(this.sql).run(...this.values); }
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
  return {database,env:{PURCHASES:new TestD1(database),STRIPE_WEBHOOK_SECRET:'whsec_integration'}};
}

test('a full refund revokes an existing founding entitlement',async()=>{
  const {database,env}=await environment();
  assert.equal((await deliver(purchaseEvent(),env)).status,200);
  assert.equal((await deliver(refundEvent(),env)).status,200);
  assert.equal(database.prepare("SELECT status FROM entitlements WHERE email='buyer@example.com'").get().status,'refunded');
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM refunded_payments').get().count,1);
  database.close();
});

test('a refund delivered first prevents delayed checkout fulfillment',async()=>{
  const {database,env}=await environment();
  assert.equal((await deliver(refundEvent(),env)).status,200);
  assert.equal((await deliver(purchaseEvent(),env)).status,200);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM entitlements').get().count,0);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM refunded_payments').get().count,1);
  database.close();
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

  const wrongEmail={...event,id:'evt_wrong_email',data:{object:{...event.data.object,id:'cs_wrong_email',payment_intent:'pi_wrong_email',customer_details:{email:'someone@example.com'}}}};
  assert.equal((await deliverWithSecret(wrongEmail,env,env.STRIPE_TEST_WEBHOOK_SECRET)).status,422);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM entitlements WHERE email='someone@example.com'").get().count,0);

  const wrongSignatureEvent={...event,id:'evt_live_secret_test'};
  assert.equal((await deliverWithSecret(wrongSignatureEvent,env,env.STRIPE_WEBHOOK_SECRET)).status,503);
  database.close();
});

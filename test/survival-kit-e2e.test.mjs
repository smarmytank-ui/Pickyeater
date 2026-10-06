import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { onRequestPost as receiveStripeWebhook } from '../functions/api/stripe-webhook.js';
import { onRequestPost as requestSignIn } from '../functions/api/auth/request.js';
import { onRequestPost as consumeSignIn } from '../functions/api/auth/consume.js';
import { onRequestGet as downloadKit } from '../functions/api/survival-kit-download.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

class Statement{
  constructor(database,sql){ this.database=database; this.sql=sql; this.values=[]; }
  bind(...values){ this.values=values; return this; }
  async first(){ return this.database.prepare(this.sql).get(...this.values); }
  async run(){ const result=this.database.prepare(this.sql).run(...this.values); return {meta:{changes:Number(result.changes)}}; }
  async all(){ return {results:this.database.prepare(this.sql).all(...this.values).map(row=>({...row}))}; }
}

class D1{
  constructor(database){ this.database=database; }
  prepare(sql){ return new Statement(this.database,sql); }
  async batch(statements){
    this.database.exec('BEGIN');
    try{
      const results=[];
      for(const statement of statements) results.push(await statement.run());
      this.database.exec('COMMIT');
      return results;
    }catch(error){ this.database.exec('ROLLBACK'); throw error; }
  }
}

async function stripeSignature(payload,secret,timestamp){
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,encoder.encode(`${timestamp}.${payload}`));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}

test('a paid $19 checkout fulfills email sign-in, entitlement, and private PDF download',async()=>{
  const accounts=new DatabaseSync(':memory:');
  accounts.exec('PRAGMA foreign_keys=ON');
  accounts.exec(await readFile(path.join(root,'migrations/0004_cloud_accounts.sql'),'utf8'));
  const purchases=new DatabaseSync(':memory:');
  purchases.exec(await readFile(path.join(root,'migrations/0002_purchase_entitlements.sql'),'utf8'));
  purchases.exec(await readFile(path.join(root,'migrations/0006_refund_tombstones.sql'),'utf8'));
  purchases.exec(await readFile(path.join(root,'migrations/0007_survival_kit_entitlement.sql'),'utf8'));

  const secret='whsec_survival_kit_rehearsal';
  const email='launch-rehearsal@example.com';
  const timestamp=Math.floor(Date.now()/1000);
  const event={
    id:'evt_survival_kit_rehearsal',created:timestamp,type:'checkout.session.completed',
    data:{object:{
      id:'cs_test_survival_kit_rehearsal',livemode:false,mode:'payment',payment_status:'paid',currency:'usd',
      amount_subtotal:1900,amount_total:1900,customer:'cus_test_rehearsal',payment_intent:'pi_test_rehearsal',
      customer_details:{email},payment_link:'plink_survival_kit_rehearsal',metadata:{offer:'food_my_way_survival_kit'}
    }}
  };
  const payload=JSON.stringify(event);
  const digest=await stripeSignature(payload,secret,timestamp);
  const webhookResponse=await receiveStripeWebhook({
    request:new Request('https://foodmyway.app/api/stripe-webhook',{method:'POST',body:payload,headers:{'stripe-signature':`t=${timestamp},v1=${digest}`}}),
    env:{PURCHASES:new D1(purchases),STRIPE_WEBHOOK_SECRET:'whsec_live_rehearsal',STRIPE_TEST_WEBHOOK_SECRET:secret,
      STRIPE_TEST_PAYMENT_LINK_ID:'plink_survival_kit_rehearsal',STRIPE_TEST_CUSTOMER_EMAIL:email}
  });
  assert.equal(webhookResponse.status,200);
  assert.deepEqual({...purchases.prepare('SELECT email,plan,status,amount,currency FROM entitlements').get()},{
    email,plan:'survival_kit',status:'active',amount:1900,currency:'usd'
  });

  let deliveredEmail;
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(_url,options)=>{
    deliveredEmail=JSON.parse(options.body);
    return new Response(JSON.stringify({id:'email_rehearsal'}),{status:200});
  };
  const env={
    ACCOUNTS:new D1(accounts),PURCHASES:new D1(purchases),RESEND_API_KEY:'rehearsal-key',
    AUTH_FROM_EMAIL:'Food My Way <login@foodmyway.app>',AUTH_ORIGIN:'https://foodmyway.app',
    KIT_FILES:{async get(key){
      assert.equal(key,'FoodMyWay-Picky-Eater-Survival-Kit.pdf');
      return {body:new TextEncoder().encode('%PDF-1.7 Food My Way rehearsal')};
    }}
  };
  try{
    const emailResponse=await requestSignIn({
      request:new Request('https://foodmyway.app/api/auth/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,returnTo:'/survival-kit.html?download=1'})}),env
    });
    assert.equal(emailResponse.status,200);
    assert.deepEqual(deliveredEmail.to,[email]);
    const link=deliveredEmail.text.match(/https:\/\/[^\s]+/)[0];
    const token=new URL(link).searchParams.get('token');
    assert.ok(token);

    const signInResponse=await consumeSignIn({
      request:new Request('https://foodmyway.app/api/auth/consume',{method:'POST',body:new URLSearchParams({token,returnTo:'/survival-kit.html?download=1'})}),env
    });
    assert.equal(signInResponse.status,302);
    assert.match(signInResponse.headers.get('location'),/survival-kit\.html\?download=1&login=success/);
    const cookie=signInResponse.headers.get('set-cookie').split(';',1)[0];

    const downloadResponse=await downloadKit({
      request:new Request('https://foodmyway.app/api/survival-kit-download',{headers:{cookie}}),env
    });
    assert.equal(downloadResponse.status,200);
    assert.equal(downloadResponse.headers.get('content-type'),'application/pdf');
    assert.match(downloadResponse.headers.get('content-disposition'),/FoodMyWay-Picky-Eater-Survival-Kit\.pdf/);
    assert.equal(await downloadResponse.text(),'%PDF-1.7 Food My Way rehearsal');
  }finally{
    globalThis.fetch=originalFetch;
    accounts.close();
    purchases.close();
  }
});

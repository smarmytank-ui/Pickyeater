import test from 'node:test';
import assert from 'node:assert/strict';
import { foundingEntitlementFromEvent, stripeSignatureIsValid } from '../functions/_shared/stripe-webhook.mjs';

async function signature(payload,secret,timestamp){
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,encoder.encode(`${timestamp}.${payload}`));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}

test('verifies a current Stripe webhook signature and rejects stale signatures',async()=>{
  const payload='{"id":"evt_test"}';
  const secret='whsec_test';
  const timestamp=2_000_000_000;
  const digest=await signature(payload,secret,timestamp);
  assert.equal(await stripeSignatureIsValid(payload,`t=${timestamp},v1=${digest}`,secret,{now:timestamp}),true);
  assert.equal(await stripeSignatureIsValid(payload,`t=${timestamp},v1=${digest}`,secret,{now:timestamp+301}),false);
  assert.equal(await stripeSignatureIsValid(`${payload}x`,`t=${timestamp},v1=${digest}`,secret,{now:timestamp}),false);
});

test('creates entitlement only for the exact paid founding offer',()=>{
  const event={id:'evt_1',type:'checkout.session.completed',data:{object:{
    id:'cs_1',mode:'payment',payment_status:'paid',currency:'usd',amount_total:2900,
    customer:'cus_1',payment_intent:'pi_1',customer_details:{email:'Buyer@Example.com'},
    metadata:{offer:'food_my_way_founding'}
  }}};
  assert.deepEqual(foundingEntitlementFromEvent(event),{
    email:'buyer@example.com',stripeCustomerId:'cus_1',stripeSessionId:'cs_1',
    stripePaymentIntentId:'pi_1',amount:2900,currency:'usd',status:'active'
  });
  assert.equal(foundingEntitlementFromEvent({...event,type:'checkout.session.expired'}),null);
  assert.equal(foundingEntitlementFromEvent({...event,data:{object:{...event.data.object,payment_status:'unpaid'}}}),null);
});

test('rejects a mismatched founding price',()=>{
  const event={type:'checkout.session.completed',data:{object:{
    id:'cs_bad',mode:'payment',payment_status:'paid',currency:'usd',amount_total:1900,
    customer_details:{email:'buyer@example.com'},metadata:{offer:'food_my_way_founding'}
  }}};
  assert.throws(()=>foundingEntitlementFromEvent(event),/amount/);
});

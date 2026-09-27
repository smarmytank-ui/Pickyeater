import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoundingUnsubscribeToken, normalizeFoundingLead, verifyFoundingUnsubscribeToken } from '../functions/_shared/founding.mjs';
import { onRequestGet as showUnsubscribe, onRequestPost as confirmUnsubscribe } from '../functions/api/founding-unsubscribe.js';

test('normalizes an explicitly consenting founding lead',()=>{
  assert.deepEqual(normalizeFoundingLead({email:'  TEST@Example.COM ',consent:true,source:'tiktok'}),{
    email:'test@example.com',consent:true,source:'tiktok'
  });
});

test('rejects malformed email and missing consent',()=>{
  assert.throws(()=>normalizeFoundingLead({email:'nope',consent:true}),/valid email/);
  assert.throws(()=>normalizeFoundingLead({email:'ok@example.com',consent:false}),/consent/);
});

test('unsubscribe tokens are email-bound and tamper resistant',async()=>{
  const secret='food-my-way-test-secret-with-more-than-32-characters';
  const token=await createFoundingUnsubscribeToken('TEST@example.com',secret);
  assert.equal(await verifyFoundingUnsubscribeToken('test@example.com',token,secret),true);
  assert.equal(await verifyFoundingUnsubscribeToken('other@example.com',token,secret),false);
  assert.equal(await verifyFoundingUnsubscribeToken('test@example.com',`${token.slice(0,-1)}x`,secret),false);
  assert.equal(await verifyFoundingUnsubscribeToken('test@example.com',token,'different-secret-with-more-than-32-characters'),false);
});

test('unsubscribe confirmation is read-only until a signed POST updates consent',async()=>{
  const secret='food-my-way-test-secret-with-more-than-32-characters';
  const email='person@example.com';
  const token=await createFoundingUnsubscribeToken(email,secret);
  const url=`https://foodmyway.app/api/founding-unsubscribe?token=${token}`;
  let writes=0;
  let bound=[];
  const env={LEADS:{prepare:sql=>({bind:(...values)=>{
    bound=values;
    return {
      first:async()=>sql.startsWith('SELECT') ? {email} : null,
      run:async()=>{writes+=1;}
    };
  }})}};
  const getResponse=await showUnsubscribe({request:new Request(url),env});
  assert.equal(getResponse.status,200);
  assert.match(await getResponse.text(),/Confirm unsubscribe/);
  assert.equal(writes,0);
  const postResponse=await confirmUnsubscribe({request:new Request(url,{method:'POST'}),env});
  assert.equal(postResponse.status,200);
  assert.match(await postResponse.text(),/You are unsubscribed/);
  assert.equal(writes,1);
  assert.equal(bound[1],email);
  assert.doesNotMatch(url,/person%40|person@/);
});

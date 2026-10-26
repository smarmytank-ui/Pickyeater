import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignFromSearch,checkoutWithAttribution,parseCheckoutReference,attributedInternalUrl} from '../checkout-attribution.mjs';

test('both offer destinations carry only allowlisted campaign context into Stripe',()=>{
  for(const url of ['https://buy.stripe.com/kit','https://buy.stripe.com/founding']){
    const result=new URL(checkoutWithAttribution(url,'?utm_source=ig&utm_content=four_safe_foods&email=private@example.com'));
    assert.deepEqual(parseCheckoutReference(result.searchParams.get('client_reference_id')),{source:'instagram',creative:'four_safe_foods',reference:null});
    assert.doesNotMatch(result.href,/private|email/);
  }
});
test('opaque VEYZLO references remain compatible alone and alongside campaign context',()=>{
  const reference=`vz_${'a'.repeat(48)}`;
  for(const search of [`?veyzlo_ref=${reference}`,`?utm_source=tiktok&utm_content=link_in_bio&veyzlo_ref=${reference}`]){
    const url=new URL(checkoutWithAttribution('https://buy.stripe.com/kit',search));
    assert.equal(parseCheckoutReference(url.searchParams.get('client_reference_id')).reference,reference);
  }
});
test('unknown or malformed campaign data is not retained',()=>{
  assert.deepEqual(campaignFromSearch('?utm_source=private@example.com&utm_content=secret&veyzlo_ref=token'),{source:'unknown',creative:'unknown',reference:null});
  for(const reference of ['private@example.com','fmw1-email-address',null,'fmw1-tiktok-four_safe_foods-extra','x'.repeat(201)]){
    assert.deepEqual(parseCheckoutReference(reference),{source:'unknown',creative:'unknown',reference:null});
  }
  assert.equal(checkoutWithAttribution('https://evil.example/?token=secret','?utm_source=tiktok'),'https://evil.example/?token=secret');
  assert.equal(checkoutWithAttribution('https://user:pass@buy.stripe.com/kit','?utm_source=tiktok'),'https://user:pass@buy.stripe.com/kit');
});

test('internal offer navigation preserves bounded context in both directions',()=>{
  const search='?utm_source=fb&utm_content=taco_swap&email=private@example.com';
  assert.equal(attributedInternalUrl('./survival-kit.html',search),'/survival-kit.html?utm_source=facebook&utm_content=taco_swap');
  assert.equal(attributedInternalUrl('./',search),'/?utm_source=facebook&utm_content=taco_swap');
  assert.equal(attributedInternalUrl('https://elsewhere.example/',search),'https://elsewhere.example/');
  assert.equal(attributedInternalUrl('/api/auth/session',search),'/api/auth/session');
});

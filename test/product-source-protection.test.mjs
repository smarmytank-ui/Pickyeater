import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/products/[[path]].js';

test('product authoring sources never fall through to public static assets',async()=>{
 for(const method of ['GET','HEAD','POST','OPTIONS']){
  for(const path of ['/products/survival-kit/build_kit.py','/products/survival-kit/verify_bean_correction.py','/products/survival-kit/']){
   let delegated=false;
   const response=await onRequest({request:new Request(`https://foodmyway.app${path}`,{method}),next(){delegated=true;}});
   assert.equal(response.status,404);assert.equal(response.headers.get('cache-control'),'no-store');
   assert.equal(response.headers.get('x-content-type-options'),'nosniff');
   assert.equal(await response.text(),'Not found.');assert.equal(delegated,false);
  }
 }
});

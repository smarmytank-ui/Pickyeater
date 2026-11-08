import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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

test('static builder launcher contains no paid recipe content even if Functions fail open',()=>{
 const launcher=readFileSync(new URL('../products/survival-kit/build_kit.py',import.meta.url),'utf8');
 assert.match(launcher,/runpy\.run_path/);assert.match(launcher,/build_survival_kit\.py/);
 assert.ok(launcher.length<500);assert.doesNotMatch(launcher,/Cheesy Taco Rice|recipes\s*=|groceryLists|165/);
 const privateSource=readFileSync(new URL('../functions/_shared/build_survival_kit.py',import.meta.url),'utf8');
 assert.match(privateSource,/recipes\s*=/);assert.match(privateSource,/ROOT = Path\(__file__\)\.resolve\(\)\.parents\[2\]/);
});

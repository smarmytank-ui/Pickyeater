import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFoodDetail, normalizeFoodSummary, normalizeSearchQuery } from '../functions/_shared/fatsecret.mjs';

test('food search queries are bounded and normalized',()=>{
  assert.equal(normalizeSearchQuery('  grilled   chicken  '),'grilled chicken');
  assert.throws(()=>normalizeSearchQuery('x'),/two characters/);
  assert.equal(normalizeSearchQuery('a'.repeat(100)).length,80);
});

test('FatSecret search results expose only diary-safe fields',()=>{
  assert.deepEqual(normalizeFoodSummary({food_id:'42',food_name:'Chicken Bowl',brand_name:'Example Grill',food_type:'Brand',food_description:'Per serving'}),{
    id:'42',name:'Chicken Bowl',brand:'Example Grill',type:'Brand',description:'Per serving'
  });
});

test('FatSecret food details normalize serving macros',()=>{
  const food=normalizeFoodDetail({food_id:'42',food_name:'Chicken Bowl',brand_name:'Example Grill',servings:{serving:{serving_id:'1',serving_description:'1 bowl',calories:'420',protein:'32',carbohydrate:'45',fat:'12'}}});
  assert.equal(food.servings.length,1);
  assert.deepEqual(food.servings[0],{id:'1',label:'1 bowl',calories:420,protein:32,carbs:45,fat:12});
});

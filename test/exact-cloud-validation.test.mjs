import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeCloudSnapshot} from '../functions/_shared/account.mjs';
test('malformed exact backup keys reject explicitly instead of discarding protected records',()=>{
  for(const value of [null,'invalid',{},[{id:'unmarked'}]]) assert.throws(()=>normalizeCloudSnapshot({data:{foodMyWayExactRecipesV3:value}}),/Invalid exact recipe backup/);
  const recipe={exact:true,id:'synthetic-original',ingredients:[{originalText:'synthetic rice'}],nutrition:{calories:0}};
  const normalized=normalizeCloudSnapshot({data:{foodMyWayExactRecipesV3:[recipe]}});
  assert.equal(normalized.snapshot.data.foodMyWayExactRecipesV3[0].nutrition,null);
  assert.equal(normalized.snapshot.data.foodMyWayExactRecipesV3[0].nutritionStatus,'unavailable');
});

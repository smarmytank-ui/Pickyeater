const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function harness(){
  const filename=process.env.SWAP_SOURCE || 'app.js';
  const context=vm.createContext({console,URL,TextEncoder,TextDecoder,Uint8Array,Buffer,btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),setTimeout,clearTimeout});
  // Keep the real swap engine, normalization, instructions, persistence and commerce.
  // Stub only browser rendering/nutrition output, which require DOM elements.
  const bridge=`
    render=()=>{};
    computeMacrosPerServing=()=>{};
    globalThis.api={
      swap(name,replacement,options={keepRole:true,keepQty:true},base){
        servings=2;
        state={ingredients:normalize([name]),preferences:{texture:'any',servingStyle:'mixed'}};
        if(base) state.ingredients[0].base=base;
        applySwap(state.ingredients[0].id,replacement,options);
        return JSON.parse(JSON.stringify(state));
      },
      defaults:BASE_QTY,
      format(ing,n){servings=n;return qtyStr(ing);},
      normalizeSavedRecipe,recipeCommerceItems
    };
  `;
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'..',filename),'utf8')+'\n'+bridge,context,{filename});
  return context.api;
}
function plain(value){return JSON.parse(JSON.stringify(value));}
test('custom onion/garlic powder swaps reset role, intent and unit to existing seasoning defaults',()=>{
  const api=harness();
  for(const [from,to] of [['onion','onion powder'],['garlic','garlic powder'],['chicken breast','onion powder']]){
    const recipe=api.swap(from,{name:to});
    const ing=recipe.ingredients[0];
    assert.equal(ing.role,'seasoning');
    assert.equal(ing.intent,'flavor');
    assert.deepEqual(plain(ing.base),plain(api.defaults.seasoning));
    assert.match(recipe.steps.map(s=>s.text).join(' '),/Taste and season/);
    assert.equal(recipe.steps.some(s=>s.key==='aromatic'),false);
    assert.match(api.format(ing,2),/tsp$/);
    assert.match(api.format(ing,4),/tsp$/);
    assert.equal(ing.base.v,api.defaults.seasoning.v);
  }
});
test('same-role and unknown custom swaps preserve adjusted slot quantity and intent',()=>{
  const api=harness();
  for(const name of ['green onion','mystery ingredient']){
    const recipe=api.swap('onion',{name},undefined,{v:3,u:'medium'});
    const ing=recipe.ingredients[0];
    assert.equal(ing.role,'aromatic');
    assert.deepEqual(plain(ing.base),{v:3,u:'medium'});
    assert.equal(ing.intent,api.swap('onion',{name:'onion'}).ingredients[0].intent);
  }
});
test('catalog quantity overrides and canonical ingredient defaults remain unchanged',()=>{
  const api=harness();
  const onion=api.swap('onion',{name:'green onion',unitOverride:'cups',baseOverride:0.5},{}).ingredients[0];
  assert.deepEqual(plain(onion.base),{v:0.5,u:'cups'});
  const garlic=api.swap('onion',{name:'garlic',unitOverride:'medium',baseOverride:9},{}).ingredients[0];
  assert.deepEqual(plain(garlic.base),{v:2,u:'cloves'});
});
test('corrected swap survives saved recipe normalization and scales grocery handoff with servings',()=>{
  const api=harness();
  const recipe=api.swap('onion',{name:'onion powder'});
  const restored=api.normalizeSavedRecipe({...recipe,id:'swap-test',servings:4,title:'Test dinner'});
  assert.ok(restored);
  assert.deepEqual(plain(restored.ingredients[0].base),plain(api.defaults.seasoning));
  assert.equal(restored.ingredients[0].intent,'flavor');
  const item=api.recipeCommerceItems(restored)[0];
  assert.equal(item.name,'onion powder');
  assert.equal(item.unit,'tsp');
  assert.equal(item.quantity,api.defaults.seasoning.v*2);
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const a=require('../app.js');
const recipe=inputs=>{const ingredients=a.normalize(inputs);return {ingredients,steps:a.buildInstructions(ingredients)}};
const output=r=>a.recipeInstructionSteps(r).map(s=>s.text).join('\n');

for(const food of ['canned kidney beans','cooked lentils','dried kidney beans','canned chickpeas and raw chicken']){
 test('generated legume safety is displayed once: '+food,()=>{
  const r=recipe([food]);const displayed=a.recipeInstructionSteps(r);
  assert.equal(displayed.filter(s=>s.key.startsWith('legume-')).length,1);
  assert.equal(displayed.filter(s=>s.key.startsWith('safety-legume-')).length,0);
  assert.doesNotMatch(output(r),/original instructions are not safety-verified/);
  assert.deepEqual(r.steps,a.buildInstructions(r.ingredients));
 });
}

test('original, partial and key-only safety claims retain full separate warning',()=>{
 const ingredients=a.normalize(['dried kidney beans']);
 for(const text of ['Warm 2 minutes.',a.buildInstructions(ingredients)[0].text.slice(0,200)]){
  const r={ingredients,steps:[{key:'legume-0',text}]};const displayed=a.recipeInstructionSteps(r);
  assert.equal(displayed[0].key,'safety-legume-0');assert.match(displayed[0].text,/at least 30 minutes/);assert.equal(displayed[1].text,text);
 }
 const exact=a.normalizeSavedRecipe({exact:true,title:'Original',ingredients:['dried kidney beans'],instructionsText:'Original private text.'});
 assert.match(a.recipeSafetyNotices(exact.ingredients)[0].text,/not safety-verified/);assert.equal(exact.instructionsText,'Original private text.');
});

test('main and shared render paths consistently use the deduplicated steps',()=>{
 const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.match(source,/recipeInstructionSteps\(state\)\.forEach/);
 assert.match(source,/recipeInstructionSteps\(recipe\)\.forEach/);
});

test('turkey rice broccoli without fat gets ordered explicit vessels and no new fat',()=>{
 const r=recipe(['ground turkey','rice','broccoli']);const byKey=key=>r.steps.find(s=>s.key===key).text;
 assert.match(byKey('oil'),/large nonstick pan over medium heat/);
 assert.match(byKey('starch-0'),/separate saucepan.*package directions/);
 assert.ok(r.steps.findIndex(s=>s.key==='starch-0')<r.steps.findIndex(s=>s.key==='protein-0'));
 assert.ok(r.steps.findIndex(s=>s.key==='oil')<r.steps.findIndex(s=>s.key==='protein-0'));
 assert.match(byKey('protein-0'),/to the pan.*165°F.*food thermometer/);
 assert.match(byKey('protein-0'),/clean plate before cooking the next component/);
 assert.match(byKey('veg'),/Broccoli to the pan/);
 assert.doesNotMatch(output(r),/add (?:oil|butter)/i);
 assert.equal(r.ingredients.some(i=>i.role==='fat'),false);
});

for(const food of ['cooked rice','cooked pasta','cooked potatoes'])test('cooked starch is reheated rather than cooked as raw: '+food,()=>{
 const r=recipe([food]);const text=r.steps.find(s=>s.key==='starch-0').text;
 assert.match(text,/Reheat the cooked/);assert.match(text,/leftovers.*165°F.*food thermometer/);
 assert.doesNotMatch(text,/then fluff|then drain|fork-tender/);
 assert.equal(r.steps.some(s=>s.key==='oil'),false);
});

test('frozen products retain package directions and do not invent a pan method',()=>{
 const r=recipe(['frozen rice','frozen salmon']);const text=output(r);
 assert.match(text,/frozen Rice separately according to its package directions/);
 assert.match(text,/frozen Salmon according to its package directions.*145°F/);
 assert.equal(r.steps.some(s=>s.key==='oil'),false);
});

test('egg dish gives a concrete safety endpoint without unlisted salt',()=>{
 const text=output(recipe(['eggs','bread']));assert.match(text,/cook gently in the pan.*160°F.*food thermometer/);assert.doesNotMatch(text,/pinch of salt/);
});

test('vegetable-only recipes have pan setup while grain-only recipes do not reference a pan',()=>{
 assert.match(output(recipe(['frozen broccoli'])),/Heat a large nonstick pan/);
 assert.doesNotMatch(output(recipe(['rice','lemon'])),/the pan|Heat a large/);
});

test('listed fats are used and quinoa and pasta have separate package-directed vessels',()=>{
 const text=output(recipe(['olive oil','tofu','quinoa','pasta']));
 assert.match(text,/medium heat and add Olive Oil/);assert.match(text,/package liquid amount and cooking time/);assert.match(text,/Boil Pasta according to the package directions in a separate pot/);
});


test('complete generated safety survives Save/Resume and shared-recipe normalization without duplication',()=>{
 for(const food of ['dried kidney beans','canned chickpeas and raw chicken']){
  const initial=recipe([food]);const saved=a.normalizeSavedRecipe({...initial,servings:2});
  assert.equal(saved.steps[0].text,initial.steps[0].text);
  assert.equal(a.recipeInstructionSteps(saved).filter(s=>s.key.startsWith('safety-legume-')).length,0);
  const shared=a.normalizeSavedRecipe(saved,{untrusted:true});
  assert.equal(a.recipeInstructionSteps(shared).filter(s=>s.key.startsWith('safety-legume-')).length,0);
 }
 const forged=a.normalizeSavedRecipe({ingredients:a.normalize(['kidney beans']),steps:[{key:'legume-0',text:'x'.repeat(500)}]});
 assert.equal(forged.steps[0].text.length,300);
 assert.match(a.recipeInstructionSteps(forged)[0].text,/at least 30 minutes/);
});

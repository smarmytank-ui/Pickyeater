const test=require('node:test');
const assert=require('node:assert/strict');
const a=require('../app.js');

for(const label of ['not cooked rice','not fully cooked rice','not precooked rice','not pre-cooked rice','not pre cooked rice','partially cooked rice','undercooked rice','under-cooked rice','un cooked rice']){
 test('compound preparation labels leave a clean ingredient name: '+label,()=>{
  const parsed=a.parseInputIngredient(label);
  assert.equal(parsed.name,'rice');
  assert.equal(parsed.preparation,'raw');
  const ingredients=a.normalize([label]);
  const steps=a.buildInstructions(ingredients);
  assert.match(steps.find(s=>s.key==='starch-0').text,/^Cook Rice in a separate saucepan/);
  assert.doesNotMatch(steps.map(s=>s.text).join('\n'),/Reheat the cooked|Not Rice|Partially Rice|Under/);
  const restored=a.normalizeSavedRecipe({ingredients:[{name:label,preparation:'cooked',role:'starch',base:{v:2,u:'cups'}}]});
  assert.equal(restored.ingredients[0].name,'rice');
  assert.equal(restored.ingredients[0].preparation,'raw');
  const again=a.normalizeSavedRecipe(JSON.parse(JSON.stringify(restored)),{untrusted:true});
  assert.equal(again.ingredients[0].name,'rice');
  assert.equal(again.ingredients[0].preparation,'raw');
 });
}

test('preparation cleanup preserves quantities and unrelated food-name words',()=>{
 assert.deepEqual(a.parseInputIngredient('2 cups not cooked rice'),{name:'rice',quantity:2,unit:'cups',preparation:'raw'});
 assert.equal(a.canonName('not chicken'),'not chicken');
 assert.equal(a.canonName('partially brown rice'),'partially brown rice');
 assert.equal(a.parseInputIngredient('cooked rice').preparation,'cooked');
 assert.equal(a.parseInputIngredient('frozen not cooked rice').preparation,'frozen');
});

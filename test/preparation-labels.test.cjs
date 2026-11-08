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
for(const pair of [
 ['1 cup cooked rice','2 cups not cooked rice'],
 ['1 cup cooked pasta','2 cups partially cooked pasta'],
 ['1 lb cooked chicken','2 lb not cooked chicken'],
 ['1 cup frozen rice','2 cups not cooked rice'],
 ['1 cup cooked rice','2 cups rice'],
 ['1 cup cooked rice','2 cups frozen rice']
]){
 for(const inputs of [pair,[...pair].reverse()])test('different preparation states stay separate: '+inputs.join(' + '),()=>{
  const ingredients=a.normalize(inputs);
  assert.equal(ingredients.length,2);
  assert.deepEqual(ingredients.map(i=>[i.preparation,i.base.v]),inputs.map(line=>{const p=a.parseInputIngredient(line);return [p.preparation,p.quantity]}));
  const restored=a.normalizeSavedRecipe({ingredients});
  const shared=a.normalizeSavedRecipe(JSON.parse(JSON.stringify(restored)),{untrusted:true});
  for(const result of [{ingredients,steps:a.buildInstructions(ingredients)},restored,shared]){
   assert.equal(result.ingredients.length,2);
   assert.deepEqual(result.ingredients.map(i=>i.preparation),ingredients.map(i=>i.preparation));
   const text=result.steps.map(s=>s.text).join('\n');
   if(pair[0].includes('chicken')){assert.match(text,/165\u00b0F/);assert.match(text,/Add the cooked Chicken Breast to the pan and heat to/);assert.match(text,/Add Chicken Breast to the pan\. Cook/);}
   else{
    if(ingredients.some(i=>i.preparation==='raw' || !i.preparation)) assert.match(text,pair[0].includes('pasta')?/Boil Pasta/:/Cook Rice/);
    if(ingredients.some(i=>i.preparation==='frozen')) assert.match(text,/frozen Rice separately/);
    if(ingredients.some(i=>i.preparation==='cooked')) assert.match(text,/Reheat the cooked/);
   }
  }
 });
}

test('same preparation still deduplicates and legume caution is unchanged',()=>{
 assert.equal(a.normalize(['rice','not cooked rice']).length,1);
 assert.equal(a.normalize(['cooked rice','cooked rice']).length,1);
 const beans=a.normalize(['cooked kidney beans','not cooked kidney beans']);
 assert.equal(beans.length,1);assert.equal(beans[0].preparation,'raw');
});

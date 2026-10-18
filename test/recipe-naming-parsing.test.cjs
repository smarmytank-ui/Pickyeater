const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const app=require('../app.js');
// Observed UI state, not recovered original recipe quantities. Preserve amounts;
// correct classification/packaging only, never pretend these are validated measures.
const observed=[
 ['chicken broth or stock','protein',1,'lb'],['heavy cream','other',1,'serving'],
 ['package orzo','other',1,'serving'],['chicken breast','protein',1,'lb'],
 ['spinach leaves','veg',2,'cups'],['artichoke hearts in water','other',1,'serving'],
 ['mozzarella cheese','dairy',0.5,'cups'],['divided','other',1,'serving'],
 ['parmesan cheese','dairy',0.5,'cups'],['garlic powder','seasoning',0.5,'tsp'],
 ['Italian herb seasoning','other',1,'serving']
].map(([name,role,v,u],i)=>({id:'fixture-'+i,name,role,base:{v,u}}));
function restored(ingredients=observed,title=''){
 return app.normalizeSavedRecipe({id:'feedback',title,ingredients,servings:2});
}
test('exact observed fixture excludes broth as protein, packaging and divided as food',()=>{
 const recipe=restored();
 assert.equal(recipe.ingredients.length,10);
 assert.equal(recipe.ingredients.find(i=>i.name==='chicken broth').role,'other');
 assert.deepEqual(recipe.ingredients.find(i=>i.name==='chicken broth').base,{v:1,u:'lb'});
 assert.equal(recipe.ingredients.find(i=>i.name==='orzo').role,'starch');
 assert.equal(recipe.ingredients.find(i=>i.name==='heavy cream').role,'dairy');
 assert.equal(recipe.ingredients.find(i=>i.name==='artichoke hearts').role,'veg');
 assert.equal(recipe.ingredients.find(i=>i.name==='italian herb seasoning').role,'seasoning');
 assert.equal(recipe.title,'Orzo with Chicken Breast & Artichoke Hearts');
 assert.doesNotMatch(recipe.title,/broth|stock|package|divided|baked|tuscan|healthy/i);
 const proteins=recipe.steps.filter(s=>s.key.startsWith('protein-'));
 assert.equal(proteins.length,1);
 assert.match(proteins[0].text,/Chicken Breast/);
 assert.match(recipe.steps.find(s=>s.key.startsWith('starch-')).text,/Boil Orzo according to the package directions/);
 assert.equal(recipe.steps.some(s=>/cook.+Chicken Broth.+165/i.test(s.text)),false);
});
test('titles are order stable and truthful after protein or vegetable removal',()=>{
 const recipe=restored();
 assert.equal(app.titleFrom([...recipe.ingredients].reverse()),recipe.title);
 const noChicken=recipe.ingredients.filter(i=>i.role!=='protein');
 assert.equal(app.titleFrom(noChicken),'Orzo with Artichoke Hearts');
 const noVeg=noChicken.filter(i=>i.role!=='veg');
 assert.equal(app.titleFrom(noVeg),'Orzo, Your Way');
 const removedProtein=recipe.ingredients.map(i=>i.role==='protein'?{...i,base:{v:0,u:'lb'}}:i);
 assert.doesNotMatch(app.titleFrom(removedProtein),/Chicken/);
 assert.doesNotMatch(app.titleFrom([{name:'taco seasoning',role:'seasoning',base:{v:1,u:'tsp'}}]),/Tacos/);
});
test('representative raw input preserves explicit amounts and package weights without guessing',()=>{
 assert.deepEqual(app.parseInputIngredient('2 cups chicken broth or stock'),{name:'chicken broth',quantity:2,unit:'cups',preparation:null});
 assert.deepEqual(app.parseInputIngredient('1 (16 ounce) package orzo'),{name:'orzo',quantity:16,unit:'oz',preparation:null});
 assert.deepEqual(app.parseInputIngredient('2 (250 g) packages orzo'),{name:'orzo',quantity:500,unit:'g',preparation:null});
 assert.deepEqual(app.parseInputIngredient('1 package orzo'),{name:'orzo',quantity:1,unit:'package',preparation:null});
 const missing=app.parseInputIngredient('heavy cream');
 assert.equal(missing.quantity,null);assert.equal(missing.unit,null);
 const grams=app.normalize(['250 g orzo']);
 assert.deepEqual(grams[0].base,{v:250,u:'g'});
 const saved=app.normalizeSavedRecipe({ingredients:grams,servings:2});
 assert.deepEqual(saved.ingredients[0].base,{v:250,u:'g'});
});
test('comma preparation fragments do not become foods; metadata-only input is rejected',()=>{
 const input=app.validateRecipeInput('2 cups spinach, divided\n1 lb chicken breast\n1 package orzo');
 assert.equal(input.ok,true);
 assert.equal(app.normalize(input.lines).length,3);
 assert.equal(app.canonName('divided'),'');
 assert.equal(app.validateRecipeInput('divided').ok,false);
});
test('saved custom/imported titles and measured quantities survive reopen and servings',()=>{
 const ingredients=app.normalize(['1 lb chicken breast','250 g orzo','2 cups spinach']);
 for(const title of ['Sunday with Evan','My original imported recipe']){
  const first=app.normalizeSavedRecipe({title,ingredients,servings:4,source:{name:'Example',url:'https://example.com/recipe'}});
  const second=app.normalizeSavedRecipe(JSON.parse(JSON.stringify(first)));
  assert.equal(second.title,title);assert.equal(second.servings,4);
  assert.deepEqual(second.ingredients.map(i=>i.base),ingredients.map(i=>i.base));
  assert.equal(app.recipeCommerceItems(second).find(i=>i.name==='orzo').quantity,500);
 }
});
test('unmeasured package nutrition is unavailable, not a partial total omitting pasta',()=>{
 const ingredients=app.normalize(['1 lb chicken breast','1 package orzo']);
 assert.equal(app.recipeMacros({ingredients},2),null);
 const saved=app.normalizeSavedRecipe({ingredients,servings:2});
 assert.equal(saved.nutrition,null);
 assert.equal(app.recipeNutritionText(saved),'Nutrition unavailable');
 assert.ok(app.recipeMacros({ingredients:app.normalize(['1 lb chicken breast','250 g orzo'])},2));
});
test('actual custom swap updates ingredient-grounded title while servings and grocery measures stay consistent',()=>{
 const context=vm.createContext({console,URL,setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8')+`
 render=()=>{};computeMacrosPerServing=()=>{};
 state={ingredients:normalize(['1 lb chicken breast','250 g orzo','2 cups spinach']),preferences:{texture:'any',servingStyle:'mixed'}};
 servings=4;
 applySwap(state.ingredients[0].id,{name:'tofu'},{keepRole:true,keepQty:true});
 globalThis.result={title:state.title,items:recipeCommerceItems({...state,servings})};
 `,context);
 assert.equal(context.result.title,'Orzo with Tofu & Spinach');
 assert.equal(context.result.items.find(i=>i.name==='orzo').quantity,500);
});

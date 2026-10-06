const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const {normalizeExactRecipe,getRecipeBook,setRecipeBook,betaDataSnapshot,restoreCloudSnapshot,recipeNutritionText,recipeBookMeta,EXACT_RECIPE_BOOK_KEY,recipeMacros,exportRecipeNutrition}=require('../app.js');
function storage(){const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};}
function withStorage(run){const prior=global.localStorage;global.localStorage=storage();try{run(global.localStorage);}finally{if(prior===undefined)delete global.localStorage;else global.localStorage=prior;}}
function fixture(extra={}){return normalizeExactRecipe({id:'synthetic-original',title:'Synthetic original',yieldText:'12 bowls',ingredients:Array.from({length:30},(_,i)=>i===0?'synthetic rice':`${i} g synthetic ingredient ${i}`),instructionsText:'Original paragraph.\n\n'.repeat(40),...extra});}
function oldApp(localStorage){
  const code=fs.readFileSync(require('node:path').join(__dirname,'../test/fixtures/recipe-app-v2.cjs'),'utf8');
  const context={localStorage,module:{exports:{}},console,URL,TextEncoder,TextDecoder,Buffer,crypto:require('node:crypto').webcrypto};vm.runInNewContext(code,context);
  return {api:context.module.exports,run:expression=>vm.runInNewContext(expression,context)};
}
test('exact nutrition is explicitly unavailable in normalization, storage, display and export',()=>withStorage(store=>{
  const original=fixture({nutrition:{calories:999,protein:50,carbs:60,fat:40}});
  assert.equal(original.nutrition,null);assert.equal(original.nutritionStatus,'unavailable');assert.equal(recipeMacros(original),null);
  assert.equal(setRecipeBook([original]),true);
  assert.equal(JSON.parse(store.getItem(EXACT_RECIPE_BOOK_KEY))[0].nutrition,null);
  assert.match(recipeBookMeta(original),/Nutrition unavailable/);assert.doesNotMatch(recipeBookMeta(original),/0 cal/);
  assert.equal(recipeNutritionText(original),'Nutrition unavailable');
  assert.equal(betaDataSnapshot().data[EXACT_RECIPE_BOOK_KEY][0].nutrition,null);
}));
test('old app save, export and backup restore cannot rewrite or remove originals',()=>withStorage(store=>{
  const original=fixture();const generated={id:'generated',title:'Synthetic generated',servings:4,ingredients:[{id:'g1',name:'rice',role:'carb',base:{v:1,u:'cups'}}],steps:[{key:'g-step',text:'Synthetic generated instruction.'}]};
  assert.equal(setRecipeBook([generated,original]),true);
  const protectedBytes=store.getItem(EXACT_RECIPE_BOOK_KEY);const legacy=oldApp(store);
  legacy.run("setRecipeBook(getRecipeBook())");
  const legacyExport=legacy.run("betaDataSnapshot()");
  assert.equal(legacyExport.data[EXACT_RECIPE_BOOK_KEY],undefined);
  legacy.run("restoreCloudSnapshot({data:{pickyRecipesV2:JSON.parse(localStorage.getItem('pickyRecipesV2'))}})");
  assert.equal(store.getItem(EXACT_RECIPE_BOOK_KEY),protectedBytes);
  assert.equal(JSON.parse(store.getItem('pickyRecipesV2')).length,1);
  const recovered=getRecipeBook().find(recipe=>recipe.exact);
  assert.equal(recovered.yieldText,'12 bowls');assert.equal(recovered.instructionsText,original.instructionsText);
  assert.deepEqual(recovered.ingredients.map(item=>item.originalText),original.ingredients.map(item=>item.originalText));
  assert.equal(getRecipeBook().find(recipe=>recipe.id==='generated').servings,4);
}));
test('mixed early-preview recipes migrate without original loss or generated changes',()=>withStorage(store=>{
  const original=fixture();const generated={id:'generated',title:'Synthetic',ingredients:[{name:'rice',base:{v:1,u:'cups'}}],steps:[{key:'one',text:'Original generated.'}]};
  store.setItem('pickyRecipesV2',JSON.stringify([generated,{...original,nutrition:{calories:0}}]));
  getRecipeBook();assert.deepEqual(JSON.parse(store.getItem('pickyRecipesV2')),[generated]);
  assert.equal(JSON.parse(store.getItem(EXACT_RECIPE_BOOK_KEY))[0].nutrition,null);
  assert.equal(getRecipeBook().find(recipe=>recipe.exact).instructionsText,original.instructionsText);
}));
test('new app restoring a legacy cloud snapshot keeps protected exact records',()=>withStorage(store=>{
  assert.equal(setRecipeBook([fixture()]),true);const original=store.getItem(EXACT_RECIPE_BOOK_KEY);
  restoreCloudSnapshot({data:{pickyRecipesV2:[]}});assert.equal(store.getItem(EXACT_RECIPE_BOOK_KEY),original);
  assert.equal(getRecipeBook().find(recipe=>recipe.exact).yieldText,'12 bowls');
}));
test('failed generated write rolls back exact-store edits and keeps previous records',()=>withStorage(store=>{
  assert.equal(setRecipeBook([fixture()]),true);const original=store.getItem(EXACT_RECIPE_BOOK_KEY);const write=store.setItem;
  store.setItem=(key,value)=>{if(key==='pickyRecipesV2')throw Error('synthetic quota failure');write(key,value);};
  assert.equal(setRecipeBook([fixture({yieldText:'18 bowls'})]),false);assert.equal(store.getItem(EXACT_RECIPE_BOOK_KEY),original);
}));
test('unreadable exact records fail closed without overwriting protected bytes',()=>withStorage(store=>{
  store.setItem(EXACT_RECIPE_BOOK_KEY,'{invalid');assert.throws(()=>setRecipeBook([]),/could not be read/);
  assert.equal(store.getItem(EXACT_RECIPE_BOOK_KEY),'{invalid');
}));

test('malformed restored originals are rejected before existing local data changes',()=>withStorage(store=>{
  assert.equal(setRecipeBook([fixture()]),true);const original=store.getItem(EXACT_RECIPE_BOOK_KEY);
  assert.throws(()=>restoreCloudSnapshot({data:{pickyRecipesV2:[],[EXACT_RECIPE_BOOK_KEY]:null}}),/Invalid exact recipe backup/);
  assert.equal(store.getItem(EXACT_RECIPE_BOOK_KEY),original);
}));

test('older cloud export nutrition placeholders become unavailable without changing originals',()=>{
  const original=fixture();const payload={snapshot:{data:{pickyRecipesV2:[{...original,nutrition:{calories:0,protein:0}}]}}};
  const exported=exportRecipeNutrition(payload);const recipe=exported.snapshot.data.pickyRecipesV2[0];
  assert.equal(recipe.nutrition,null);assert.equal(recipe.nutritionStatus,'unavailable');
  assert.equal(recipe.instructionsText,original.instructionsText);assert.equal(recipe.yieldText,original.yieldText);
  assert.equal(payload.snapshot.data.pickyRecipesV2[0].nutrition.calories,0);
});

test('storage-full migration preserves mixed originals and still permits lossless local export',()=>withStorage(store=>{
  const original=fixture();store.setItem('pickyRecipesV2',JSON.stringify([original]));const raw=store.getItem('pickyRecipesV2');
  const write=store.setItem;store.setItem=(key,value)=>{if(key===EXACT_RECIPE_BOOK_KEY)throw Error('synthetic quota');write(key,value);};
  assert.throws(()=>getRecipeBook(),/could not be protected/);assert.equal(store.getItem('pickyRecipesV2'),raw);
  const exported=betaDataSnapshot();assert.equal(exported.data[EXACT_RECIPE_BOOK_KEY][0].instructionsText,original.instructionsText);
  assert.deepEqual(exported.data[EXACT_RECIPE_BOOK_KEY][0].ingredients.map(item=>item.originalText),original.ingredients.map(item=>item.originalText));
  assert.equal(store.getItem('pickyRecipesV2'),raw);
}));

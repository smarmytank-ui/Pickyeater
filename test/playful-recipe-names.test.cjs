const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=require('../app.js');
const title=names=>app.titleFrom(app.normalize(names));

test('literal spaghetti is pasta in naming, classification and package cooking',()=>{
  const ingredients=app.normalize(['250 g spaghetti','1 lb ground beef','tomatoes']);
  assert.equal(ingredients[0].role,'starch');
  assert.equal(app.titleFrom(ingredients),"Mom's Spaghetti with Ground Beef");
  assert.match(app.buildInstructions(ingredients).find(s=>s.key==='starch-0').text,/Boil Spaghetti according to the package directions, then drain/);
  assert.equal(title(['pasta','chicken breast']),'Pasta Party with Chicken Breast');
});

test('casserole title requires actual casserole input and does not invent a baking method',()=>{
  assert.equal(title(['chicken casserole']),'Super Chicken Casserole');
  const ingredients=app.normalize(['chicken casserole']);
  assert.equal(ingredients[0].role,'other');
  assert.match(app.buildInstructions(ingredients).map(s=>s.text).join(' '),/package directions/);
  assert.doesNotMatch(title(['chicken','rice','cheese']),/casserole|baked/i);
});

test('real swap and removal refresh names without keeping absent ingredients',()=>{
  const context=vm.createContext({console,URL,setTimeout,clearTimeout});
  vm.runInContext(fs.readFileSync(require.resolve('../app.js'),'utf8')+`
    render=()=>{};computeMacrosPerServing=()=>{};
    state={ingredients:normalize(['250 g spaghetti','1 lb ground beef']),preferences:{}};
    applySwap(state.ingredients[1].id,{name:'tofu'},{keepRole:true,keepQty:true});
    globalThis.swapped=state.title;
    state.ingredients[1].base.v=0;
    globalThis.removed=titleFrom(state.ingredients);
  `,context);
  assert.equal(context.swapped,"Mom's Spaghetti with Tofu");
  assert.equal(context.removed,"Mom's Spaghetti");
});

test('saved fallback is playful while explicit manual and imported titles survive',()=>{
  const ingredients=app.normalize(['spaghetti']);
  assert.equal(app.normalizeSavedRecipe({ingredients}).title,"Mom's Spaghetti");
  for(const source of [undefined,{name:'Family recipe',url:'https://example.com/recipe'}]){
    const saved=app.normalizeSavedRecipe({ingredients,title:'Aunt Jo’s Sunday Noodles',source});
    assert.equal(app.normalizeSavedRecipe(JSON.parse(JSON.stringify(saved))).title,'Aunt Jo’s Sunday Noodles');
  }
});

test('fallbacks are stable, ingredient-grounded and make no health or method claims',()=>{
  for(const names of [[],['salt','olive oil'],['chicken broth'],['rice'],['broccoli'],['tofu'],['potatoes'],['cereal']]){
    const ingredients=app.normalize(names),name=app.titleFrom(ingredients);
    assert.equal(app.titleFrom([...ingredients].reverse()),name);
    assert.doesNotMatch(name,/simple|plate|healthy|cure|allergy|weight.loss|baked|roasted|fried/i);
    assert.ok(name.length>0 && name.length<=100);
  }
  assert.equal(title(['salt','olive oil']),'Your Kitchen Remix');
});

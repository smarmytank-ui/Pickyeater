const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeSavedRecipe,parseExactIngredient,combineGroceryRecipes,groceryItemText,encodeSharedRecipe,recipeCommerceItems}=require('../app.js');
function exact(ingredients,extra={}){return normalizeSavedRecipe({exact:true,title:'Synthetic title',yieldText:'12 portions',ingredients,instructionsText:'First step.\n\nSecond step.',...extra});}
test('exact recipe round trip keeps titles, yield, all lines, and instructions',()=>{
  const lines=Array.from({length:30},(_,index)=>`${index+1} g synthetic ingredient ${index}`);
  const recipe=exact(lines,{title:'  Original synthetic title  '});
  assert.equal(recipe.title,'  Original synthetic title  ');
  assert.equal(recipe.yieldText,'12 portions');
  assert.equal(recipe.instructionsText,'First step.\n\nSecond step.');
  assert.deepEqual(recipe.ingredients.map(item=>item.originalText),lines);
  assert.deepEqual(normalizeSavedRecipe(JSON.parse(JSON.stringify(recipe)),{untrusted:true}),recipe);
});
test('unknown and ambiguous quantities never get generator defaults',()=>{
  for(const line of ['rice','1–2 cups rice','salt to taste','a pinch of pepper','0 cups salt','1/0 cups rice']) assert.equal(parseExactIngredient(line).base.v,null);
  const recipe=exact(['rice']);assert.equal(recipe.ingredients[0].base.v,null);
  assert.equal(recipe.ingredients.length,1);
  assert.equal(parseExactIngredient('1 1/2 cups synthetic beans').base.v,1.5);
});
test('shopping combines compatible units and exposes incomplete amounts without yield scaling',()=>{
  const recipes=[exact(['1 cup synthetic beans','1 lb synthetic protein','synthetic beans']),exact(['16 tbsp synthetic beans','8 oz synthetic protein','1 kg synthetic grain','500 g synthetic grain'])];
  const list=new Map(combineGroceryRecipes(recipes));
  assert.equal(list.get('synthetic beans|cups').quantity,2);
  assert.equal(list.get('synthetic protein|oz').quantity,24);
  assert.equal(list.get('synthetic grain|g').quantity,1500);
  assert.match(groceryItemText(list.get('synthetic beans|')),/amount needs review/);
  const generated={servings:4,ingredients:[{name:'rice',base:{v:1,u:'cups'}}]};
  assert.equal(combineGroceryRecipes([generated])[0][1].quantity,2);
});
test('exact personal recipes do not create share links or individual commerce payloads',()=>{
  const recipe=exact(['1 cup synthetic beans']);
  assert.throws(()=>encodeSharedRecipe(recipe),/private/);
  assert.deepEqual(recipeCommerceItems(recipe),[]);
});
test('oversize exact imports reject rather than silently truncate',()=>{
  assert.equal(exact(Array(201).fill('rice')),null);
  assert.equal(exact(['rice'],{instructionsText:'a'.repeat(20001)}),null);
});

test('combined grocery display preserves small spice quantities instead of rounding cups',()=>{
  const groceries=combineGroceryRecipes([exact(['1/4 tsp synthetic spice','1 tsp synthetic seasoning','1/8 tsp synthetic seasoning'])]);
  const spice=groceries.find(([,item])=>item.name==='synthetic spice')[1];
  const seasoning=groceries.find(([,item])=>item.name==='synthetic seasoning')[1];
  assert.equal(groceryItemText(spice),'1/4 tsp synthetic spice');
  assert.equal(groceryItemText(seasoning),'1 1/8 tsp synthetic seasoning');
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const a=require('../app.js');
function format(ingredient,servingCount=2){
 const context={module:{exports:{}},console,TextEncoder,TextDecoder};vm.createContext(context);
 vm.runInContext(fs.readFileSync(require.resolve('../app.js'),'utf8')+'\n;globalThis.formatFixture=(ing,n)=>{servings=n;return qtyStr(ing)};',context);
 return context.formatFixture(ingredient,servingCount);
}
test('Breakfast eggs match existing count-based swap baseline and bread uses slices',()=>{
 const [eggs,bread]=a.normalize(['eggs','bread']);
 assert.deepEqual(eggs.base,{v:4,u:'eggs'});assert.deepEqual(bread.base,{v:4,u:'slices'});
 assert.equal(a.gramsFor(eggs.name,eggs.base.u,eggs.base.v),200);
 assert.equal(a.gramsFor(bread.name,bread.base.u,bread.base.v),100);
 assert.equal(format(eggs),'4');assert.equal(format(eggs,4),'8');assert.equal(format(bread),'4 slices');
});
test('explicit weights/counts and saved user quantities are not rewritten',()=>{
 assert.deepEqual(a.normalize(['1 lb eggs'])[0].base,{v:1,u:'lb'});
 assert.deepEqual(a.normalize(['6 eggs'])[0].base,{v:6,u:'eggs'});
 assert.deepEqual(a.normalize(['2 slices bread'])[0].base,{v:2,u:'slices'});
 const original={title:'My breakfast',servings:2,ingredients:[{name:'eggs',role:'protein',base:{v:3,u:'eggs'}},{name:'bread',role:'bread',base:{v:7,u:'count'}}]};
 assert.deepEqual(a.normalizeSavedRecipe(original).ingredients.map(i=>i.base),original.ingredients.map(i=>i.base));
});
test('grocery and commerce labels do not repeat the egg unit and scale with servings',()=>{
 const recipe={servings:4,ingredients:a.normalize(['eggs','bread'])};
 const items=a.recipeCommerceItems(recipe);
 assert.equal(items[0].displayText,'8 Eggs');assert.equal(items[0].quantity,8);assert.equal(items[0].unit,'eggs');
 assert.equal(items[1].displayText,'8 slices Bread');
 assert.equal(a.groceryItemText({name:'eggs',quantity:4,unit:'eggs'}),'4 eggs');
 assert.equal(a.groceryItemText({name:'bread',quantity:1,unit:'slices'}),'1 slice bread');
});
test('count display follows the food name and does not round away adjusted quantities',()=>{
 assert.equal(format({name:'tortillas',base:{v:4,u:'count'}}),'4');
 assert.equal(format({name:'bagels',base:{v:1.5,u:'count'}}),'1 1/2');
});

test('nonfraction decimal counts stay numeric rather than whole plus decimal remainder',()=>{
 for(const [value,label] of [[1.2,'1.2'],[2.1,'2.1'],[0.2,'0.2'],[1.99,'1.99'],[1.999,'2']]){
  assert.equal(format({name:'bagels',base:{v:value,u:'count'}}),label);
  assert.equal(a.groceryItemText({name:'bagels',quantity:value,unit:'count'}),`${label} bagels`);
 }
 const ingredients=a.normalize(['1.2 bagels']);
 assert.equal(format(ingredients[0],4),'2.4');
 assert.equal(a.recipeCommerceItems({servings:4,ingredients})[0].displayText,'2.4 Bagels');
 assert.equal(ingredients[0].base.v,1.2);
});
test('decimal formatting preserves familiar fractional quantities and original data',()=>{
 for(const [value,label] of [[0.25,'1/4'],[1.25,'1 1/4'],[1.5,'1 1/2'],[2.75,'2 3/4']]){
  const ingredient={name:'bagels',base:{v:value,u:'count'}};
  assert.equal(format(ingredient),label);assert.equal(ingredient.base.v,value);
 }
 assert.equal(a.groceryItemText({name:'rice',quantity:1.2,unit:'cups'}),'1.2 cups rice');
});

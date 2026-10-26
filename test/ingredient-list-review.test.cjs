const test=require('node:test'),assert=require('node:assert/strict');const app=require('../app.js');
const phrase='Chicken Potatoes Cheddar Cheese Broccoli Onions Garlic Powder Paprika';
test('reported space-only phrase produces an editable seven-food suggestion with compound names intact',()=>{
 assert.deepEqual(app.suggestIngredientList(phrase),['Chicken','Potatoes','Cheddar Cheese','Broccoli','Onions','Garlic Powder','Paprika']);
 const normalized=app.normalize(app.suggestIngredientList(phrase));assert.equal(normalized.length,7);
 assert.deepEqual(normalized.map(i=>i.name),['chicken breast','potatoes','cheddar cheese','broccoli','onion','garlic powder','paprika']);
});
test('explicit pasted delimiters and list markers separate foods without splitting compounds',()=>{
 assert.deepEqual(app.parseLines('• green beans; 2 cups rice\n- mac and cheese\n1. garlic powder'),['green beans','2 cups rice','mac and cheese','garlic powder']);
 assert.deepEqual(app.parseLines('chicken (cooked, shredded), rice; broccoli'),['chicken (cooked, shredded)','rice','broccoli']);
 assert.deepEqual(app.parseLines('green beans\r\npeanut butter'),['green beans','peanut butter']);
});
test('unknown prose, quantities and single compound foods are not blindly word-split',()=>{
 for(const raw of ['mac and cheese','green beans','peanut butter','chicken broth','2 cups rice 1 lb chicken','purple mystery dust chicken','I like chicken and rice']) assert.equal(app.suggestIngredientList(raw),null,raw);
 assert.deepEqual(app.parseLines('mac and cheese'),['mac and cheese']);
});
test('review suggestion does not mutate source or convert quantities',()=>{
 const raw='Chicken Potatoes Cheddar Cheese Broccoli Onions Garlic Powder Paprika';app.suggestIngredientList(raw);assert.equal(raw,phrase);
 assert.deepEqual(app.parseInputIngredient('2 cups green beans'),{name:'green beans',quantity:2,unit:'cups',preparation:null});
});

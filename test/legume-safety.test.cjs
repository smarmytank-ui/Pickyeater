const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const a=require('../app.js');
const text=x=>a.buildInstructions(x).map(s=>s.text).join('\n');
for(const input of ['dried kidney beans','dry red kidney beans','dried lentils','kidney beans','lentils','uncooked black beans','raw chickpeas','dry chickpeas','frozen kidney beans']){
 test('raw or unverified legume never uses brief warming: '+input,()=>{
  const output=text(a.normalize([input]));assert.match(output,/brief warming is not sufficient/);assert.doesNotMatch(output,/warm gently|2–3 minutes|safe internal temperature/);
  if(/kidney/.test(input)){assert.match(output,/at least 5 hours/);assert.match(output,/at least 30 minutes/);assert.match(output,/Do not use a slow cooker/);}
 });
}
for(const input of ['canned kidney beans','1 can kidney beans','2 (15 oz) cans kidney beans','tinned chickpeas'])test('explicit commercial canned path: '+input,()=>{
 const i=a.normalize([input]);assert.equal(i[0].preparation,'canned');assert.match(text(i),/commercially canned, ready-to-eat/);assert.doesNotMatch(text(i),/warm gently/);
});
test('fully cooked lentils retain safe leftovers reheat',()=>{assert.equal(a.parseInputIngredient('cooked lentils').preparation,'cooked');assert.match(text(a.normalize(['cooked lentils'])),/165°F/)});
for(const input of ['uncooked black beans','not cooked lentils','raw cooked kidney beans','dried canned kidney beans'])test('raw wording wins contradictions: '+input,()=>{
 assert.equal(a.parseInputIngredient(input).preparation,'raw');assert.match(text(a.normalize([input])),/brief warming is not sufficient/);
});
test('saved raw marker survives canonicalization, metadata contradiction and untrusted regeneration',()=>{
 for(const name of ['uncooked black beans','dried kidney beans']){
 const r=a.normalizeSavedRecipe({title:'Synthetic',ingredients:[{name,preparation:'cooked',role:'protein',base:{v:1,u:'cups'}}],steps:[{key:'old',text:'Warm 2 minutes'}]},{untrusted:true});
 assert.equal(r.ingredients[0].preparation,'raw');assert.match(r.steps.map(s=>s.text).join(' '),/brief warming is not sufficient/);
 const again=a.normalizeSavedRecipe(JSON.parse(JSON.stringify(r)),{untrusted:true});assert.equal(again.ingredients[0].preparation,'raw');
 }
});
test('role overrides cannot bypass legume guidance',()=>{
 for(const role of ['other','protein','starch','veg','fat'])assert.match(text([{name:'dried chickpeas',role,base:{v:1,u:'cups'}}]),/brief warming is not sufficient/);
});
test('trusted and exact original instructions stay intact with separate safety notice',()=>{
 const r=a.normalizeSavedRecipe({title:'Synthetic',ingredients:a.normalize(['kidney beans']),steps:[{key:'old',text:'Warm for 2 minutes'}]});assert.equal(r.steps[0].text,'Warm for 2 minutes');assert.match(a.recipeSafetyNotices(r.ingredients)[0].text,/not safety-verified/);
 const exact=a.normalizeSavedRecipe({exact:true,title:'Original',ingredients:['uncooked black beans'],instructionsText:'Original private instructions.'});assert.equal(exact.instructionsText,'Original private instructions.');assert.match(a.recipeSafetyNotices(exact.ingredients)[0].text,/brief warming is not sufficient/);
});
test('actual swap reparses raw state and rebuilds safety instructions',()=>{
 const src=fs.readFileSync(require.resolve('../app.js'),'utf8')+'\n;globalThis.fixture={applySwap,set(v){state=v},get(){return state}};';
 const c={module:{exports:{}},console,TextEncoder,TextDecoder};vm.createContext(c);vm.runInContext(src,c);
 const ingredients=a.normalize(['chicken breast']);c.fixture.set({ingredients,preferences:{},steps:[]});
 // Render is outside the engine contract; replace it only in this synthetic VM.
 vm.runInContext('render=function(){};computeMacrosPerServing=function(){};',c);c.fixture.applySwap(ingredients[0].id,{name:'uncooked black beans'},{keepRole:true,keepQty:true});
 assert.equal(c.fixture.get().ingredients[0].preparation,'raw');assert.match(c.fixture.get().steps.map(s=>s.text).join(' '),/brief warming is not sufficient/);
});
test('cache identity and existing meat safety unchanged',()=>{
 for(const f of ['index.html','service-worker.js'])assert.match(fs.readFileSync(new URL('../'+f,'file:///'+__filename.replaceAll('\\','/')),'utf8'),/app.js\?v=2.68.8-preparation-labels-20261108/);
 assert.match(text(a.normalize(['ground turkey'])),/165°F/);assert.match(text(a.normalize(['ground beef'])),/160°F/);
});

test('negative cooked/canned wording and duplicate raw evidence fail closed',()=>{
 for(const input of ['not fully cooked lentils','not canned kidney beans','undercooked kidney beans','partially cooked lentils']){assert.equal(a.parseInputIngredient(input).preparation,'raw');assert.match(text(a.normalize([input])),/brief warming is not sufficient/);}
 for(const inputs of [['cooked black beans','uncooked black beans'],['uncooked black beans','cooked black beans'],['cooked lentils','lentils']])assert.match(text(a.normalize(inputs)),/brief warming is not sufficient/);
});

test('green bean phrase cannot mask mixed dried pulses or share its canned status',()=>{
 for(const input of ['green beans and dried kidney beans','canned green beans and kidney beans','bean sprouts and dry lentils'])assert.match(text(a.normalize([input])),/brief warming is not sufficient/);
 assert.doesNotMatch(text(a.normalize(['green beans'])),/dried kidney|legume|brief warming/);
});

test('exact editor refreshes separate safety notice when typed ingredients change',()=>{
 const nodes=[];const make=tag=>{const n={tag,children:[],listeners:{},value:'',classList:{add(){}},setAttribute(k,v){this[k]=v},append(...xs){this.children.push(...xs)},appendChild(x){this.children.push(x)},replaceChildren(...xs){this.children=xs},addEventListener(k,f){this.listeners[k]=f},showModal(){},focus(){}};nodes.push(n);return n;};
 const context={module:{exports:{}},console,TextEncoder,TextDecoder};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../app.js'),'utf8')+'\n;globalThis.openFixture=openExactRecipeEditor;',context);
 context.document={createElement:make,body:make('body')};context.openFixture({});
 const field=nodes.find(n=>n.id==='exact-ingredients');field.value='dried kidney beans';field.listeners.input();
 const warnings=nodes.find(n=>n.role==='note');assert.match(warnings.children.map(n=>n.textContent).join(' '),/brief warming is not sufficient/);
 field.value='rice';field.listeners.input();assert.equal(warnings.children.length,0);
 for(const input of ['dried peas','black-eyed peas'])assert.match(text(a.normalize([input])),/brief warming is not sufficient/);
});

for(const input of ['canned chickpeas and raw chicken','chicken with chickpeas','canned beans + raw turkey','fully cooked lentils / chicken']){
 test('mixed poultry and legumes retain independent 165F thermometer guidance: '+input,()=>{
  const ingredients=a.normalize([input]);
  for(const output of [text(ingredients),a.recipeSafetyNotices(ingredients).map(s=>s.text).join(' ')]){
   assert.match(output,/165°F \(74°C\).*food thermometer/);
   assert.match(output,/Prepare each component separately/);
   assert.match(output,/does not establish that the animal protein is cooked/);
  }
 });
}
test('mixed ground beef and legumes retain 160F guidance regardless of role',()=>{
 for(const role of ['protein','veg','other'])assert.match(text([{name:'canned chickpeas and raw ground beef',role,base:{v:1,u:'lb'}}]),/160°F \(71°C\).*food thermometer/);
});
test('mixed-pulse delimiters do not spread canned preparation to unknown beans',()=>{
 for(const input of ['canned green beans with kidney beans','canned green beans, kidney beans','canned green beans / kidney beans','canned chickpeas + lentils']){
  assert.equal(a.parseInputIngredient(input).preparation,null);
  assert.match(text(a.normalize([input])),/brief warming is not sufficient/);
 }
});

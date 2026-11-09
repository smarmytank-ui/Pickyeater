import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {SURVIVAL_KIT_CONTENT as content} from '../functions/_shared/survival-kit-content.mjs';
const script=readFileSync(new URL('../digital-kit.js',import.meta.url),'utf8');
const previous=JSON.stringify({days:{'day-1':true},notes:{accepted:'Keep my note'},groceries:{'w1-Protein-0':true,'w1-Dairy / alternatives-0':true}});
async function page(data=content){
 const elements=new Map(), tabs=['plan','groceries','tools'].map(view=>({dataset:{view},listeners:{},addEventListener(k,fn){this.listeners[k]=fn},setAttribute(){}}));
 const control={dataset:{grocery:'w1-Dinner protein and eggs-0'},checked:false,listeners:{},addEventListener(k,fn){this.listeners[k]=fn},closest(){return {classList:{toggle(){}}}}};
 const el=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',classList:{toggle(){}},focus(){},addEventListener(){},querySelectorAll:s=>s==='[data-grocery]'?[control]:[]});return elements.get(id)};
 const storage={raw:previous,writes:0,getItem(){return this.raw},setItem(k,v){this.raw=v;this.writes++}};
 vm.runInNewContext(script,{document:{getElementById:el,querySelectorAll:s=>s==='[data-view]'?tabs:[]},localStorage:storage,fetch:async()=>({ok:true,status:200,json:async()=>({access:{plan:'survival_kit'},content:data})})});
 await new Promise(resolve=>setImmediate(resolve));tabs[1].listeners.click();
 return {html:el('kitView').innerHTML,storage,control};
}
test('actual grocery renderer shows both dinner bases and quantities with no inherited old checkmarks',async()=>{
 const p=await page();assert.match(p.html,/one four-serving batch/);assert.match(p.html,/6 cups total/);assert.match(p.html,/5 cups total/);assert.match(p.html,/Four dinner servings do not guarantee leftovers/);
 assert.doesNotMatch(p.html,/<input[^>]*\schecked/);assert.equal(p.storage.writes,0);assert.equal(p.storage.raw,previous);
});
test('checking corrected grocery item preserves previous notes/day and adds a distinct new key',async()=>{
 const p=await page();p.control.checked=true;p.control.listeners.change();const saved=JSON.parse(p.storage.raw);
 assert.equal(saved.notes.accepted,'Keep my note');assert.equal(saved.days['day-1'],true);assert.equal(saved.groceries['w1-Protein-0'],true);assert.equal(saved.groceries['w1-Dinner protein and eggs-0'],true);
});
test('grocery guidance is escaped and absence of optional notes remains compatible',async()=>{
 const hostile=await page({...content,groceryNotes:[{week:1,note:'<img src=x onerror=alert(1)>'}]});assert.match(hostile.html,/&lt;img/);assert.doesNotMatch(hostile.html,/<img/);
 const older=await page({...content,groceryNotes:undefined});assert.match(older.html,/Dinner cheese/);
});
test('safety instructions distinguish all three affected ground-meat recipes and generic guidance',()=>{
 for(const id of ['cheesy-taco-rice','mini-cheeseburger-sliders','separate-component-taco-night']){const r=content.recipes.find(r=>r.id===id);assert.match(r.steps.join(' '),/165°F/);assert.match(r.steps.join(' '),/160°F/);assert.match(r.steps.join(' '),/food thermometer/);}
 assert.match(content.safety.foodSafety,/including ground turkey and chicken/);
});
test('Kit cache references match the versioned modules without requiring Git history',()=>{
 const here=new URL('../',import.meta.url);
 const worker=readFileSync(new URL('service-worker.js',here),'utf8');
 const references=[
  ['digital-kit.html','digital-kit.js?v=2.68.8-kit-correction-20261104'],
  ['index.html','app.js?v=2.68.8-custom-swap-safety-20261109'],
  ['survival-kit.html','survival-kit.js?v=2.68.8-guest-20261106']
 ];
 for(const [file,reference] of references){
  const html=readFileSync(new URL(file,here),'utf8');
  assert.ok(html.includes(`src="./${reference}"`),`${file} loads the corrected module`);
  assert.ok(worker.includes(`'./${reference}'`),`${reference} is precached`);
 }
 const oldReferences=['digital-kit.js?v=2.68.8','app.js?v=2.68.8','survival-kit.js?v=2.68.8'];
 for(const reference of oldReferences) assert.ok(!worker.includes(`'./${reference}'`),`${reference} is not precached`);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../digital-kit.js',import.meta.url),'utf8');
async function kit({raw=null,readFailure=false,writeFailure=false,preferencePrompts=[]}={}){
  const elements=new Map();
  const notesTab={dataset:{view:'tools'},listeners:{},setAttribute(){},addEventListener(type,handler){this.listeners[type]=handler;}};
  const control={dataset:{day:'day-1'},checked:false,listeners:{},addEventListener(type,handler){this.listeners[type]=handler;},closest(){return {classList:{toggle(){}}};}};
  const element=id=>{
    if(!elements.has(id)) elements.set(id,{textContent:'',innerHTML:'',classList:{toggle(){}},addEventListener(){},querySelectorAll:selector=>selector==='[data-day]'?[control]:[],focus(){}});
    return elements.get(id);
  };
  const storage={raw,writes:0,writeFailure,getItem(){if(readFailure) throw Error('Storage denied');return this.raw;},setItem(key,value){if(this.writeFailure) throw Error('Quota exceeded');this.writes++;this.raw=value;}};
  const content={weeks:[{week:1,days:[{day:1,breakfast:'Toast',lunch:'Rice',dinner:'Chicken',snack:'Fruit'}]}],groceryLists:[],recipes:[],preferencePrompts,trackerPrompts:[],foodBridges:[]};
  vm.runInNewContext(script,{document:{getElementById:element,querySelectorAll:()=>[notesTab]},localStorage:storage,fetch:async()=>({status:200,ok:true,json:async()=>({access:{plan:'founding'},content})})});
  await new Promise(resolve=>setImmediate(resolve));
  return {storage,control,element,openNotes(){notesTab.listeners.click();},change(value){control.checked=value;control.listeners.change();}};
}

test('Kit notes fields have escaped accessible names matching their prompts',async()=>{
  const page=await kit({preferencePrompts:[{id:'accepted',label:'Foods "accepted" & enjoyed',placeholder:'Enter foods'},{id:'avoid',label:'Foods to avoid'}]});
  page.openNotes();
  assert.match(page.element('kitView').innerHTML,/<textarea data-note="accepted" aria-label="Foods &quot;accepted&quot; &amp; enjoyed"/);
  assert.match(page.element('kitView').innerHTML,/<textarea data-note="avoid" aria-label="Foods to avoid"/);
});

test('valid saved Kit progress renders and saves without discarding notes',async()=>{
  const page=await kit({raw:JSON.stringify({days:{'day-1':true},groceries:{},notes:{preference:'Keep sauce separate'}})});
  assert.match(page.element('kitView').innerHTML,/checked/);
  page.change(false);
  const saved=JSON.parse(page.storage.raw);
  assert.equal(saved.days['day-1'],false);
  assert.equal(saved.notes.preference,'Keep sauce separate');
  assert.equal(page.element('progressStatus').textContent,'Saved on this device.');
});

test('malformed or inaccessible Kit storage does not crash or overwrite existing bytes',async()=>{
  for(const options of [{raw:'{broken'},{raw:'[]'},{raw:'null'},{raw:'{"days":null}'},{raw:'{"notes":{"one":42}}'},{readFailure:true}]){
    const page=await kit(options);
    assert.match(page.element('kitView').innerHTML,/Your 14-day plan/);
    assert.match(page.element('progressStatus').textContent,/could not be read/);
    page.change(true);
    assert.equal(page.storage.writes,0);
    assert.equal(page.storage.raw,options.raw??null);
  }
});

test('failed Kit storage writes warn the customer, preserve stored data and can recover',async()=>{
  const raw=JSON.stringify({days:{},groceries:{},notes:{existing:'Keep this note'}});
  const page=await kit({raw,writeFailure:true});
  page.change(true);
  assert.equal(page.storage.raw,raw);
  assert.match(page.element('progressStatus').textContent,/could not be saved/);
  page.storage.writeFailure=false;
  page.change(true);
  assert.equal(JSON.parse(page.storage.raw).days['day-1'],true);
  assert.equal(JSON.parse(page.storage.raw).notes.existing,'Keep this note');
  assert.equal(page.element('progressStatus').textContent,'Saved on this device.');
});

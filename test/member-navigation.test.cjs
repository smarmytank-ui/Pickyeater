const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
function harness(store=new Map()){
 const nodes=new Map();let failWrite=false,failRead=false,failRemove=false,approved=true;
 function node(id){const classes=new Set();const handlers={};return {id,value:'',textContent:'',hidden:false,dataset:{},handlers,
 classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,force){if(force===undefined? !classes.has(x):force)classes.add(x);else classes.delete(x);}},
 setAttribute(){},focus(){this.focused=true;},scrollIntoView(){},addEventListener(type,fn){handlers[type]=fn;},dispatchEvent(event){handlers[event.type]?.(event);}};}
 for(const id of ['ingredientsInput','inputCard','resultCard','recipeBookCard','diaryCard','sharedRecipeCard','plannerCard','saveRow','savedNextStep','draftStatus','resumeRecipeBtn','memberHomeBtn','newRecipeBtn','memberOpenRecipeBook','recipeTitle','nutritionDisclosure'])nodes.set(id,node(id));
 const document={readyState:'loading',addEventListener(){},getElementById:id=>nodes.get(id)||null};
 const window={addEventListener(){},dispatchEvent(){},scrollTo(){},dataLayer:[]};
 const localStorage={getItem(k){if(failRead)throw Error('denied');return store.get(k)||null;},setItem(k,v){if(failWrite)throw Error('full');store.set(k,v);},removeItem(k){if(failRemove)throw Error('denied');store.delete(k);}};
 const context=vm.createContext({console,document,window,localStorage,URL,Event:class{constructor(type){this.type=type;}},CustomEvent:class{constructor(type){this.type=type;}},confirm:()=>approved,setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8')+`
 globalThis.api={
 setup({input='chicken\\nrice',title,manual=false,loaded=null,dirty=true}={}){
 $('ingredientsInput').value=input;
 state={ingredients:normalize(['1 lb chicken breast','1 cup rice']),steps:[],preferences:{texture:'any',servingStyle:'mixed'}};
 state.title=title || titleFrom(state.ingredients);state.manualTitle=manual?state.title:'';state.steps=buildInstructions(state.ingredients);
 servings=4;loadedRecipeId=loaded;draftRecipeDirty=dirty;draftVisibleView='recipe';owned=true;
 },
 input(text){$('ingredientsInput').value=text;},
 inspect(){return JSON.parse(JSON.stringify({state,servings,loadedRecipeId,draftRecipeDirty,input:$('ingredientsInput').value,view:draftVisibleView}));},
 home:showMemberHome,resume:resumeRecipeDraft,persist:persistRecipeDraft,restore:restoreRecipeDraft,start:startNewRecipe,
 replace:approveDraftReplacement,wire:wireMemberNavigation,open:openSavedRecipe,key:RECIPE_DRAFT_KEY,
 };`,context);
 return {api:context.api,nodes,store,fail(kind,value=true){if(kind==='write')failWrite=value;if(kind==='read')failRead=value;if(kind==='remove')failRemove=value;},approve(value){approved=value;}};
}
test('Home shows Step1 and Resume retains swapped recipe, servings and loaded ID without replacing newer entry',()=>{
 const h=harness();h.api.setup({loaded:'saved-7'});const before=h.api.inspect();
 h.api.input('new spinach entry');h.api.home();
 assert.equal(h.nodes.get('inputCard').classList.contains('hidden'),false);
 assert.equal(h.nodes.get('resultCard').classList.contains('hidden'),true);
 h.api.resume();const after=h.api.inspect();
 assert.equal(after.input,'new spinach entry');assert.equal(after.servings,4);assert.equal(after.loadedRecipeId,'saved-7');
 assert.deepEqual(after.state.ingredients,before.state.ingredients);
});
test('local reload restores both independent entry and recipe without touching protected stores',()=>{
 const store=new Map([['pickyRecipesV2','[]'],['pickyAuth','owner'],['pickyDiaryMeals','private diary']]);
 const h=harness(store);h.api.setup({loaded:'saved-7',title:'Sunday Dinner',manual:true});h.api.input('next meal ingredients');h.api.home();
 const other=harness(store);assert.equal(other.api.restore(),true);let restored=other.api.inspect();
 assert.equal(restored.input,'next meal ingredients');assert.equal(restored.state.title,'Sunday Dinner');assert.equal(restored.servings,4);assert.equal(restored.loadedRecipeId,'saved-7');
 other.api.resume();assert.equal(other.api.inspect().state.title,'Sunday Dinner');
 assert.equal(store.get('pickyRecipesV2'),'[]');assert.equal(store.get('pickyAuth'),'owner');assert.equal(store.get('pickyDiaryMeals'),'private diary');
});
test('Keep and Cancel preserve work; explicit Discard clears only working draft',()=>{
 const h=harness(new Map([['pickyRecipesV2','[]'],['pickyDiaryMeals','diary']]));h.api.setup();h.api.input('unsaved entry');
 assert.equal(h.api.start('cancel'),false);assert.equal(h.api.inspect().input,'unsaved entry');
 assert.equal(h.api.start('keep'),true);assert.equal(h.api.inspect().input,'unsaved entry');assert.ok(h.api.inspect().state);
 assert.equal(h.api.start('discard'),true);const after=h.api.inspect();assert.equal(after.state,null);assert.equal(after.input,'');assert.equal(after.servings,2);
 assert.equal(h.store.get('pickyRecipesV2'),'[]');assert.equal(h.store.get('pickyDiaryMeals'),'diary');
 const reload=harness(h.store);reload.api.restore();assert.equal(reload.api.inspect().state,null);
});
test('storage failure leaves current entry and recipe intact and reports useful recovery',()=>{
 const h=harness();h.api.setup();h.api.input('new entry');h.fail('write');
 assert.equal(h.api.start('keep'),false);assert.equal(h.api.inspect().input,'new entry');assert.ok(h.api.inspect().state);
 assert.match(h.nodes.get('draftStatus').textContent,/Keep this tab open/);
 h.fail('remove');assert.equal(h.api.start('discard'),false);assert.ok(h.api.inspect().state);
});
test('corrupt or oversized local draft is rejected without changing saved data',()=>{
 const h=harness(new Map([['foodMyWayWorkingDraftV1','x'.repeat(100001)],['pickyAuth','owner']]));
 assert.equal(h.api.restore(),false);assert.equal(h.api.inspect().state,null);assert.equal(h.store.get('pickyAuth'),'owner');assert.match(h.nodes.get('draftStatus').textContent,/could not be read/);
});
test('opening a different saved recipe requires consent to replace unsaved recipe',()=>{
 const h=harness();h.api.setup();h.approve(false);const before=h.api.inspect();
 const saved={id:'other',title:'My saved dish',servings:2,ingredients:[{name:'tofu',role:'protein',base:{v:1,u:'lb'}}]};
 h.api.open(saved);assert.equal(h.api.inspect().state.title,before.state.title);
 h.approve(true);h.api.open(saved);assert.equal(h.api.inspect().loadedRecipeId,'other');assert.equal(h.api.inspect().state.title,'My saved dish');
 assert.equal(h.api.inspect().input,before.input);
});
test('member controls wire once and Home has keyboard-usable focus',()=>{
 const h=harness();h.api.setup();h.api.wire();h.nodes.get('memberHomeBtn').handlers.click();
 assert.equal(h.api.inspect().view,'input');assert.equal(h.nodes.get('ingredientsInput').focused,true);
 h.nodes.get('resumeRecipeBtn').handlers.click();assert.equal(h.api.inspect().view,'recipe');
 assert.ok(h.nodes.get('memberOpenRecipeBook').handlers.click);
});

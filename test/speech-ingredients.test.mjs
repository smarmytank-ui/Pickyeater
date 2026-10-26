import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {parseLines,suggestIngredientList}=createRequire(import.meta.url)('../app.js');
const source=fs.readFileSync(new URL('../speech-ingredients.js',import.meta.url),'utf8');
function setup({enabled=true,supported=true,throws=false,confirm=true}={}){
  const elements=new Map();
  const ids=['speechIngredients','speechStart','speechStop','speechCancel','speechStatus','speechReview','speechTranscript','speechUse','speechReplace','speechReviewHelp','ingredientsInput'];
  for(const id of ids){
    const classes=new Set(['speechIngredients','speechStop','speechCancel','speechReview'].includes(id)?['hidden']:[]);
    const handlers={};
    elements.set(id,{value:id==='ingredientsInput'?'Original ingredients':'',textContent:'',disabled:false,events:[],
      classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,force)=>force?classes.add(c):classes.delete(c)},
      addEventListener:(name,fn)=>handlers[name]=fn,click(){if(!this.disabled)handlers.click?.();},
      dispatchEvent(event){this.events.push(event.type);},focus(){this.focused=true;}});
  }
  const recognizers=[];const windowEvents={},documentEvents={};
  class Recognition{
    constructor(){recognizers.push(this);}
    start(){this.started=true;if(throws) throw new Error('unavailable');}
    stop(){this.stopped=true;}
    abort(){this.aborted=true;}
  }
  const window={confirm:()=>confirm,FMW_CONFIG:enabled?{speechInputEnabled:true}:{},addEventListener:(n,f)=>windowEvents[n]=f};
  if(supported) window.SpeechRecognition=Recognition;
  const document={getElementById:id=>elements.get(id),documentElement:{lang:'en'},hidden:false,addEventListener:(n,f)=>documentEvents[n]=f};
  vm.runInNewContext(source,{window,document,parseLines,suggestIngredientList,Event:class{constructor(type){this.type=type;}}});
  return {get:id=>elements.get(id),recognizers,windowEvents,documentEvents,document};
}
const hidden=element=>element.classList.contains('hidden');
const results=(r,...lines)=>r.onresult({results:lines.map(text=>[{transcript:text}])});
test('feature is absent by default and never constructs a recognizer on load',()=>{
  const off=setup({enabled:false});assert.equal(hidden(off.get('speechIngredients')),true);assert.equal(off.recognizers.length,0);
  const on=setup();assert.equal(hidden(on.get('speechIngredients')),false);assert.equal(on.recognizers.length,0);
});
test('unsupported browser provides a keyboard fallback without constructing recognition',()=>{
  const s=setup({supported:false});assert.equal(s.get('speechStart').disabled,true);assert.match(s.get('speechStatus').textContent,/Type or paste/);assert.equal(s.get('ingredientsInput').value,'Original ingredients');
});
test('explicit start, stop, transcript correction and acceptance never generate a recipe',()=>{
  const s=setup();s.get('speechStart').click();const r=s.recognizers[0];assert.equal(r.started,true);r.onstart();
  assert.match(s.get('speechStatus').textContent,/Recording/);assert.equal(hidden(s.get('speechStop')),false);
  results(r,'chicken broth','orzo');assert.equal(s.get('ingredientsInput').value,'Original ingredients');assert.equal(hidden(s.get('speechReview')),true);
  s.get('speechStop').click();assert.equal(r.stopped,true);r.onend();
  assert.equal(s.get('speechTranscript').value,'chicken broth\norzo');assert.equal(hidden(s.get('speechReview')),false);
  s.get('speechTranscript').value='1 cup chicken broth\n1 cup orzo';s.get('speechUse').click();
  assert.equal(s.get('ingredientsInput').value,'Original ingredients\n1 cup chicken broth\n1 cup orzo');assert.deepEqual(s.get('ingredientsInput').events,['input']);assert.equal(hidden(s.get('speechReview')),true);
});
test('cancel aborts and ignores delayed callbacks, preserving existing ingredients',()=>{
  const s=setup();s.get('speechStart').click();const r=s.recognizers[0];results(r,'onions');s.get('speechCancel').click();
  assert.equal(r.aborted,true);results(r,'late result');r.onend();r.onerror({error:'network'});
  assert.equal(s.get('ingredientsInput').value,'Original ingredients');assert.equal(hidden(s.get('speechReview')),true);assert.match(s.get('speechStatus').textContent,/canceled/);
});
test('permission denial, silence, and startup failure explain recovery and preserve input',()=>{
  for(const [error,word] of [['not-allowed',/denied/],['no-speech',/No speech/]]){
    const s=setup();s.get('speechStart').click();s.recognizers[0].onerror({error});assert.match(s.get('speechStatus').textContent,word);assert.equal(s.get('speechStart').disabled,false);assert.equal(s.get('ingredientsInput').value,'Original ingredients');
  }
  const failed=setup({throws:true});failed.get('speechStart').click();assert.match(failed.get('speechStatus').textContent,/could not start/);
  const silent=setup();silent.get('speechStart').click();silent.recognizers[0].onend();assert.match(silent.get('speechStatus').textContent,/without a transcript/);assert.equal(hidden(silent.get('speechReview')),true);
});
test('page exit and tab hiding abort recognition and disregard late results',()=>{
  for(const cause of ['pagehide','visibilitychange']){
    const s=setup();s.get('speechStart').click();const r=s.recognizers[0];
    if(cause==='pagehide') s.windowEvents.pagehide();else{s.document.hidden=true;s.documentEvents.visibilitychange();}
    assert.equal(r.aborted,true);results(r,'late');r.onend();assert.equal(hidden(s.get('speechReview')),true);assert.equal(s.get('ingredientsInput').value,'Original ingredients');
  }
});
test('empty reviewed transcript cannot overwrite ingredients and recognition can restart',()=>{
  const s=setup();s.get('speechStart').click();const first=s.recognizers[0];results(first,'potatoes');first.onend();s.get('speechTranscript').value=' ';s.get('speechUse').click();assert.equal(s.get('ingredientsInput').value,'Original ingredients');
  s.get('speechStart').click();const second=s.recognizers[1];results(first,'stale');results(second,'carrots');second.onend();assert.equal(s.get('speechTranscript').value,'carrots');
});
test('replace is explicit and canceled replacement retains both entry and editable transcript',()=>{
 for(const confirm of [false,true]){
 const s=setup({confirm});s.get('speechStart').click();const r=s.recognizers[0];results(r,'spinach');r.onend();s.get('speechReplace').click();
 assert.equal(s.get('ingredientsInput').value,confirm?'spinach':'Original ingredients');
 assert.equal(hidden(s.get('speechReview')),confirm);
 }
});
test('append refuses overflow instead of truncating or losing existing ingredients',()=>{
 const s=setup();s.get('ingredientsInput').value='a'.repeat(1198);s.get('speechStart').click();const r=s.recognizers[0];results(r,'rice');r.onend();s.get('speechUse').click();
 assert.equal(s.get('ingredientsInput').value,'a'.repeat(1198));assert.equal(s.get('speechTranscript').value,'rice');assert.match(s.get('speechStatus').textContent,/nothing has been changed/);
});
test('starting again requires consent before discarding an unaccepted transcript',()=>{
 const s=setup({confirm:false});s.get('speechStart').click();const r=s.recognizers[0];results(r,'spinach');r.onend();s.get('speechStart').click();assert.equal(s.recognizers.length,1);assert.equal(s.get('speechTranscript').value,'spinach');
});

test('long recognized transcript is retained in full for editing and cannot truncate or overwrite entry',()=>{
 const s=setup();s.get('speechStart').click();const r=s.recognizers[0];const long='rice '.repeat(260).trim();results(r,long);r.onend();
 assert.equal(s.get('speechTranscript').value,long);assert.match(s.get('speechStatus').textContent,/preserved in full/);
 s.get('speechUse').click();assert.equal(s.get('ingredientsInput').value,'Original ingredients');assert.equal(s.get('speechTranscript').value,long);
 s.get('speechReplace').click();assert.equal(s.get('ingredientsInput').value,'Original ingredients');assert.equal(s.get('speechTranscript').value,long);
});

test('switching tabs after recording preserves completed editable review without restarting microphone',()=>{
 const s=setup();s.get('speechStart').click();const r=s.recognizers[0];results(r,'spinach');r.onend();s.get('speechTranscript').value='corrected spinach';s.document.hidden=true;s.documentEvents.visibilitychange();
 assert.equal(s.get('speechTranscript').value,'corrected spinach');assert.equal(hidden(s.get('speechReview')),false);assert.equal(s.recognizers.length,1);
});

test('reported voice phrase is suggested as seven reviewed lines; Add appends and closes',()=>{
 const s=setup();s.get('speechStart').click();const r=s.recognizers[0];results(r,'Chicken Potatoes Cheddar Cheese Broccoli Onions Garlic Powder Paprika');r.onend();
 assert.equal(s.get('speechTranscript').value.split('\n').length,7);assert.equal(s.get('ingredientsInput').value,'Original ingredients');
 s.get('speechUse').click();assert.equal(s.get('ingredientsInput').value,'Original ingredients\nChicken\nPotatoes\nCheddar Cheese\nBroccoli\nOnions\nGarlic Powder\nPaprika');assert.equal(hidden(s.get('speechReview')),true);
});
test('reviewed commas and semicolons transfer as visible ingredient lines, not one giant food',()=>{
 const s=setup();s.get('speechStart').click();const r=s.recognizers[0];results(r,'rice, green beans; garlic powder');r.onend();s.get('speechUse').click();assert.equal(s.get('ingredientsInput').value,'Original ingredients\nrice\ngreen beans\ngarlic powder');
});

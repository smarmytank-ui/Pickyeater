(()=>{
  'use strict';
  if(window.FMW_CONFIG?.speechInputEnabled!==true) return;
  const get=id=>document.getElementById(id);
  const panel=get('speechIngredients'), start=get('speechStart'), stop=get('speechStop'), cancel=get('speechCancel');
  const status=get('speechStatus'), review=get('speechReview'), transcript=get('speechTranscript'), use=get('speechUse'), ingredients=get('ingredientsInput');
  if(!panel || !start || !stop || !cancel || !status || !review || !transcript || !use || !ingredients) return;
  panel.classList.remove('hidden');start.classList.remove('hidden');
  const replace=get('speechReplace');
  use.textContent='Add ingredients';
  if(get('speechReviewHelp')) get('speechReviewHelp').textContent='Review names and amounts, one ingredient per line. Add ingredients keeps your typed entry and closes this review. Use commas or new lines when a spoken list is unclear.';
  const Recognition=window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer=null, generation=0, text='', recording=false;
  const show=(element,visible)=>element.classList.toggle('hidden',!visible);
  const controls=()=>{start.disabled=recording;show(stop,recording);show(cancel,recording || !review.classList.contains('hidden'));};
  const discard=message=>{
    generation+=1;
    const previous=recognizer; recognizer=null; recording=false; text='';transcript.value='';show(review,false);
    try{previous?.abort();}catch{}
    status.textContent=message;controls();
  };
  if(!Recognition){
    start.disabled=true;status.textContent='Speech recognition is not available in this browser. Type or paste ingredients above.';return;
  }
  start.addEventListener('click',()=>{
    if(recording) return;
    // Only this explicit user action constructs or starts the browser recognizer.
    if(!review.classList.contains('hidden') && transcript.value.trim() && !window.confirm('Discard this unaccepted transcript and start recording again?')) return;
    const run=++generation;
    text='';transcript.value='';show(review,false);
    try{
      const current=new Recognition();recognizer=current;
      current.lang=document.documentElement.lang || 'en-US';current.continuous=true;current.interimResults=true;
      recording=true;controls();status.textContent='Starting microphone… Your browser may ask permission. Use Stop or Cancel at any time.';
      current.onstart=()=>{if(run===generation) status.textContent='Recording — say your ingredients. Choose Stop when finished.';};
      current.onresult=event=>{
        if(run!==generation || !recording) return;
        const lines=[];
        for(let i=0;i<event.results.length;i+=1){
          const value=String(event.results[i]?.[0]?.transcript || '').trim();
          if(value) lines.push(value);
        }
        text=lines.join('\n');
        status.textContent='Recording — transcript is being captured. Choose Stop to review and edit it.';
      };
      current.onerror=event=>{
        if(run!==generation) return;
        const messages={
          'not-allowed':'Microphone or speech permission was denied. You can type or paste ingredients instead.',
          'service-not-allowed':'The browser speech service is unavailable or not allowed. Type or paste ingredients instead.',
          'audio-capture':'No usable microphone was found. Check your microphone, or type or paste ingredients.',
          'no-speech':'No speech was detected. Try again, or type or paste ingredients.',
          network:'The browser speech service could not connect. Type or paste ingredients instead.'
        };
        discard(messages[event.error] || 'Speech recognition stopped with an error. Try again, or type or paste ingredients.');
      };
      current.onend=()=>{
        if(run!==generation) return;
        generation+=1;recognizer=null;recording=false;
        if(text.trim()){
          const suggested=typeof suggestIngredientList==='function' ? suggestIngredientList(text) : null;
          transcript.value=suggested ? suggested.join('\n') : text;show(review,true);
          status.textContent=text.length>1200?'Recording stopped. Transcript exceeds 1,200 characters and is preserved in full below. Shorten and correct it before use.':(suggested ? 'Possible ingredient list separated for your review. Check each line, then choose Add ingredients.' : 'Recording stopped. Review names and quantities; use commas or new lines between foods, then choose Add ingredients.');
          transcript.focus();
        }else status.textContent='Recording stopped without a transcript. Try again, or type or paste ingredients.';
        controls();
      };
      current.start();
    }catch{discard('Speech recognition could not start. Try again, or type or paste ingredients.');}
  });
  stop.addEventListener('click',()=>{
    if(!recording || !recognizer) return;
    status.textContent='Stopping microphone… Waiting for the transcript to finish.';
    try{recognizer.stop();}catch{discard('Recording stopped. Type or paste ingredients instead.');}
  });
  cancel.addEventListener('click',()=>discard('Voice input canceled. Your ingredients were not changed.'));
  const accept=mode=>{
    if(recording || review.classList.contains('hidden')) return;
    const rawReviewed=transcript.value.trim();
    const reviewed=typeof parseLines==='function' ? parseLines(rawReviewed).join('\n') : rawReviewed;
    if(!reviewed){status.textContent='Add or correct the transcript before using it.';transcript.focus();return;}
    const existing=ingredients.value.trim();
    if(mode==='replace' && existing && !window.confirm('Replace all current ingredients with this reviewed transcript? Cancel keeps both unchanged.')) return;
    const next=mode==='replace' || !existing ? reviewed : existing+'\n'+reviewed;
    const limit=Number(ingredients.maxLength)>0 ? Number(ingredients.maxLength) : 1200;
    if(next.length>limit){status.textContent=`These ingredients exceed the ${limit}-character limit. Shorten the transcript or existing entry; nothing has been changed.`;transcript.focus();return;}
    ingredients.value=next;ingredients.dispatchEvent(new Event('input',{bubbles:true}));
    discard(mode==='replace'?'Ingredients replaced after your confirmation. Check them above, then choose Make my recipe.':'Reviewed ingredients appended. Existing ingredients were kept. Check the entry above, then choose Make my recipe.');ingredients.focus();ingredients.setSelectionRange?.(0,0);ingredients.scrollTop=0;
  };
  use.addEventListener('click',()=>accept('append'));
  replace?.addEventListener('click',()=>accept('replace'));
  window.addEventListener('pagehide',()=>discard('Voice input canceled because this page was left.'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden && recording) discard('Voice input canceled because this page was hidden. Your ingredients were not changed.');});
})();
(()=>{
  'use strict';
  if(window.FMW_CONFIG?.speechInputEnabled!==true) return;
  const get=id=>document.getElementById(id);
  const panel=get('speechIngredients'), start=get('speechStart'), stop=get('speechStop'), cancel=get('speechCancel');
  const status=get('speechStatus'), review=get('speechReview'), transcript=get('speechTranscript'), use=get('speechUse'), ingredients=get('ingredientsInput');
  if(!panel || !start || !stop || !cancel || !status || !review || !transcript || !use || !ingredients) return;
  panel.classList.remove('hidden');
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
          transcript.value=text.slice(0,1200);show(review,true);
          status.textContent=text.length>1200?'Recording stopped. Transcript limited to 1,200 characters; review and correct it before use.':'Recording stopped. Review and correct your transcript before using it.';
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
  use.addEventListener('click',()=>{
    if(recording || review.classList.contains('hidden')) return;
    const reviewed=transcript.value.trim();
    if(!reviewed){status.textContent='Add or correct the transcript before using it.';transcript.focus();return;}
    ingredients.value=reviewed.slice(0,1200);ingredients.dispatchEvent(new Event('input',{bubbles:true}));
    discard('Reviewed transcript added. Check the ingredients above, then choose Make my recipe when ready.');ingredients.focus();
  });
  window.addEventListener('pagehide',()=>discard('Voice input canceled because this page was left.'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden) discard('Voice input canceled because this page was hidden. Your ingredients were not changed.');});
})();
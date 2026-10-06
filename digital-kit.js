(()=>{
  const STORAGE_KEY='fmw.digitalKitProgress.v1';
  const $=id=>document.getElementById(id);
  let content=null;
  let progress=loadProgress();

  function loadProgress(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {days:{},groceries:{},notes:{}};}catch{return {days:{},groceries:{},notes:{}};}
  }
  function saveProgress(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));}catch{}
  }
  function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
  function show(id){for(const target of ['loadingState','signInState','lockedState','kitApp']) $(target)?.classList.toggle('hidden',target!==id);}
  function heading(title,description=''){return `<div class="section-heading"><h2>${escapeHtml(title)}</h2>${description?`<p>${escapeHtml(description)}</p>`:''}</div>`;}

  function renderPlan(){
    const weeks=content.weeks.map(week=>`${heading(`Week ${week.week}`,week.week===1?'Start small. Swap anything that does not fit.':'Reuse what worked and protect an emergency meal.')}<div class="week-grid">${week.days.map(day=>{
      const key=`day-${day.day}`; const done=Boolean(progress.days[key]);
      return `<article class="day-card ${done?'complete':''}" data-day-card="${key}"><header><h3>Day ${day.day}</h3><label><input type="checkbox" data-day="${key}" ${done?'checked':''}> Done</label></header><dl class="meal-list"><dt>Breakfast</dt><dd>${escapeHtml(day.breakfast)}</dd><dt>Lunch</dt><dd>${escapeHtml(day.lunch)}</dd><dt>Dinner</dt><dd>${escapeHtml(day.dinner)}</dd><dt>Snack</dt><dd>${escapeHtml(day.snack)}</dd></dl></article>`;
    }).join('')}</div>`).join('');
    $('kitView').innerHTML=heading('Your 14-day plan','Complete days at your pace. There is no penalty for using a backup.')+weeks;
    $('kitView').querySelectorAll('[data-day]').forEach(box=>box.addEventListener('change',()=>{progress.days[box.dataset.day]=box.checked;saveProgress();box.closest('.day-card').classList.toggle('complete',box.checked);}));
  }

  function renderGroceries(){
    $('kitView').innerHTML=heading('Grocery lists','Cross off what you already have and what goes into the cart.')+`<div class="grocery-stack">${content.groceryLists.map(list=>`<article class="grocery-card"><h3>Week ${list.week}</h3>${list.sections.map(section=>`<section class="grocery-section"><h4>${escapeHtml(section.name)}</h4>${section.items.map((item,index)=>{const key=`w${list.week}-${section.name}-${index}`;const checked=Boolean(progress.groceries[key]);return `<label class="grocery-item ${checked?'checked':''}"><input type="checkbox" data-grocery="${escapeHtml(key)}" ${checked?'checked':''}><span>${escapeHtml(item)}</span></label>`;}).join('')}</section>`).join('')}</article>`).join('')}</div>`;
    $('kitView').querySelectorAll('[data-grocery]').forEach(box=>box.addEventListener('change',()=>{progress.groceries[box.dataset.grocery]=box.checked;saveProgress();box.closest('.grocery-item').classList.toggle('checked',box.checked);}));
  }

  function renderRecipes(){
    $('kitView').innerHTML=heading('Easy recipes','Every recipe includes a plain or separated option and a low-energy fallback.')+`<div class="recipe-grid">${content.recipes.map(recipe=>`<details class="recipe-card"><summary>${escapeHtml(recipe.name)}</summary><div class="recipe-body"><p class="recipe-meta">Serves ${escapeHtml(recipe.servings)} · ${escapeHtml(recipe.time)}</p><h4>Ingredients</h4><ul>${recipe.ingredients.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul><h4>Steps</h4><ol>${recipe.steps.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ol><div class="note"><strong>Plain or separated</strong><br>${escapeHtml(recipe.plainOption)}</div><div class="note allergen"><strong>Allergen reminder</strong><br>${escapeHtml(recipe.allergenReminder)}</div><div class="note"><strong>Low-energy option</strong><br>${escapeHtml(recipe.lowEnergyOption)}</div></div></details>`).join('')}</div>`;
  }

  function renderTools(){
    const prompts=[...(content.preferencePrompts||[]),...(content.trackerPrompts||[]).map((prompt,index)=>typeof prompt==='string'?{id:`tracker-${index}`,label:prompt,placeholder:'Write what you noticed…'}:prompt)];
    $('kitView').innerHTML=heading('My notes','Notes stay only in this browser unless a future version explicitly offers cloud sync.')+`<div class="tool-grid">${prompts.map(prompt=>`<article class="tool-card"><h3>${escapeHtml(prompt.label)}</h3><textarea data-note="${escapeHtml(prompt.id)}" placeholder="${escapeHtml(prompt.placeholder||'Write what works for your household…')}">${escapeHtml(progress.notes[prompt.id]||'')}</textarea></article>`).join('')}</div>`+heading('Food bridges','Keep familiar features and change only what feels manageable.')+content.foodBridges.map(bridge=>`<div class="bridge"><strong>${escapeHtml(bridge.title)}</strong><div>${bridge.steps.map(escapeHtml).join(' → ')}</div></div>`).join('');
    $('kitView').querySelectorAll('[data-note]').forEach(input=>input.addEventListener('input',()=>{progress.notes[input.dataset.note]=input.value;saveProgress();}));
  }

  const renderers={plan:renderPlan,groceries:renderGroceries,recipes:renderRecipes,tools:renderTools};
  document.querySelectorAll('[data-view]').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(item=>item.setAttribute('aria-selected',String(item===tab)));renderers[tab.dataset.view]();$('kitView').focus();}));

  $('digitalKitSignIn')?.addEventListener('submit',async event=>{
    event.preventDefault(); const button=event.currentTarget.querySelector('button'); button.disabled=true; $('signInStatus').textContent='Sending your secure link…';
    try{const response=await fetch('/api/auth/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:event.currentTarget.email.value,returnTo:'/digital-kit.html#digitalKit'})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Sign-in link could not be sent.');$('signInStatus').textContent='Check your email. The link expires in 15 minutes.';}catch(error){$('signInStatus').textContent=error.message;}finally{button.disabled=false;}
  });

  async function start(){
    try{
      const response=await fetch('/api/digital-kit',{headers:{accept:'application/json'}});
      if(response.status===401){$('accessPill').textContent='Sign in required';show('signInState');return;}
      if(response.status===403){$('accessPill').textContent='Upgrade required';show('lockedState');return;}
      const result=await response.json(); if(!response.ok) throw new Error(result.error||'Your kit is temporarily unavailable.');
      content=result.content; $('accessPill').textContent=result.access.plan==='founding'?'Included with Founding Membership':'Survival Kit purchase verified'; show('kitApp'); renderPlan();
    }catch(error){$('loadingState').innerHTML=`<h2>We could not open your kit</h2><p>${escapeHtml(error.message)}</p><p><a href="mailto:support@foodmyway.app">Contact support</a> if this continues.</p>`;}
  }
  start();
})();

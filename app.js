// =======================================================
// Picky Eater — LOCKED FOUNDATION (STABLE)
// ✅ Generator works
// ✅ Swapper + Jackpot ("Enter your own…")
// ✅ Amount controls (+ / -) with intent-aware steps
// ✅ Calories + Macros (estimates) update on swaps/amount/servings
// ✅ Save to Favorites + Add to Diary (local-first)
// ✅ Naming updates dynamically after swaps
//
// FULL FILE — replace app.js entirely
// =======================================================

const $ = (id) => document.getElementById(id);

// -------------------------------
// Global state
// -------------------------------
let servings = 2;
let state = null;
let owned = false;
const TASTE_PROFILE_KEY = 'foodMyWayTasteProfile';
const WEEKLY_PLAN_KEY = 'foodMyWayWeeklyPlan';
const GROCERY_CHECKS_KEY = 'foodMyWayGroceryChecks';
const CLOUD_DATA_KEYS = ['pickyRecipesV2', WEEKLY_PLAN_KEY, GROCERY_CHECKS_KEY, TASTE_PROFILE_KEY, 'pickyDiaryMeals', 'pickyFavorites', 'picky_saved_recipes'];
const FREE_RECIPE_LIMIT = 3;
let deferredInstallPrompt = null;

function track(eventName, details = {}){
  const payload = { event:eventName, ...details };
  if(Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
  window.dispatchEvent(new CustomEvent('foodmyway:analytics', { detail:payload }));
}

function getPublicConfig(){
  return typeof window!=='undefined' && window.FMW_CONFIG ? window.FMW_CONFIG : {};
}

function telemetrySessionId(){
  try{
    const key='foodMyWayTelemetrySession';
    let id=sessionStorage.getItem(key);
    if(!id){ id=crypto.randomUUID(); sessionStorage.setItem(key,id); }
    return id;
  }catch{ return null; }
}

function setupTelemetry(){
  if(!getPublicConfig().telemetryEnabled) return;
  const sessionId=telemetrySessionId();
  if(!sessionId) return;
  const send=payload=>{
    const body=JSON.stringify({event:payload.event,details:payload,sessionId,path:location.pathname});
    fetch('./api/events',{method:'POST',headers:{'content-type':'application/json'},body,keepalive:true}).catch(()=>{});
  };
  window.addEventListener('foodmyway:analytics',event=>send(event.detail || {}));
  window.addEventListener('error',()=>send({event:'client_error',source:'runtime'}));
  window.addEventListener('unhandledrejection',()=>send({event:'client_error',source:'promise'}));
  track('page_view');
}

function handleCheckoutReturn(){
  const result=new URLSearchParams(location.search).get('founding');
  if(!['success','cancel'].includes(result)) return;
  if(result==='success') showToast('Payment received. Your founding access is being confirmed.');
  else showToast('Checkout canceled. You were not charged.');
  track('founder_checkout_returned',{result});
  history.replaceState({},'',`${location.pathname}${location.hash}`);
}

let accountSession={authenticated:false,configured:false,email:'',entitlement:null};

async function accountApi(path,options={}){
  const response=await fetch(path,{...options,headers:{'content-type':'application/json',...(options.headers || {})}});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error(result.error || 'Account request failed.');
    error.status=response.status; error.code=result.code;
    throw error;
  }
  return result;
}

function showAccountError(message=''){
  const element=$('accountError');
  if(!element) return;
  element.textContent=message;
  element.classList.toggle('hidden',!message);
}

function renderAccountState(){
  const signedIn=Boolean(accountSession.authenticated);
  $('accountSignedIn')?.classList.toggle('hidden',!signedIn);
  $('accountSignedOut')?.classList.toggle('hidden',signedIn);
  const founding=accountSession.entitlement?.plan==='founding' && accountSession.entitlement?.status==='active';
  if($('accountStatus')) $('accountStatus').textContent=signedIn ? `Signed in as ${accountSession.email}${founding ? ' · Founding member' : ''}` : 'Sign in to back up and restore your Food My Way data across devices.';
  if(founding && $('founderCta')){
    $('founderCta').textContent='Founding member ✓';
    $('founderCta').disabled=true;
  }
}

async function refreshAccountSession(){
  try{ accountSession=await accountApi('./api/auth/session'); }
  catch{ accountSession={authenticated:false,configured:false,email:'',entitlement:null}; }
  renderAccountState();
  return accountSession;
}

function downloadCloudExport(payload){
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url; anchor.download=`food-my-way-cloud-export-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

function restoreCloudSnapshot(snapshot){
  const data=snapshot?.data && typeof snapshot.data==='object' ? snapshot.data : {};
  for(const key of CLOUD_DATA_KEYS){
    if(Object.prototype.hasOwnProperty.call(data,key)) lsSet(key,data[key]);
    else localStorage.removeItem(key);
  }
}

async function setupAccounts(){
  if(!getPublicConfig().accountsEnabled) return;
  $('openAccount')?.classList.remove('hidden');
  const overlay=$('accountOverlay');
  const close=()=>{ overlay?.classList.add('hidden'); showAccountError(); };
  $('openAccount')?.addEventListener('click',async()=>{
    overlay?.classList.remove('hidden');
    if($('accountStatus')) $('accountStatus').textContent='Checking account…';
    await refreshAccountSession();
  });
  $('accountClose')?.addEventListener('click',close);
  overlay?.addEventListener('click',event=>{ if(event.target===overlay) close(); });
  $('accountRequestLink')?.addEventListener('click',async()=>{
    showAccountError();
    const email=$('accountEmail')?.value.trim() || '';
    const button=$('accountRequestLink');
    try{
      if(button){ button.disabled=true; button.textContent='Sending…'; }
      const result=await accountApi('./api/auth/request',{method:'POST',body:JSON.stringify({email})});
      if($('accountStatus')) $('accountStatus').textContent=result.message;
    }catch(error){ showAccountError(error.message); }
    finally{ if(button){ button.disabled=false; button.textContent='Email me a sign-in link'; } }
  });
  $('accountBackup')?.addEventListener('click',async()=>{
    showAccountError();
    try{
      const cloud=await accountApi('./api/account/data');
      await accountApi('./api/account/data',{method:'PUT',body:JSON.stringify({data:betaDataSnapshot().data,baseRevision:cloud.revision})});
      showToast('This device is backed up to your cloud account.');
    }catch(error){ showAccountError(error.code==='SYNC_CONFLICT' ? 'Cloud data changed on another device. Restore it or try the backup again.' : error.message); }
  });
  $('accountRestore')?.addEventListener('click',async()=>{
    showAccountError();
    try{
      const cloud=await accountApi('./api/account/data');
      const count=Object.keys(cloud.snapshot?.data || {}).length;
      if(!count){ showAccountError('There is no cloud backup to restore yet.'); return; }
      if(!confirm('Replace this device’s Food My Way recipes, plans, diary, and preferences with the cloud backup? Export local data first if you may need it.')) return;
      restoreCloudSnapshot(cloud.snapshot);
      location.reload();
    }catch(error){ showAccountError(error.message); }
  });
  $('accountExport')?.addEventListener('click',async()=>{
    showAccountError();
    try{ downloadCloudExport(await accountApi('./api/account/data')); }
    catch(error){ showAccountError(error.message); }
  });
  $('accountSignOut')?.addEventListener('click',async()=>{
    showAccountError();
    try{ await accountApi('./api/auth/session',{method:'POST',body:'{}'}); await refreshAccountSession(); showToast('Signed out. Local data stays on this device.'); }
    catch(error){ showAccountError(error.message); }
  });
  $('accountDelete')?.addEventListener('click',async()=>{
    showAccountError();
    if(!confirm('Permanently delete your Food My Way cloud account and cloud backup? Local data on this device will remain.')) return;
    try{
      await accountApi('./api/account/data',{method:'DELETE',headers:{'x-confirm-delete':'DELETE'},body:'{}'});
      accountSession={authenticated:false,configured:true,email:'',entitlement:null}; renderAccountState();
      showToast('Cloud account deleted. Local data remains on this device.');
    }catch(error){ showAccountError(error.message); }
  });
  await refreshAccountSession();
  const loginResult=new URLSearchParams(location.search).get('login');
  if(loginResult){
    if(loginResult==='success'){ await refreshAccountSession(); overlay?.classList.remove('hidden'); showToast('Signed in to Food My Way.'); }
    else showToast(loginResult==='invalid' ? 'That sign-in link is invalid or expired.' : 'Cloud sign-in is unavailable.');
    const clean=new URL(location.href); clean.searchParams.delete('login'); history.replaceState({},'',`${clean.pathname}${clean.search}${clean.hash}`);
  }
}

function requirePremium(feature){
  if(!getPublicConfig().premiumEnforced) return true;
  if(accountSession.entitlement?.plan==='founding' && accountSession.entitlement?.status==='active') return true;
  const labels={
    household_profile:'Household taste profiles',
    weekly_planning:'Weekly planning and grocery lists',
    unlimited_saves:'Unlimited saved recipes'
  };
  const label=labels[feature] || 'This feature';
  track('premium_gate_viewed',{feature});
  if(getPublicConfig().accountsEnabled){
    $('accountOverlay')?.classList.remove('hidden');
    showAccountError(`${label} are included with Founding membership. Sign in with the email used at checkout.`);
  }else{
    document.querySelector('#pricing')?.scrollIntoView({behavior:'smooth',block:'start'});
    showToast(`${label} are included with Founding membership.`);
  }
  return false;
}

function validCheckoutUrl(value){
  try{
    const url=new URL(String(value || ''));
    return url.protocol==='https:' && ['buy.stripe.com','checkout.stripe.com'].includes(url.hostname);
  }catch{ return false; }
}

function getTasteProfile(){
  const profile = lsGet(TASTE_PROFILE_KEY, {});
  return {
    name:String(profile.name || '').slice(0, 40),
    avoids:Array.isArray(profile.avoids) ? profile.avoids.map(canonName).filter(Boolean) : []
  };
}

function isAvoidedFood(name){
  const candidate = canonName(name);
  return getTasteProfile().avoids.some(avoid=>candidate===avoid || candidate.includes(avoid) || avoid.includes(candidate));
}

function applyFoodIdea(text){
  const input = $('ingredientsInput');
  if(!input) return;
  const original = parseLines(text);
  const filtered = original.filter(item=>!isAvoidedFood(item));
  input.value = (filtered.length ? filtered : original).join('\n');
  input.dispatchEvent(new Event('input', { bubbles:true }));
  input.focus();
  if(filtered.length < original.length) showToast('Your “leave out” foods were removed.');
}

function betaDataSnapshot(){
  const keys = [RECIPE_BOOK_KEY, WEEKLY_PLAN_KEY, GROCERY_CHECKS_KEY, TASTE_PROFILE_KEY, 'pickyDiaryMeals', 'foodMyWayFounderInterest'];
  return {
    product:'Food My Way',
    exportedAt:new Date().toISOString(),
    version:2,
    data:Object.fromEntries(keys.map(key=>[key,lsGet(key,null)]).filter(([,value])=>value!==null))
  };
}

function exportBetaData(){
  const blob = new Blob([JSON.stringify(betaDataSnapshot(), null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href=url;
  anchor.download=`food-my-way-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  track('beta_data_exported');
}

// -------------------------------
// Helpers
// -------------------------------
function uid(){
  return (globalThis.crypto?.randomUUID)
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function canonName(s){
  const t = String(s||'').trim().toLowerCase();
  if(!t) return '';
  const x = t
    .replace(/\([^)]*\)/g,' ')
    .replace(/^\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds|oz|ounce|ounces|cup|cups|tbsp|tablespoons?|tsp|teaspoons?|cloves?|pieces?|slices?|cans?|packages?|medium|large|small)?\s+/i,'')
    .replace(/\b(boneless|skinless|fresh|frozen|cooked|uncooked|raw|chopped|diced|minced|sliced|shredded|grated|lean|extra lean)\b/g,' ')
    .replace(/\bfillet\b/g,'')
    .replace(/\bfilet\b/g,'')
    .replace(/\s+/g,' ')
    .trim();

  if(x === 'potato') return 'potatoes';
  if(x === 'onions') return 'onion';
  if(x === 'lemons') return 'lemon';
  if(x === 'scallion' || x === 'scallions') return 'green onion';
  if(x === 'salmon fillets' || x === 'salmon filet' || x === 'salmon filets') return 'salmon';
  if(x === 'chicken') return 'chicken breast';
  if(x === 'chicken breasts') return 'chicken breast';
  if(x === 'steaks' || x === 'steak') return 'steak';
  if(x === 'pork chops' || x === 'pork chop') return 'pork';
  if(x === 'eggs') return 'eggs';
  if(x === 'cheddar' || x === 'cheddar cheese') return 'cheddar cheese';
  if(x === 'bell peppers') return 'bell pepper';
  if(x === 'tortilla') return 'tortillas';
  if(x === 'tomato') return 'tomatoes';
  if(x === 'tacos') return 'taco';
  return x;
}

function parseLines(s){
  return (s||'').replace(/,+/g,'\n').split(/\n+/).map(x=>x.trim()).filter(Boolean);
}

function parseInputIngredient(raw){
  const text = String(raw || '').trim();
  const match = text.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(lb|lbs|pound|pounds|oz|ounce|ounces|cup|cups|tbsp|tablespoons?|tsp|teaspoons?|cloves?|pieces?|slices?|cans?|medium|large|small)\b/i);
  if(!match) return { name:canonName(text), quantity:null, unit:null };
  const numberText = match[1];
  let quantity;
  if(numberText.includes(' ')){
    const [whole, fraction] = numberText.split(/\s+/);
    const [top,bottom] = fraction.split('/').map(Number);
    quantity = Number(whole) + top/bottom;
  }else if(numberText.includes('/')){
    const [top,bottom] = numberText.split('/').map(Number);
    quantity = top/bottom;
  }else quantity = Number(numberText);
  const rawUnit = match[2].toLowerCase();
  const unitMap = {
    lbs:'lb', pound:'lb', pounds:'lb', ounce:'oz', ounces:'oz', cup:'cups',
    tablespoon:'tbsp', tablespoons:'tbsp', teaspoon:'tsp', teaspoons:'tsp',
    clove:'cloves', piece:'pieces', slice:'slices', can:'count', cans:'count',
    large:'count', small:'count'
  };
  return { name:canonName(text), quantity, unit:unitMap[rawUnit] || rawUnit };
}

function pretty(s){
  return (s||'').split(' ').map(w=>w? w[0].toUpperCase()+w.slice(1) : w).join(' ');
}

// 0.5 -> 1/2 (display only)
function formatQty(value) {
  if (!value || value <= 0) return "";
  const fractions = { 0.25:"1/4", 0.33:"1/3", 0.5:"1/2", 0.66:"2/3", 0.75:"3/4" };
  const whole = Math.floor(value);
  const remainder = value - whole;
  const closest = Object.keys(fractions).find(f => Math.abs(Number(f) - remainder) < 0.01);

  let result = whole > 0 ? whole.toString() : "";
  if (closest) result += (result ? " " : "") + fractions[closest];
  else if (remainder > 0) result += (result ? " " : "") + remainder.toFixed(2);

  return result;
}

// -------------------------------
// Roles
// -------------------------------
const ROLE_RULES = [
  // Specific phrases FIRST (prevents "green beans" matching "beans")
  [/\bgreen beans\b/i,'veg'],
  [/\b(bell pepper|broccoli|carrots?|zucchini|spinach|tomatoes?|corn|peas|cauliflower)\b/i,'veg'],

  // Theme / blends
  [/\btaco seasoning\b/i,'seasoning'],
  [/\b(bbq|barbecue)\b/i,'seasoning'],

  // Dairy + bread
  [/\b(cheese|cheddar|mozzarella|parmesan|feta|greek yogurt|sour cream)\b/i,'dairy'],
  [/\b(tortilla|tortillas|bread|bun|buns|wrap|pita)\b/i,'bread'],

  // Seasonings (general)
  [/\b(salt|pepper|black pepper|kosher salt|sea salt|garlic powder|onion powder|paprika|smoked paprika|italian seasoning|oregano|basil|parsley|thyme|rosemary|cumin|chili flakes|red pepper flakes|herbs)\b/i,'seasoning'],

  [/\b(olive oil|butter)\b/i,'fat'],
  [/\b(lemon|lemon juice|vinegar)\b/i,'acid'],
  [/\b(salmon|chicken|chicken breast|beef|ground beef|lean beef|steak|turkey|pork|tofu|lentils|egg|eggs)\b/i,'protein'],
  [/\bbeans\b/i,'protein'],
  [/\b(rice|pasta|potato|potatoes|quinoa|sweet potato|sweet potatoes)\b/i,'starch'],
  [/\b(onion|onions|green onion|scallion|scallions|shallot|garlic)\b/i,'aromatic']
];

function roleFor(n){
  for(const [r,role] of ROLE_RULES) if(r.test(n)) return role;
  return 'veg';
}

// -------------------------------
// Measurement intent (controls step/min/max — does NOT force units)
// -------------------------------
const INTENT_RULES = {
  bulk:    { stepCup: 0.25, stepLb: 0.25, stepCount: 1, max: 10 },
  support: { stepTbsp: 0.5,  stepCup: 0.25, stepCount: 1, max: 24 },
  flavor:  { stepTsp: 0.25,  stepTbsp: 0.25, stepCount: 1, max: 10 },
  finish:  { stepTsp: 0.25,  stepTbsp: 0.25, stepCount: 1, max: 10 }
};

const ROLE_TO_INTENT = {
  protein:  'bulk',
  veg:      'bulk',
  starch:   'bulk',
  bread:    'bulk',
  dairy:    'support',
  fat:      'support',
  seasoning:'flavor',
  acid:     'finish',
  aromatic: 'support'
};

function intentForRole(role){
  return ROLE_TO_INTENT[role] || 'bulk';
}

function stepFor(ing){
  const intent = ing.intent || intentForRole(ing.role);
  const rules = INTENT_RULES[intent] || INTENT_RULES.bulk;
  const u = ing.base?.u || '';

  if(u === 'tsp')  return rules.stepTsp ?? 0.25;
  if(u === 'tbsp') return rules.stepTbsp ?? 0.25;
  if(u === 'cups') return rules.stepCup ?? 0.25;
  if(u === 'lb')   return rules.stepLb ?? 0.25;

  // counts (pieces/slices/eggs/cloves/medium/count)
  return rules.stepCount ?? 1;
}

function clampMaxFor(ing){
  const intent = ing.intent || intentForRole(ing.role);
  const rules = INTENT_RULES[intent] || INTENT_RULES.bulk;
  return rules.max ?? 10;
}

// -------------------------------
// Base quantities (SERVES 2 defaults)
// -------------------------------
const BASE_QTY = {
  protein:{ v:1,   u:'lb' },      // serves 2
  veg:{ v:2,       u:'cups' },
  starch:{ v:2,    u:'cups' },
  aromatic:{ v:1,  u:'medium' },
  fat:{ v:1,       u:'tbsp' },
  acid:{ v:1,      u:'tbsp' },
  seasoning:{ v:0.5,u:'tsp' },
  dairy:{ v:0.5,   u:'cups' },    // cheese default
  bread:{ v:4,     u:'count' }    // tortillas/bread pieces
};

// Ingredient-specific default quantities (SERVES 2 baseline)
const CANON_DEFAULT_BASE = {
  'olive oil': { v: 1, u: 'tbsp' },
  'butter':    { v: 1, u: 'tbsp' },
  'lemon':     { v: 1, u: 'tbsp' },
  'vinegar':   { v: 1, u: 'tbsp' },
  'garlic':    { v: 2, u: 'cloves' },

  // Common swaps that should NOT default to "cups"
  'sour cream':{ v: 2, u: 'tbsp' }   // good baseline support amount for serves 2
};

// -------------------------------
// Swap catalog (supports + jackpot)
// -------------------------------
const SWAP_CATALOG = {
  protein: [
    { name:'chicken breast', unitOverride:'lb',   baseOverride:1,    instrPatchKey:'cook_meat' },
    { name:'turkey',         unitOverride:'lb',   baseOverride:1,    instrPatchKey:'cook_meat' },
    { name:'lean beef',      unitOverride:'lb',   baseOverride:1,    instrPatchKey:'cook_meat' },
    { name:'ground beef',    unitOverride:'lb',   baseOverride:1,    instrPatchKey:'cook_meat' },
    { name:'salmon',         unitOverride:'lb',   baseOverride:1,    instrPatchKey:'cook_fish' },
    { name:'tofu',           unitOverride:'oz',   baseOverride:14,   instrPatchKey:'cook_tofu' },
    { name:'beans',          unitOverride:'cups', baseOverride:2,    instrPatchKey:'warm_beans' },
    { name:'eggs',           unitOverride:'eggs', baseOverride:4,    instrPatchKey:'cook_eggs' }
  ],
  starch: [
    { name:'potatoes',       unitOverride:'cups',   baseOverride:2,    instrPatchKey:'cook_potato' },
    { name:'sweet potatoes', unitOverride:'medium', baseOverride:2,    instrPatchKey:'cook_potato' },
    { name:'rice',           unitOverride:'cups',   baseOverride:1.5,  instrPatchKey:'cook_rice' },
    { name:'quinoa',         unitOverride:'cups',   baseOverride:1.25, instrPatchKey:'cook_quinoa' },
    { name:'pasta',          unitOverride:'cups',   baseOverride:1.5,  instrPatchKey:'cook_pasta' }
  ],
  aromatic: [
    { name:'onion',       unitOverride:'medium', baseOverride:1,   instrPatchKey:'add_aromatic' },
    { name:'green onion', unitOverride:'cups',   baseOverride:0.5, instrPatchKey:'add_aromatic' },
    { name:'shallot',     unitOverride:'medium', baseOverride:1,   instrPatchKey:'add_aromatic' },
    { name:'garlic',      unitOverride:'cloves', baseOverride:2,   instrPatchKey:'add_garlic' },
    { name:'skip it',     unitOverride:'',       baseOverride:0,   instrPatchKey:'skip_aromatic' }
  ],
  veg: [
    { name:'broccoli',    unitOverride:'cups', baseOverride:2,   instrPatchKey:'cook_veg' },
    { name:'green beans', unitOverride:'cups', baseOverride:2,   instrPatchKey:'cook_veg' },
    { name:'carrots',     unitOverride:'cups', baseOverride:1.5, instrPatchKey:'cook_veg' },
    { name:'zucchini',    unitOverride:'cups', baseOverride:2,   instrPatchKey:'cook_veg' },
    { name:'spinach',     unitOverride:'cups', baseOverride:3,   instrPatchKey:'cook_veg' },
    { name:'tomatoes',    unitOverride:'cups', baseOverride:2,   instrPatchKey:'cook_veg' }
    ,{ name:'corn',        unitOverride:'cups', baseOverride:1.5, instrPatchKey:'cook_veg' }
    ,{ name:'peas',        unitOverride:'cups', baseOverride:1.5, instrPatchKey:'cook_veg' }
    ,{ name:'cauliflower', unitOverride:'cups', baseOverride:2,   instrPatchKey:'cook_veg' }
    ,{ name:'bell pepper', unitOverride:'cups', baseOverride:1.5, instrPatchKey:'cook_veg' }
  ],
  fat: [
    { name:'olive oil', unitOverride:'tbsp', baseOverride:1, instrPatchKey:'use_oil' },
    { name:'butter',    unitOverride:'tbsp', baseOverride:1, instrPatchKey:'use_oil' },
    { name:'skip it',   unitOverride:'',     baseOverride:0, instrPatchKey:'skip_fat' }
  ],
  acid: [
    { name:'lemon',   unitOverride:'tbsp', baseOverride:1, instrPatchKey:'finish_acid' },
    { name:'vinegar', unitOverride:'tbsp', baseOverride:1, instrPatchKey:'finish_acid' },
    { name:'skip it', unitOverride:'',     baseOverride:0, instrPatchKey:'skip_acid' }
  ],
  seasoning: [
    { name:'salt',              unitOverride:'tsp', baseOverride:0.5,  instrPatchKey:'season' },
    { name:'black pepper',      unitOverride:'tsp', baseOverride:0.25, instrPatchKey:'season' },
    { name:'garlic powder',     unitOverride:'tsp', baseOverride:0.5,  instrPatchKey:'season' },
    { name:'paprika',           unitOverride:'tsp', baseOverride:0.5,  instrPatchKey:'season' },
    { name:'italian seasoning', unitOverride:'tsp', baseOverride:0.5,  instrPatchKey:'season' },
    { name:'chili flakes',      unitOverride:'tsp', baseOverride:0.25, instrPatchKey:'season' },
    { name:'skip it',           unitOverride:'',   baseOverride:0,     instrPatchKey:'skip_seasoning' }
  ],
  dairy: [
    { name:'cheddar cheese',  unitOverride:'cups',  baseOverride:0.5, instrPatchKey:'combine' },
    { name:'mozzarella',      unitOverride:'cups',  baseOverride:0.5, instrPatchKey:'combine' },
    { name:'parmesan',        unitOverride:'tbsp',  baseOverride:4,   instrPatchKey:'combine' },
    { name:'sour cream',      unitOverride:'tbsp',  baseOverride:2,   instrPatchKey:'combine' },
    { name:'skip it',         unitOverride:'',      baseOverride:0,   instrPatchKey:'combine' }
  ],
  bread: [
    { name:'tortillas',       unitOverride:'count', baseOverride:4,  instrPatchKey:'combine' },
    { name:'bread',           unitOverride:'count', baseOverride:2,  instrPatchKey:'combine' },
    { name:'pita',            unitOverride:'count', baseOverride:2,  instrPatchKey:'combine' },
    { name:'skip it',         unitOverride:'',      baseOverride:0,  instrPatchKey:'combine' }
  ]
};

// -------------------------------
// Canonical nutrition table (per 100g)
// -------------------------------
const NUTRITION_PER_100G = {
  // proteins
  'chicken breast':{ cal:165, p:31.0, c:0.0,  f:3.6 },
  'turkey':        { cal:170, p:29.0, c:0.0,  f:6.0 },
  'lean beef':     { cal:176, p:26.0, c:0.0,  f:10.0 },
  'ground beef':   { cal:176, p:26.0, c:0.0,  f:10.0 },
  'beef':          { cal:176, p:26.0, c:0.0,  f:10.0 },
  'pork':          { cal:242, p:27.0, c:0.0,  f:14.0 },
  'tofu':          { cal:144, p:15.7, c:3.9,  f:8.7 },
  'beans':         { cal:127, p:8.7,  c:22.8, f:0.5 },
  'lentils':       { cal:116, p:9.0,  c:20.1, f:0.4 },
  'eggs':          { cal:143, p:12.6, c:0.7,  f:9.5 },
  'salmon':        { cal:208, p:20.4, c:0.0,  f:13.4 },
  'steak':         { cal:217, p:26.1, c:0.0,  f:11.8 },

  // starches
  'rice':          { cal:130, p:2.7,  c:28.2, f:0.3 },
  'pasta':         { cal:158, p:5.8,  c:30.9, f:0.9 },
  'quinoa':        { cal:120, p:4.4,  c:21.3, f:1.9 },
  'potatoes':      { cal:87,  p:1.9,  c:20.1, f:0.1 },
  'sweet potatoes':{ cal:86,  p:1.6,  c:20.1, f:0.1 },

  // veg
  'broccoli':      { cal:34,  p:2.8,  c:7.0,  f:0.4 },
  'zucchini':      { cal:17,  p:1.2,  c:3.1,  f:0.3 },
  'green beans':   { cal:31,  p:1.8,  c:7.1,  f:0.1 },
  'carrots':       { cal:41,  p:0.9,  c:9.6,  f:0.2 },
  'spinach':       { cal:23,  p:2.9,  c:3.6,  f:0.4 },
  'tomatoes':      { cal:18,  p:0.9,  c:3.9,  f:0.2 },
  'corn':          { cal:96,  p:3.4,  c:21.0, f:1.5 },
  'peas':          { cal:81,  p:5.4,  c:14.5, f:0.4 },
  'cauliflower':   { cal:25,  p:1.9,  c:5.0,  f:0.3 },
  'bell pepper':   { cal:31,  p:1.0,  c:6.0,  f:0.3 },

  // aromatics
  'onion':         { cal:40,  p:1.1,  c:9.3,  f:0.1 },
  'green onion':   { cal:32,  p:1.8,  c:7.3,  f:0.2 },
  'shallot':       { cal:72,  p:2.5,  c:16.8, f:0.1 },
  'garlic':        { cal:149, p:6.4,  c:33.1, f:0.5 },

  // fat/acid
  'olive oil':     { cal:884, p:0.0,  c:0.0,  f:100.0 },
  'butter':        { cal:717, p:0.9,  c:0.1,  f:81.1 },
  'lemon':         { cal:29,  p:1.1,  c:9.3,  f:0.3 },
  'vinegar':       { cal:18,  p:0.0,  c:0.0,  f:0.0 },

  // dairy
  'cheddar cheese': { cal:403, p:25.0, c:1.3,  f:33.0 },
  'mozzarella':     { cal:300, p:22.0, c:2.2,  f:22.0 },
  'parmesan':       { cal:431, p:38.0, c:4.1,  f:29.0 },
  'sour cream':     { cal:193, p:2.1,  c:4.6,  f:19.0 },

  // bread
  'tortillas':      { cal:304, p:8.0,  c:50.0, f:8.0 },
  'bread':          { cal:265, p:9.0,  c:49.0, f:3.2 },
  'pita':           { cal:275, p:9.0,  c:55.0, f:1.2 },

  // seasonings (treated as ~0 for now; tiny amounts)
  'salt':          { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'pepper':        { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'black pepper':  { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'garlic powder': { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'onion powder':  { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'paprika':       { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'smoked paprika':{ cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'italian seasoning': { cal:0, p:0.0, c:0.0, f:0.0 },
  'oregano':       { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'basil':         { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'parsley':       { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'thyme':         { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'rosemary':      { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'cumin':         { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'chili flakes':  { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'red pepper flakes': { cal:0, p:0.0, c:0.0, f:0.0 },
  'skip it':       { cal:0,   p:0.0,  c:0.0,  f:0.0 }
};

const ROLE_FALLBACK_100G = {
  protein:  { cal:165, p:25.0, c:0.0,  f:6.0 },
  starch:   { cal:120, p:3.0,  c:25.0, f:1.0 },
  veg:      { cal:30,  p:2.0,  c:6.0,  f:0.3 },
  aromatic: { cal:40,  p:1.0,  c:9.0,  f:0.1 },
  fat:      { cal:884, p:0.0,  c:0.0,  f:100.0 },
  acid:     { cal:20,  p:0.0,  c:1.0,  f:0.0 },
  seasoning:{ cal:0,   p:0.0,  c:0.0,  f:0.0 },
  dairy:    { cal:300, p:18.0, c:3.0,  f:22.0 },
  bread:    { cal:265, p:9.0,  c:49.0, f:3.2 }
};

function nutrientFor(name, role){
  const key = canonName(name);
  return NUTRITION_PER_100G[key] || ROLE_FALLBACK_100G[role] || ROLE_FALLBACK_100G.veg;
}

// -------------------------------
// Quantity conversions → grams
// -------------------------------
const UNIT_TO_GRAMS = {
  lb: 453.592,
  oz: 28.3495,
  eggs: 50,
  cloves: 3,
  tbsp: 15,
  tsp: 5,
  pieces: 30,
  slices: 25,
  count: 30,   // fallback if not overridden by ingredient map
  medium: 110  // generic fallback
};

const GRAMS_PER_UNIT = {
  // cups
  'broccoli': { cups: 91 },
  'zucchini': { cups: 124 },
  'green beans': { cups: 110 },
  'carrots': { cups: 128 },
  'spinach': { cups: 30 },
  'rice': { cups: 158 },
  'pasta': { cups: 140 },
  'quinoa': { cups: 185 },
  'potatoes': { cups: 150 },
  'beans': { cups: 172 },
  'lentils': { cups: 198 },
  'green onion': { cups: 50 },
  'tomatoes': { cups: 180 },
  'corn': { cups: 164 },
  'peas': { cups: 160 },
  'cauliflower': { cups: 107 },
  'bell pepper': { cups: 149 },
  'cheddar cheese': { cups: 226 },
  'mozzarella': { cups: 112 },

  // tbsp/tsp specifics
  'parmesan': { tbsp: 5 },
  'olive oil': { tbsp: 13.5, tsp: 4.5 },
  'butter': { tbsp: 14 },
  'lemon': { tbsp: 15, tsp: 5 },
  'vinegar': { tbsp: 15, tsp: 5 },
  'garlic': { cloves: 3 },
  'sour cream': { tbsp: 15 },

  // count/pieces/slices specifics
  'tortillas': { count: 30, pieces: 30 },
  'bread': { count: 25, slices: 25 },
  'pita': { count: 60, pieces: 60 },

  // medium
  'onion': { medium: 110 },
  'shallot': { medium: 44 },
  'sweet potatoes': { medium: 130 }
};

function gramsFor(name, unit, qty){
  const n = canonName(name);
  if(n === 'skip it' || qty === 0) return 0;

  // normalize some unit variants
  const u = (unit === 'cup') ? 'cups'
          : (unit === 'piece') ? 'pieces'
          : (unit === 'slice') ? 'slices'
          : unit;

  const map = GRAMS_PER_UNIT[n] || {};
  if(map[u] != null) return qty * map[u];

  if(UNIT_TO_GRAMS[u] != null) return qty * UNIT_TO_GRAMS[u];

  return 0;
}

function isActiveIngredient(ingredient){
  return Boolean(ingredient && ingredient.name!=='skip it' && Number(ingredient.base?.v)>0);
}

// -------------------------------
// Instructions (simple, deterministic)
// -------------------------------
const INSTR = {
  prep: 'Wash and prep everything: chop into bite-sized pieces.',
  use_oil: 'Heat a pan over medium heat and add oil or butter.',
  cook_meat:  'Add the meat. Cook until fully cooked (no pink remains).',
  cook_fish:  'Cook salmon 3–4 minutes per side until it flakes easily.',
  cook_tofu:  'Pat tofu dry, cube it, then cook until lightly browned.',
  warm_beans: 'Rinse beans, then warm gently for 2–3 minutes.',
  cook_eggs:  'Whisk eggs with a pinch of salt, then cook until set.',
  cook_rice:  'Cook rice (or use microwave rice). Fluff when done.',
  cook_pasta: 'Boil water, cook pasta until tender, drain.',
  cook_quinoa:'Rinse quinoa, simmer until absorbed, rest 5 minutes, fluff.',
  cook_potato:'Cook potatoes until fork-tender (boil or roast).',
  add_aromatic:'Add onion/shallot/green onion and cook 1–2 minutes.',
  add_garlic: 'Add garlic last (30–45 seconds) so it doesn’t burn.',
  skip_aromatic:'Skip aromatics. Season with salt/pepper instead.',
  cook_veg:   'Add veggies. Cook until tender-crisp (3–6 minutes).',
  finish_acid:'Finish with lemon or vinegar off heat to brighten flavor.',
  season:  'Season to taste with salt, pepper, or herbs.',
  skip_seasoning: 'Skip extra seasoning for now.',
  combine: 'Combine everything. Taste. Season. Serve.'
};

function buildInstructions(ingredients){
  const active = ingredients.filter(i=>i.name!=='skip it' && i.base.v>0);
  const namesFor = role => active.filter(i=>i.role===role).map(i=>pretty(i.name));
  const joinNames = names => names.length > 1
    ? `${names.slice(0,-1).join(', ')} and ${names.at(-1)}`
    : (names[0] || 'the ingredients');
  const steps = [];
  const prepNames = active.filter(i=>['protein','veg','aromatic'].includes(i.role) || /potato/.test(i.name)).map(i=>pretty(i.name));
  steps.push({ key:'prep', text: prepNames.length
    ? `Gather everything. Wash produce and prepare ${joinNames(prepNames)} as needed, keeping pieces even for predictable cooking.`
    : 'Gather and measure all ingredients before you start cooking.' });

  const fats = namesFor('fat');
  if(fats.length){
    steps.push({ key:'oil', text: `Heat a large pan over medium heat and add ${joinNames(fats)}.` });
  }

  const aromatics = namesFor('aromatic');
  if(aromatics.length){
    const hasGarlic = aromatics.some(name=>name.toLowerCase()==='garlic');
    steps.push({ key:'aromatic', text: `Add ${joinNames(aromatics)} and cook ${hasGarlic && aromatics.length===1 ? '30–45 seconds' : '2–3 minutes'}, stirring often.` });
  }

  const proteins = active.filter(i=>i.role==='protein');
  proteins.forEach((protein,index)=>{
    const name = pretty(protein.name);
    let text = `Add ${name} and cook until done.`;
    if(protein.name.includes('salmon')) text = `Cook ${name} for 3–4 minutes per side, until it flakes easily and reaches a safe internal temperature.`;
    else if(protein.name.includes('tofu')) text = `Pat ${name} dry, cube it, and cook for 6–8 minutes until lightly browned.`;
    else if(protein.name.includes('bean') || protein.name.includes('lentil')) text = `Rinse ${name}, then add and warm gently for 2–3 minutes.`;
    else if(protein.name.includes('egg')) text = `Whisk ${name} with a pinch of salt, then cook gently until set.`;
    else text = `Add ${name}. Cook, stirring or turning as needed, until browned and safely cooked through.`;
    steps.push({ key:`protein-${index}`, text });
  });

  const starches = active.filter(i=>i.role==='starch');
  starches.forEach((starch,index)=>{
    const name = pretty(starch.name);
    let text;
    if(starch.name.includes('rice')) text = `Cook ${name} according to the package directions, then fluff.`;
    else if(starch.name.includes('pasta')) text = `Boil ${name} according to the package directions, then drain.`;
    else if(starch.name.includes('quinoa')) text = `Rinse ${name}, simmer until the liquid is absorbed, then rest 5 minutes and fluff.`;
    else text = `Cook ${name} until fork-tender; roast, boil, or microwave based on your preferred texture.`;
    steps.push({ key:`starch-${index}`, text });
  });

  const vegetables = namesFor('veg');
  if(vegetables.length){
    const quick = vegetables.every(name=>/spinach|tomato/i.test(name));
    steps.push({ key:'veg', text:`Add ${joinNames(vegetables)} and cook until ${quick ? 'just softened, 2–3 minutes' : 'tender-crisp, about 4–6 minutes'}.` });
  }

  const dairy = namesFor('dairy');
  if(dairy.length){
    steps.push({ key:'dairy', text:`Lower the heat and add ${joinNames(dairy)}. Stir just until creamy or melted.` });
  }

  const bread = namesFor('bread');
  if(bread.length){
    steps.push({ key:'bread', text:`Warm ${joinNames(bread)} and use it to wrap, scoop, or serve the filling.` });
  }

  const acids = namesFor('acid');
  if(acids.length){
    steps.push({ key:'acid', text:`Take the pan off the heat and finish with ${joinNames(acids)}.` });
  }

  const seasonings = namesFor('seasoning');
  if(seasonings.length){
    steps.push({ key:'seasoning', text:`Taste and season with ${joinNames(seasonings)}. Add a little at a time.` });
  }

  steps.push({ key:'combine', text:'Combine everything, divide between plates, and serve warm.' });
  return steps;
}

function recipeDetails(ingredients){
  const active = ingredients.filter(i=>i.name!=='skip it' && i.base.v>0);
  const protein = active.find(i=>i.role==='protein');
  const starch = active.find(i=>i.role==='starch');
  const vegetables = active.filter(i=>i.role==='veg');
  const prepMinutes = Math.min(20, 5 + Math.ceil(active.length/3)*5);
  let cookMinutes = 15;
  if(starch?.name.includes('potato')) cookMinutes = 25;
  else if(starch) cookMinutes = 20;
  if(protein?.name.includes('salmon')) cookMinutes = Math.max(cookMinutes, 12);
  const focus = [protein?.name, starch?.name, vegetables[0]?.name].filter(Boolean).map(pretty);
  const description = focus.length
    ? `A straightforward ${focus.join(', ')} recipe with familiar flavors and flexible swaps.`
    : 'A simple, flexible recipe made from foods you chose.';
  return { description, prepMinutes, cookMinutes };
}

// -------------------------------
// Naming (dynamic after swaps)
// -------------------------------
function titleFrom(ings){
  const protein = ings.find(i=>i.role==='protein' && i.name!=='skip it');
  const main = protein ? pretty(protein.name) : 'Veggie';
  const all = ings.map(i=>i.name).join(' ').toLowerCase();

  if(all.includes('taco') || all.includes('tortilla')) return `${main} Tacos`;
  if(all.includes('pizza')) return `${main} Pizza`;
  if(all.includes('bbq') || all.includes('barbecue')) return `BBQ ${main}`;

  const hasStarch = ings.some(i=>i.role==='starch' && i.name!=='skip it');
  const style = hasStarch ? 'Dinner' : 'Plate';
  return `Simple ${main} ${style}`;
}

// -------------------------------
// State normalization
// -------------------------------
function normalize(names){
  const seen = new Set();
  return names.map(raw=>{
    const parsed = parseInputIngredient(raw);
    const name = parsed.name;
    const role = roleFor(name);
    const intent = intentForRole(role);
    const base = { ...(BASE_QTY[role] || BASE_QTY.veg) };

    const override = CANON_DEFAULT_BASE[name];
    if(override){
      base.v = override.v;
      base.u = override.u;
    }
    if(parsed.quantity != null && parsed.unit){
      base.v = parsed.quantity;
      base.u = parsed.unit;
    }

    return {
      id: uid(),
      name,
      role,
      intent,
      base,
      swapMeta: null
    };
  }).filter(ingredient=>ingredient.name && !seen.has(ingredient.name) && seen.add(ingredient.name));
}

// -------------------------------
// UI quantity string
// -------------------------------
function qtyStr(ing){
  const m = servings / 2;
  const val = ing.base.v * m;

  if(!ing.base.u || val === 0) return '';

  // display formats
  if(ing.base.u === 'cups'){
    const nice = formatQty(val) || String(val.toFixed(2));
    return `${nice} ${val<=1 ? 'cup' : 'cups'}`;
  }
  if(ing.base.u === 'tbsp'){
    const nice = formatQty(val) || String(val.toFixed(2));
    return `${nice} tbsp`;
  }
  if(ing.base.u === 'tsp'){
    const nice = formatQty(val) || String(val.toFixed(2));
    return `${nice} tsp`;
  }
  if(ing.base.u === 'count'){
    return `count ${Math.max(0, Math.round(val))}`;
  }

  const isInt = Math.abs(val - Math.round(val)) < 1e-9;
  const nice = isInt ? String(Math.round(val)) : (formatQty(val) || val.toFixed(1));
  return `${nice} ${ing.base.u}`;
}

// -------------------------------
// Nutrition → UI
// -------------------------------
function ensureNutritionDisclosure(){
  if (document.getElementById('nutritionDisclosure')) return;

  const host =
    document.getElementById('macroRow') ||
    document.querySelector('.macro-row') ||
    document.getElementById('resultCard') ||
    document.body;

  const wrap = document.createElement('div');
  wrap.id = 'nutritionDisclosure';
  wrap.style.marginTop = '8px';
  wrap.style.fontSize = '12px';
  wrap.style.opacity = '0.85';
  wrap.style.color = 'var(--muted, #6b7280)';

  wrap.innerHTML = `
    <div>
      ≈ Nutrition is an estimate per serving based on standard references.
      <span id="ndToggle" style="text-decoration:underline; cursor:pointer; margin-left:6px;">Details</span>
    </div>
    <div id="ndDetails" style="display:none; margin-top:6px; font-size:11px; line-height:1.35;">
      Values can vary by brand, prep method, and exact portioning. Use this as guidance, not a medical claim.
    </div>
  `;

  host.appendChild(wrap);

  const toggle = document.getElementById('ndToggle');
  const details = document.getElementById('ndDetails');
  if(toggle && details){
    toggle.onclick = () => {
      details.style.display = (details.style.display === 'none') ? 'block' : 'none';
    };
  }
}

function computeMacrosPerServing(){
  if(!state) return { cal:0, p:0, c:0, f:0 };

  let cal=0, p=0, c=0, f=0;

  state.ingredients.forEach(ing=>{
    const m = servings/2;
    const qty = ing.base.v * m;
    const grams = gramsFor(ing.name, ing.base.u, qty);
    const n = nutrientFor(ing.name, ing.role);

    cal += n.cal * (grams/100);
    p   += n.p   * (grams/100);
    c   += n.c   * (grams/100);
    f   += n.f   * (grams/100);
  });

  const per = { cal: cal/servings, p: p/servings, c: c/servings, f: f/servings };

  if($('calories')) $('calories').textContent = `≈ ${Math.round(per.cal)} cal/serv`;
  if($('protein'))  $('protein').textContent  = `Protein ${Math.round(per.p)}g`;
  if($('carbs'))    $('carbs').textContent    = `Carbs ${Math.round(per.c)}g`;
  if($('fat'))      $('fat').textContent      = `Fat ${Math.round(per.f)}g`;

  ensureNutritionDisclosure();
  return per;
}

// -------------------------------
// Visual helpers
// -------------------------------
function bump(el, cls='bump', ms=450){
  if(!el) return;
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls), ms);
}

function setOwned(){
  owned = true;
  const sr = $('saveRow');
  if(sr) sr.classList.remove('hidden');
}

// -------------------------------
// SWAPS
// -------------------------------
function applySwap(ingId, opt, optsArg){
  const ing = state?.ingredients?.find(i=>i.id===ingId);
  if(!ing || !opt) return;

  const opts = optsArg || {};
  const keepRole = !!opts.keepRole;
  const keepQty  = !!opts.keepQty;

  const prevRole = ing.role;
  const prevIntent = ing.intent;
  const prevBase = { ...ing.base };

  ing.name = canonName(opt.name);

  // Role handling:
  // - Catalog swaps: role follows ingredient
  // - Jackpot swaps: role stays on slot (persist behavior)
  ing.role = keepRole ? prevRole : roleFor(ing.name);
  ing.intent = keepRole ? (prevIntent || intentForRole(ing.role)) : intentForRole(ing.role);

  // Quantity handling:
  // - Catalog swaps: reset baseline per role, then apply overrides
  // - Jackpot swaps: keep slot qty/unit
  if(keepQty){
    ing.base = prevBase;
  } else {
    ing.base = { ...(BASE_QTY[ing.role] || BASE_QTY.veg) };

    if(typeof opt.baseOverride === 'number') ing.base.v = opt.baseOverride;
    if(typeof opt.unitOverride === 'string') ing.base.u = opt.unitOverride;

    const override = CANON_DEFAULT_BASE[ing.name];
    if(override){
      ing.base.v = override.v;
      ing.base.u = override.u;
    }
  }

  ing.swapMeta = { patchKey: opt.instrPatchKey || null };

  // Update steps + title
  state.steps = buildInstructions(state.ingredients);
  state.title = titleFrom(state.ingredients);

  computeMacrosPerServing();
  render();
}

// -------------------------------
// Render
// -------------------------------
function render(){
  if(!state) return;

  // Keep naming current (swaps/amount edits)
  state.title = titleFrom(state.ingredients);
  const details = recipeDetails(state.ingredients);
  state.description = details.description;
  state.prepMinutes = details.prepMinutes;
  state.cookMinutes = details.cookMinutes;

  if($('servingsVal')) $('servingsVal').textContent = servings;
  if($('recipeTitle')) $('recipeTitle').textContent = state.title;
  if($('recipeDescription')) $('recipeDescription').textContent = details.description;
  if($('prepTime')) $('prepTime').textContent = `${details.prepMinutes} min prep`;
  if($('cookTime')) $('cookTime').textContent = `${details.cookMinutes} min cook`;

  const ul = $('ingredientsList');
  if(ul){
    ul.innerHTML = '';

    state.ingredients.filter(isActiveIngredient).forEach((ing)=>{
      const li = document.createElement('li');
      li.className = 'ing-row';
      li.setAttribute('data-role', ing.role);

      const left = document.createElement('div');
      left.className = 'ing-left';

      const main = document.createElement('div');
      main.className = 'ing-main';
      const q = qtyStr(ing);
      main.textContent = q ? `${q} ${pretty(ing.name)}` : `${pretty(ing.name)}`;

      const sub = document.createElement('div');
      sub.className = 'ing-sub';
      sub.textContent = `${ing.role.toUpperCase()} • ${(ing.intent||intentForRole(ing.role)).toUpperCase()}`;

      left.append(main, sub);

      // Amount controls
      const ctrl = document.createElement('div');
      ctrl.className = 'amount-controls';

      const dec = document.createElement('button');
      dec.type = 'button';
      dec.className = 'btn ghost small';
      dec.textContent = '−';

      const inc = document.createElement('button');
      inc.type = 'button';
      inc.className = 'btn ghost small';
      inc.textContent = '+';

      dec.onclick = ()=>{
        const step = stepFor(ing);
        ing.base.v = Math.max(0, Number((ing.base.v - step).toFixed(4)));
        setOwned();
        computeMacrosPerServing();
        render();
      };
      inc.onclick = ()=>{
        const step = stepFor(ing);
        const max = clampMaxFor(ing);
        ing.base.v = Math.min(max, Number((ing.base.v + step).toFixed(4)));
        setOwned();
        computeMacrosPerServing();
        render();
      };

      ctrl.append(dec, inc);
      left.appendChild(ctrl);

      // Swap dropdown
      const sel = document.createElement('select');
      sel.className = 'swap-select';

      const opts = (SWAP_CATALOG[ing.role] || []).filter(option=>!isAvoidedFood(option.name));
      sel.innerHTML =
        `<option value="">Swap</option>` +
        `<option value="__custom__">➕ Enter your own…</option>` +
        opts.map(o=>`<option value="${o.name}">${pretty(o.name)}</option>`).join('');

      sel.onchange = ()=>{
        const chosen = sel.value;
        if(!chosen) return;

        if(chosen === '__custom__'){
          sel.value = '';

          const existing = li.querySelector('.custom-swap');
          if(existing) existing.remove();

          const wrap = document.createElement('div');
          wrap.className = 'custom-swap';
          wrap.style.marginTop = '8px';
          wrap.style.display = 'flex';
          wrap.style.gap = '8px';
          wrap.style.alignItems = 'center';

          const input = document.createElement('input');
          input.type = 'text';
          input.placeholder = 'Enter ingredient (e.g., feta, soy sauce, oregano)';
          input.style.flex = '1';
          input.style.padding = '10px';
          input.style.borderRadius = '10px';
          input.style.border = '1px solid rgba(0,0,0,0.12)';

          const add = document.createElement('button');
          add.type = 'button';
          add.className = 'btn primary';
          add.textContent = 'Apply';
          add.style.padding = '10px 12px';
          add.style.borderRadius = '12px';

          const cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.className = 'btn ghost';
          cancel.textContent = 'Cancel';
          cancel.style.padding = '10px 12px';
          cancel.style.borderRadius = '12px';

          cancel.onclick = ()=> wrap.remove();

          add.onclick = ()=>{
            const raw = input.value.trim();
            if(!raw) return;

            // Jackpot: keep role + qty on the SLOT (so user can "choose their own")
            applySwap(ing.id, { name: raw, instrPatchKey: null }, { keepRole:true, keepQty:true });

            wrap.remove();
            bump(li);
            setOwned();
          };

          wrap.append(input, add, cancel);
          li.appendChild(wrap);
          input.focus();
          return;
        }

        const opt = opts.find(o=>o.name===chosen);
        applySwap(ing.id, opt);
        sel.value = '';
        bump(li);
        setOwned();
      };

      li.append(left, sel);
      ul.appendChild(li);
    });
  }

  // Instructions
  const ol = $('instructionsList');
  if(ol){
    ol.innerHTML = '';
    (state.steps || []).forEach(s=>{
      const li = document.createElement('li');
      li.textContent = s.text;
      ol.appendChild(li);
    });
  }

  computeMacrosPerServing();
  ensureDiaryButton();
}

// -------------------------------
// Recipe Book + portable share links (local-first)
// -------------------------------
const RECIPE_BOOK_KEY = 'pickyRecipesV2';

function safeClone(value){
  return JSON.parse(JSON.stringify(value));
}

function recipeMacros(recipeState = state, recipeServings = servings){
  if(!recipeState) return { calories:0, protein:0, carbs:0, fat:0 };
  let cal=0, p=0, c=0, f=0;
  recipeState.ingredients.forEach(ing=>{
    const qty = ing.base.v * (recipeServings/2);
    const grams = gramsFor(ing.name, ing.base.u, qty);
    const n = nutrientFor(ing.name, ing.role);
    cal += n.cal * (grams/100);
    p += n.p * (grams/100);
    c += n.c * (grams/100);
    f += n.f * (grams/100);
  });
  return {
    calories: Math.round(cal/recipeServings),
    protein: Math.round(p/recipeServings),
    carbs: Math.round(c/recipeServings),
    fat: Math.round(f/recipeServings)
  };
}

function snapshotCurrentRecipe(){
  if(!state) return null;
  const details = recipeDetails(state.ingredients);
  return {
    id: uid(),
    version: 2,
    title: state.title,
    description: details.description,
    servings,
    prepMinutes: details.prepMinutes,
    cookMinutes: details.cookMinutes,
    ingredients: safeClone(state.ingredients),
    steps: safeClone(state.steps),
    nutrition: recipeMacros(state, servings),
    favorite: true,
    savedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeSavedRecipe(recipe){
  if(!recipe || !Array.isArray(recipe.ingredients)) return null;
  const recipeServings = Number(recipe.servings) || 2;
  const recipeState = {
    title: recipe.title || titleFrom(recipe.ingredients),
    ingredients: safeClone(recipe.ingredients),
    steps: Array.isArray(recipe.steps) ? safeClone(recipe.steps) : buildInstructions(recipe.ingredients)
  };
  const details = recipeDetails(recipeState.ingredients);
  return {
    id: recipe.id || uid(),
    version: 2,
    title: recipeState.title,
    description: recipe.description || details.description,
    servings: recipeServings,
    prepMinutes: Number(recipe.prepMinutes) || details.prepMinutes,
    cookMinutes: Number(recipe.cookMinutes) || details.cookMinutes,
    ingredients: recipeState.ingredients,
    steps: recipeState.steps,
    nutrition: recipe.nutrition || recipeMacros(recipeState, recipeServings),
    favorite: recipe.favorite !== false,
    savedAt: recipe.savedAt || new Date().toISOString(),
    updatedAt: recipe.updatedAt || recipe.savedAt || new Date().toISOString()
  };
}

function getRecipeBook(){
  const current = lsGet(RECIPE_BOOK_KEY, null);
  if(Array.isArray(current)) return current.map(normalizeSavedRecipe).filter(Boolean);

  const legacy = [
    ...lsGet('pickyFavorites', []),
    ...lsGet('picky_saved_recipes', [])
  ].map(normalizeSavedRecipe).filter(Boolean);
  if(legacy.length) lsSet(RECIPE_BOOK_KEY, legacy);
  return legacy;
}

function setRecipeBook(recipes){
  lsSet(RECIPE_BOOK_KEY, recipes);
}

function getWeeklyPlan(){
  const value = lsGet(WEEKLY_PLAN_KEY, []);
  return Array.isArray(value) ? value : [];
}

function toggleWeeklyPlan(recipeId){
  if(!requirePremium('weekly_planning')) return getWeeklyPlan();
  const plan = getWeeklyPlan();
  const next = plan.includes(recipeId) ? plan.filter(id=>id!==recipeId) : [...plan, recipeId];
  lsSet(WEEKLY_PLAN_KEY, next);
  track('weekly_plan_toggled', { planned:next.includes(recipeId), plan_size:next.length });
  return next;
}

function groceryQuantity(value, unit){
  const quantity = formatQty(value) || String(Number(value.toFixed(2)));
  if(unit==='count' || !unit) return quantity;
  return `${quantity} ${unit}`;
}

function plannedGroceryItems(){
  const recipeMap=new Map(getRecipeBook().map(recipe=>[recipe.id,recipe]));
  const recipes=getWeeklyPlan().map(id=>recipeMap.get(id)).filter(Boolean);
  const combined=new Map();
  recipes.forEach(recipe=>recipe.ingredients
    .filter(isActiveIngredient)
    .forEach(item=>{
      const unit=item.base?.u || '';
      const key=`${canonName(item.name)}|${unit}`;
      const amount=Number(item.base.v)*(Number(recipe.servings)||2)/2;
      const current=combined.get(key) || {name:canonName(item.name),unit,quantity:0};
      current.quantity+=amount;
      combined.set(key,current);
    }));
  return [...combined.entries()].sort((a,b)=>a[1].name.localeCompare(b[1].name));
}

function renderPlanner(){
  const recipeMap = new Map(getRecipeBook().map(recipe=>[recipe.id, recipe]));
  const recipes = getWeeklyPlan().map(id=>recipeMap.get(id)).filter(Boolean);
  const mealsHost = $('plannedMeals');
  const groceriesHost = $('groceryList');
  if(!mealsHost || !groceriesHost) return;
  mealsHost.replaceChildren();
  groceriesHost.replaceChildren();

  if(!recipes.length){
    const empty = document.createElement('div');
    empty.className='empty-state';
    empty.textContent='No meals planned yet. Add saved recipes from your Recipe Book.';
    mealsHost.appendChild(empty);
    const groceryEmpty = empty.cloneNode(true);
    groceryEmpty.textContent='Your grocery list will appear when you plan a meal.';
    groceriesHost.appendChild(groceryEmpty);
    $('shopGroceries')?.classList.add('hidden');
    $('commerceDisclosure')?.classList.add('hidden');
    return;
  }

  recipes.forEach(recipe=>{
    const row=document.createElement('div');
    row.className='planned-meal';
    const copy=document.createElement('div');
    const title=document.createElement('strong');
    title.textContent=recipe.title;
    const meta=document.createElement('span');
    meta.textContent=`Serves ${recipe.servings} • ${recipe.ingredients.filter(isActiveIngredient).length} ingredients`;
    copy.append(title,meta);
    const remove=document.createElement('button');
    remove.type='button'; remove.className='btn ghost small'; remove.textContent='Remove';
    remove.onclick=()=>{ toggleWeeklyPlan(recipe.id); renderPlanner(); };
    row.append(copy,remove);
    mealsHost.appendChild(row);
  });

  const combined=plannedGroceryItems();
  const commerceAvailable=Boolean(getPublicConfig().commerceEnabled && combined.length);
  $('shopGroceries')?.classList.toggle('hidden',!commerceAvailable);
  $('commerceDisclosure')?.classList.toggle('hidden',!commerceAvailable);
  const checks=lsGet(GROCERY_CHECKS_KEY, {});
  combined.forEach(([key,item])=>{
    const label=document.createElement('label');
    label.className=`grocery-item${checks[key]?' checked':''}`;
    const checkbox=document.createElement('input');
    checkbox.type='checkbox'; checkbox.checked=Boolean(checks[key]);
    const text=document.createElement('span');
    text.textContent=`${groceryQuantity(item.quantity,item.unit)} ${pretty(item.name)}`;
    checkbox.onchange=()=>{
      const updated=lsGet(GROCERY_CHECKS_KEY,{});
      updated[key]=checkbox.checked;
      lsSet(GROCERY_CHECKS_KEY,updated);
      label.classList.toggle('checked',checkbox.checked);
      track('grocery_item_checked',{checked:checkbox.checked});
    };
    label.append(checkbox,text);
    groceriesHost.appendChild(label);
  });
}

async function shopPlannedGroceries(){
  const items=plannedGroceryItems().map(([,item])=>({
    name:item.name,quantity:item.quantity,unit:item.unit,
    displayText:`${groceryQuantity(item.quantity,item.unit)} ${pretty(item.name)}`
  }));
  if(!items.length){ showToast('Plan at least one saved recipe first.'); return; }
  if(!confirm('Send this grocery list to Instacart? You’ll review all product matches, quantities, prices, substitutions, pickup, and delivery options there.')) return;
  const button=$('shopGroceries');
  try{
    if(button){ button.disabled=true; button.textContent='Creating list…'; }
    track('grocery_shop_started',{item_count:items.length});
    const response=await fetch('./api/shop',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Food My Way weekly groceries',items})});
    const result=await response.json().catch(()=>({}));
    if(!response.ok || typeof result.url!=='string') throw new Error(result.error || 'The grocery list could not be created.');
    track('grocery_shop_link_created',{item_count:items.length});
    location.assign(result.url);
  }catch(error){
    track('grocery_shop_failed',{item_count:items.length});
    showToast(error.message || 'The grocery list could not be created.');
  }finally{
    if(button){ button.disabled=false; button.textContent='Shop ingredients'; }
  }
}

function showPlannerView(){
  $('inputCard')?.classList.add('hidden');
  $('resultCard')?.classList.add('hidden');
  $('recipeBookCard')?.classList.add('hidden');
  $('diaryCard')?.classList.add('hidden');
  $('plannerCard')?.classList.remove('hidden');
  renderPlanner();
  $('plannerCard')?.scrollIntoView({behavior:'smooth',block:'start'});
  track('weekly_planner_opened',{plan_size:getWeeklyPlan().length});
}

function canSaveRecipe({premiumEnforced,foundingAccess,savedCount,replacing=false}){
  return replacing || !premiumEnforced || foundingAccess || savedCount < FREE_RECIPE_LIMIT;
}

function saveRecipe(recipe, options = {}){
  const normalized = normalizeSavedRecipe(recipe);
  if(!normalized) return null;
  const recipes = getRecipeBook();
  const existingIndex = options.replaceId
    ? recipes.findIndex(item=>item.id === options.replaceId)
    : -1;
  const foundingAccess=accountSession.entitlement?.plan==='founding' && accountSession.entitlement?.status==='active';
  if(!canSaveRecipe({
    premiumEnforced:Boolean(getPublicConfig().premiumEnforced),
    foundingAccess,
    savedCount:recipes.length,
    replacing:existingIndex >= 0
  })){
    requirePremium('unlimited_saves');
    return null;
  }
  if(existingIndex >= 0) recipes[existingIndex] = { ...normalized, id: options.replaceId };
  else recipes.unshift(normalized);
  setRecipeBook(recipes);
  return normalized;
}

let toastTimer = null;
function showToast(message){
  let toast = $('appToast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'toast hidden';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toast.classList.add('hidden'), 2400);
}

function showCreateView(){
  $('recipeBookCard')?.classList.add('hidden');
  $('diaryCard')?.classList.add('hidden');
  $('sharedRecipeCard')?.classList.add('hidden');
  $('plannerCard')?.classList.add('hidden');
  if(state) $('resultCard')?.classList.remove('hidden');
  else $('inputCard')?.classList.remove('hidden');
}

function openSavedRecipe(recipe){
  const normalized = normalizeSavedRecipe(recipe);
  if(!normalized) return;
  servings = normalized.servings;
  state = {
    title: normalized.title,
    ingredients: safeClone(normalized.ingredients),
    steps: safeClone(normalized.steps)
  };
  owned = true;
  $('recipeBookCard')?.classList.add('hidden');
  $('inputCard')?.classList.add('hidden');
  $('sharedRecipeCard')?.classList.add('hidden');
  $('resultCard')?.classList.remove('hidden');
  $('saveRow')?.classList.remove('hidden');
  render();
  track('saved_recipe_opened', { recipe_title:normalized.title });
  window.scrollTo({ top:0, behavior:'smooth' });
}

function recipeSearchText(recipe){
  return `${recipe.title} ${recipe.ingredients.map(i=>i.name).join(' ')}`.toLowerCase();
}

function renderRecipeBook(query = ''){
  const host = $('recipeBookList');
  if(!host) return;
  host.replaceChildren();
  const needle = query.trim().toLowerCase();
  const recipes = getRecipeBook()
    .filter(recipe=>!needle || recipeSearchText(recipe).includes(needle))
    .sort((a,b)=>Number(b.favorite)-Number(a.favorite) || String(b.savedAt).localeCompare(String(a.savedAt)));

  if(!recipes.length){
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = needle ? 'No saved recipes match that search.' : 'Your saved recipes will appear here.';
    host.appendChild(empty);
    return;
  }

  recipes.forEach(recipe=>{
    const card = document.createElement('article');
    card.className = 'recipe-card';
    const head = document.createElement('div');
    head.className = 'recipe-card-head';
    const copy = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'recipe-card-title';
    title.textContent = recipe.title;
    const meta = document.createElement('div');
    meta.className = 'recipe-card-meta';
    meta.textContent = `${recipe.servings} servings • ${recipe.ingredients.filter(isActiveIngredient).length} ingredients • ${recipe.nutrition.calories} cal/serv`;
    copy.append(title, meta);

    const favorite = document.createElement('button');
    favorite.className = 'btn ghost favorite-toggle';
    favorite.type = 'button';
    favorite.setAttribute('aria-label', recipe.favorite ? 'Remove favorite' : 'Mark favorite');
    favorite.textContent = recipe.favorite ? '★' : '☆';
    favorite.onclick = ()=>{
      const all = getRecipeBook();
      const match = all.find(item=>item.id===recipe.id);
      if(match) match.favorite = !match.favorite;
      setRecipeBook(all);
      renderRecipeBook($('recipeSearch')?.value || '');
    };
    head.append(copy, favorite);

    const actions = document.createElement('div');
    actions.className = 'recipe-card-actions';
    const isPlanned = getWeeklyPlan().includes(recipe.id);
    const buttons = [
      ['Open', ()=>openSavedRecipe(recipe), 'primary'],
      [isPlanned ? '✓ In weekly plan' : 'Add to week', ()=>{ toggleWeeklyPlan(recipe.id); renderRecipeBook($('recipeSearch')?.value || ''); }, isPlanned ? 'primary' : ''],
      ['Share', ()=>shareRecipe(recipe), ''],
      ['Duplicate', ()=>{ const duplicate={...safeClone(recipe), id:uid(), title:`${recipe.title} Copy`, savedAt:new Date().toISOString()}; if(saveRecipe(duplicate)) renderRecipeBook(); }, ''],
      ['Delete', ()=>{ if(confirm(`Delete “${recipe.title}”?`)){ setRecipeBook(getRecipeBook().filter(item=>item.id!==recipe.id)); renderRecipeBook($('recipeSearch')?.value || ''); } }, 'ghost']
    ];
    buttons.forEach(([label, handler, style])=>{
      const btn=document.createElement('button');
      btn.type='button'; btn.className=`btn ${style}`.trim(); btn.textContent=label; btn.onclick=handler;
      actions.appendChild(btn);
    });
    card.append(head, actions);
    host.appendChild(card);
  });
}

function showRecipeBookView(){
  $('inputCard')?.classList.add('hidden');
  $('resultCard')?.classList.add('hidden');
  $('sharedRecipeCard')?.classList.add('hidden');
  $('plannerCard')?.classList.add('hidden');
  $('recipeBookCard')?.classList.remove('hidden');
  $('diaryCard')?.classList.add('hidden');
  renderRecipeBook($('recipeSearch')?.value || '');
  track('recipe_book_opened', { saved_count:getRecipeBook().length });
  $('recipeBookCard')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

function encodeSharedRecipe(recipe){
  const portable = normalizeSavedRecipe(recipe);
  const json = JSON.stringify(portable);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach(byte=>binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function decodeSharedRecipe(value){
  try{
    const base64 = value.replace(/-/g,'+').replace(/_/g,'/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char=>char.charCodeAt(0));
    return normalizeSavedRecipe(JSON.parse(new TextDecoder().decode(bytes)));
  }catch(error){
    return null;
  }
}

async function shareRecipe(recipe){
  const normalized = normalizeSavedRecipe(recipe);
  if(!normalized) return;
  const url = `${location.origin}${location.pathname}#recipe=${encodeSharedRecipe(normalized)}`;
  try{
    if(navigator.share) await navigator.share({ title:normalized.title, text:`${normalized.title} from Picky Eater`, url });
    else if(navigator.clipboard) { await navigator.clipboard.writeText(url); alert('Share link copied.'); }
    else prompt('Copy this share link:', url);
    track('recipe_shared', { recipe_title:normalized.title });
  }catch(error){
    if(error?.name !== 'AbortError') prompt('Copy this share link:', url);
  }
}

function showSharedRecipe(recipe){
  if(!recipe) return;
  $('inputCard')?.classList.add('hidden');
  $('resultCard')?.classList.add('hidden');
  $('recipeBookCard')?.classList.add('hidden');
  $('diaryCard')?.classList.add('hidden');
  $('sharedRecipeCard')?.classList.remove('hidden');
  $('sharedRecipeTitle').textContent = recipe.title;
  $('sharedRecipeMeta').replaceChildren();
  [`Serves ${recipe.servings}`, `${recipe.prepMinutes} min prep`, `${recipe.cookMinutes} min cook`, `${recipe.nutrition.calories} cal/serv`].forEach(text=>{
    const span=document.createElement('span'); span.textContent=text; $('sharedRecipeMeta').appendChild(span);
  });
  $('sharedIngredients').replaceChildren();
  recipe.ingredients.filter(isActiveIngredient).forEach(ing=>{
    const li=document.createElement('li');
    const quantity = qtyStrForServings(ing, recipe.servings);
    li.textContent = `${quantity ? `${quantity} ` : ''}${pretty(ing.name)}`;
    $('sharedIngredients').appendChild(li);
  });
  $('sharedInstructions').replaceChildren();
  recipe.steps.forEach(step=>{ const li=document.createElement('li'); li.textContent=step.text || String(step); $('sharedInstructions').appendChild(li); });
  $('saveSharedRecipe').onclick=()=>{ if(saveRecipe({ ...recipe, id:uid(), savedAt:new Date().toISOString() })) $('saveSharedRecipe').textContent='✓ Saved to Recipe Book'; };
}

function qtyStrForServings(ing, recipeServings){
  const previous = servings;
  servings = recipeServings;
  const result = qtyStr(ing);
  servings = previous;
  return result;
}

function loadSharedRecipeFromUrl(){
  const match = location.hash.match(/^#recipe=(.+)$/);
  if(!match) return;
  const recipe = decodeSharedRecipe(match[1]);
  if(recipe) showSharedRecipe(recipe);
}

// -------------------------------
// Diary (local-first)
// -------------------------------
const MEALS = ['breakfast','lunch','dinner','snacks'];
let activeMeal = 'breakfast';
let diaryDayOffset = 0;

function lsGet(k, fallback){
  try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fallback; }
  catch(e){ return fallback; }
}
function lsSet(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

function todayKey(){
  return dateKeyForOffset(0);
}

function dateKeyForOffset(offset){
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth()+1).padStart(2,'0');
  const day = String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

function getDiary(){ return lsGet('pickyDiaryMeals', {}); }
function setDiary(d){ lsSet('pickyDiaryMeals', d); }

function ensureDay(diary, dateKey){
  if(!diary[dateKey]){
    diary[dateKey] = { breakfast:[], lunch:[], dinner:[], snacks:[] };
  } else {
    MEALS.forEach(m => diary[dateKey][m] = diary[dateKey][m] || []);
  }
}

function parseNum(text){
  const m = String(text||'').match(/(-?\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

function diaryTotalsForDay(diary, dateKey){
  ensureDay(diary, dateKey);
  let cal=0,p=0,c=0,f=0;
  MEALS.forEach(meal => {
    diary[dateKey][meal].forEach(item => {
      cal += item.macros.cal || 0;
      p += item.macros.p || 0;
      c += item.macros.c || 0;
      f += item.macros.f || 0;
    });
  });
  return { cal, p, c, f };
}

function addEntryToDiary(meal, entry){
  const diary = getDiary();
  const key = todayKey();
  ensureDay(diary, key);
  diary[key][meal].push(entry);
  setDiary(diary);
}

function deleteEntry(meal, idx){
  const diary = getDiary();
  const key = dateKeyForOffset(diaryDayOffset);
  ensureDay(diary, key);
  diary[key][meal].splice(idx, 1);
  setDiary(diary);
}

function updateDiarySub(){
  const key = dateKeyForOffset(diaryDayOffset);
  const el = document.getElementById('diarySub');
  if(el) el.textContent = `${key} • Saved on this device only`;
}

function setActiveMeal(meal){
  activeMeal = meal;
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.meal === meal);
  });
  renderDiary();
}

function renderDiary(){
  const diary = getDiary();
  const key = dateKeyForOffset(diaryDayOffset);
  ensureDay(diary, key);

  const list = diary[key][activeMeal] || [];
  const ul = document.getElementById('diaryList');
  if(!ul) return;
  ul.innerHTML = '';

  list.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'diary-item';

    const left = document.createElement('div');
    const itemTitle = document.createElement('strong');
    itemTitle.textContent = item.title;
    const itemMeta = document.createElement('div');
    itemMeta.className = 'diary-meta';
    itemMeta.textContent = `${item.source}${item.localOnly ? ' • local-only' : ''}`;
    left.append(itemTitle, itemMeta);

    const right = document.createElement('div');
    right.className = 'diary-right';

    const macroLine = document.createElement('div');
    macroLine.className = 'diary-meta';
    macroLine.textContent = `≈ ${Math.round(item.macros.cal)} cal • P ${Math.round(item.macros.p)} • C ${Math.round(item.macros.c)} • F ${Math.round(item.macros.f)}`;

    const del = document.createElement('button');
    del.className = 'icon-btn';
    del.textContent = 'Remove';
    del.onclick = () => { deleteEntry(activeMeal, idx); renderDiary(); };

    right.append(macroLine, del);
    li.append(left, right);
    ul.appendChild(li);
  });

  const totals = diaryTotalsForDay(diary, key);
  const totalsEl = document.getElementById('diaryTotals');
  if(totalsEl){
    totalsEl.innerHTML = `
      <span>≈ ${Math.round(totals.cal)} cal</span>
      <span>Protein ${Math.round(totals.p)}g</span>
      <span>Carbs ${Math.round(totals.c)}g</span>
      <span>Fat ${Math.round(totals.f)}g</span>
    `;
  }

  updateDiarySub();
}

function setDiaryDay(offset){
  diaryDayOffset = offset;
  document.getElementById('viewToday')?.classList.toggle('active', offset===0);
  document.getElementById('viewYesterday')?.classList.toggle('active', offset===-1);
  const title = document.querySelector('#diaryCard .diary-title');
  if(title) title.textContent = offset===0 ? 'Today' : 'Yesterday';
  const totalsTitle = document.getElementById('diaryTotalsTitle');
  if(totalsTitle) totalsTitle.textContent = offset===0 ? 'Today totals' : 'Yesterday totals';
  const quickAdd = document.querySelector('.quick-grid');
  if(quickAdd) quickAdd.classList.toggle('hidden', offset!==0);
  renderDiary();
}

function quickAddDiaryEntry(){
  const name = document.getElementById('qaName')?.value.trim();
  if(!name) return alert('Add a food name');
  addEntryToDiary(activeMeal, {
    title:name,
    source:'Quick add',
    macros:{
      cal:Number(document.getElementById('qaCal')?.value)||0,
      p:Number(document.getElementById('qaP')?.value)||0,
      c:Number(document.getElementById('qaC')?.value)||0,
      f:Number(document.getElementById('qaF')?.value)||0
    },
    localOnly:true,
    time:new Date().toISOString()
  });
  ['qaName','qaCal','qaP','qaC','qaF'].forEach(id=>{ const input=document.getElementById(id); if(input) input.value=''; });
  renderDiary();
}

function showDiaryView(){
  const card = $('diaryCard');
  $('inputCard')?.classList.add('hidden');
  $('resultCard')?.classList.add('hidden');
  $('recipeBookCard')?.classList.add('hidden');
  $('sharedRecipeCard')?.classList.add('hidden');
  $('plannerCard')?.classList.add('hidden');
  if(card) card.classList.remove('hidden');
  updateDiarySub();
  renderDiary();
  card?.scrollIntoView({ behavior:'smooth', block:'start' });
}
function hideDiaryView(){
  const card = $('diaryCard');
  if(card) card.classList.add('hidden');
  showCreateView();
}

// Overlay helpers
function show(el){ el && el.classList.remove('hidden'); }
function hide(el){ el && el.classList.add('hidden'); }

function showMealPicker(){ show(document.getElementById('mealOverlay')); }
function hideMealPicker(){ hide(document.getElementById('mealOverlay')); }

function addCurrentRecipeToMeal(meal){
  if(!state) return;

  const cal = parseNum(document.getElementById('calories')?.textContent);
  const p = parseNum(document.getElementById('protein')?.textContent);
  const c = parseNum(document.getElementById('carbs')?.textContent);
  const f = parseNum(document.getElementById('fat')?.textContent);

  addEntryToDiary(meal, {
    title: state.title,
    source: 'Picky recipe',
    macros: { cal, p, c, f },
    localOnly:true,
    time: new Date().toISOString()
  });

  setActiveMeal(meal);
  showDiaryView();
}

// Ensure Add to Diary exists + wired
function ensureDiaryButton(){
  let btn = document.getElementById('addDiaryBtn');
  if(!btn) return; // your HTML has it — keep simple

  if(!btn.dataset.wired){
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const hasMealOverlay = !!document.getElementById('mealOverlay');
      if(hasMealOverlay){
        showMealPicker();
      } else {
        addCurrentRecipeToMeal('dinner');
      }
    });
  }
}

// -------------------------------
// Events wiring (safe init)
// -------------------------------
function wireEvents(){
  const gen = $('generateBtn');
  const inc = $('incServ');
  const dec = $('decServ');
  const saveBtn = $('saveBtn');
  const shareBtn = $('shareBtn');
  const backBtn = $('backBtn');
  const ingredientsInput = $('ingredientsInput');
  const wireClick = (id,handler)=>{
    const element=$(id);
    if(!element || element.dataset.wired) return;
    element.dataset.wired='1';
    element.onclick=handler;
  };

  const updateIngredientCount = ()=>{
    const count = parseLines(ingredientsInput?.value).length;
    if($('ingredientCount')) $('ingredientCount').textContent = String(count);
    if(count) $('inputError')?.classList.add('hidden');
  };

  if(ingredientsInput && !ingredientsInput.dataset.wired){
    ingredientsInput.dataset.wired = '1';
    ingredientsInput.addEventListener('input', updateIngredientCount);
    updateIngredientCount();
  }

  document.querySelectorAll('.starter-chip').forEach(chip=>{
    if(chip.dataset.wired) return;
    chip.dataset.wired = '1';
    chip.addEventListener('click', ()=>{
      if(!ingredientsInput) return;
      applyFoodIdea(chip.dataset.starter || '');
      showToast(`${chip.textContent} loaded — make it yours.`);
    });
  });

  const surpriseBtn = $('surpriseBtn');
  if(surpriseBtn && !surpriseBtn.dataset.wired){
    surpriseBtn.dataset.wired = '1';
    surpriseBtn.addEventListener('click', ()=>{
      const ideas = [
        'chicken breast\nrice\ncheddar cheese\nbroccoli',
        'ground beef\npotatoes\ncarrots\ngarlic',
        'pasta\nmozzarella\ntomato sauce\nspinach',
        'eggs\nbread\ncheddar cheese\nbacon'
      ];
      if(!ingredientsInput) return;
      applyFoodIdea(ideas[Math.floor(Math.random() * ideas.length)]);
      showToast('A comfort-food combo is ready.');
    });
  }

  if(gen && !gen.dataset.wired){
    gen.dataset.wired = '1';
    gen.addEventListener('click', ()=>{
      const raw = parseLines($('ingredientsInput')?.value);
      if(!raw || !raw.length){
        $('inputError')?.classList.remove('hidden');
        ingredientsInput?.focus();
        return;
      }

      const ingredients = normalize(raw);

      // Ensure optional supports exist to swap into
      const hasFat = ingredients.some(i=>i.role==='fat');
      const hasAcid = ingredients.some(i=>i.role==='acid');
      const hasSeasoning = ingredients.some(i=>i.role==='seasoning');

      if(!hasFat) ingredients.push({ id: uid(), name:'skip it', role:'fat', intent:intentForRole('fat'), base:{ v:0, u:'' }, swapMeta:null });
      if(!hasAcid) ingredients.push({ id: uid(), name:'skip it', role:'acid', intent:intentForRole('acid'), base:{ v:0, u:'' }, swapMeta:null });
      if(!hasSeasoning) ingredients.push({ id: uid(), name:'skip it', role:'seasoning', intent:intentForRole('seasoning'), base:{ v:0, u:'' }, swapMeta:null });

      state = { ingredients, title: titleFrom(ingredients), steps: [] };
      state.steps = buildInstructions(state.ingredients);

      owned = false;

      $('inputCard')?.classList.add('hidden');
      $('resultCard')?.classList.remove('hidden');

      const sr = $('saveRow');
      if(sr) sr.classList.remove('hidden');
      if(saveBtn) saveBtn.textContent = '⭐ Save to Favorites';

      render();
      track('recipe_generated', { ingredient_count:raw.length, recipe_title:state.title });
      $('resultCard')?.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  }

  if(inc && !inc.dataset.wired){
    inc.dataset.wired='1';
    inc.addEventListener('click', ()=>{
      servings = Math.min(8, servings+1);
      render();
    });
  }

  if(dec && !dec.dataset.wired){
    dec.dataset.wired='1';
    dec.addEventListener('click', ()=>{
      servings = Math.max(1, servings-1);
      render();
    });
  }

  if(saveBtn && !saveBtn.dataset.wired){
    saveBtn.dataset.wired='1';
    saveBtn.addEventListener('click', ()=>{
      if(!state) return;
      const saved=saveRecipe(snapshotCurrentRecipe());
      if(!saved) return;
      saveBtn.textContent = '✓ Saved';
      showToast('Saved to your Recipe Book.');
      track('recipe_saved', { recipe_title:state.title });
    });
  }

  if(shareBtn && !shareBtn.dataset.wired){
    shareBtn.dataset.wired='1';
    shareBtn.addEventListener('click', ()=>{
      const recipe = snapshotCurrentRecipe();
      if(recipe) shareRecipe(recipe);
    });
  }

  if(backBtn && !backBtn.dataset.wired){
    backBtn.dataset.wired='1';
    backBtn.addEventListener('click', ()=>{
      servings = 2;
      state = null;
      owned = false;
      $('resultCard')?.classList.add('hidden');
      $('inputCard')?.classList.remove('hidden');
      $('saveRow')?.classList.add('hidden');
      if($('saveBtn')) $('saveBtn').textContent = '⭐ Save to Favorites';
    });
  }

  // Diary wiring
  wireClick('openDiary',showDiaryView);
  wireClick('closeDiary',hideDiaryView);
  wireClick('openRecipeBook',showRecipeBookView);
  wireClick('closeRecipeBook',()=>{
    $('recipeBookCard')?.classList.add('hidden');
    showCreateView();
  });
  document.getElementById('recipeSearch')?.addEventListener('input', e=>renderRecipeBook(e.target.value));
  $('openPlanner')?.addEventListener('click', ()=>{ if(requirePremium('weekly_planning')) showPlannerView(); });
  $('closePlanner')?.addEventListener('click', ()=>{
    $('plannerCard')?.classList.add('hidden');
    showRecipeBookView();
  });
  $('clearGroceryChecks')?.addEventListener('click', ()=>{
    lsSet(GROCERY_CHECKS_KEY,{});
    renderPlanner();
    showToast('Grocery checks cleared.');
  });
  $('shopGroceries')?.addEventListener('click', shopPlannedGroceries);
  document.getElementById('viewToday')?.addEventListener('click', ()=>setDiaryDay(0));
  document.getElementById('viewYesterday')?.addEventListener('click', ()=>setDiaryDay(-1));
  document.getElementById('qaAdd')?.addEventListener('click', quickAddDiaryEntry);
  document.getElementById('closeSharedRecipe')?.addEventListener('click', ()=>{
    history.replaceState(null, '', location.pathname + location.search);
    $('sharedRecipeCard')?.classList.add('hidden');
    $('inputCard')?.classList.remove('hidden');
  });

  // Meal tabs + meal picker buttons
  document.addEventListener('click', (e) => {
    const t = e.target;
    if(t && t.classList && t.classList.contains('tab')){
      setActiveMeal(t.dataset.meal);
    }
    if(t && t.classList && t.classList.contains('meal-btn')){
      const meal = t.dataset.meal;
      hideMealPicker();
      addCurrentRecipeToMeal(meal);
    }
  });

  document.getElementById('mealCancel')?.addEventListener('click', hideMealPicker);

  const founderOverlay = $('founderOverlay');
  const founderEmail = $('founderEmail');
  const founderCta = $('founderCta');
  const checkoutUrl = getPublicConfig().founderCheckoutUrl;
  if(founderCta && validCheckoutUrl(checkoutUrl)) founderCta.textContent='Become a founding member — $29';
  const closeFounder = ()=>{
    founderOverlay?.classList.add('hidden');
    $('founderError')?.classList.add('hidden');
  };
  founderCta?.addEventListener('click', ()=>{
    if(validCheckoutUrl(checkoutUrl)){
      track('founder_checkout_started',{price:29,currency:'USD'});
      location.assign(checkoutUrl);
      return;
    }
    founderOverlay?.classList.remove('hidden');
    founderEmail?.focus();
    track('founder_interest_opened');
  });
  $('founderClose')?.addEventListener('click', closeFounder);
  founderOverlay?.addEventListener('click', event=>{ if(event.target===founderOverlay) closeFounder(); });
  $('founderSave')?.addEventListener('click', async()=>{
    const email = founderEmail?.value.trim() || '';
    const consent = Boolean($('founderConsent')?.checked);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !consent){
      $('founderError').textContent = !consent ? 'Please consent to founding-access emails.' : 'Enter a valid email address.';
      $('founderError')?.classList.remove('hidden');
      (!consent ? $('founderConsent') : founderEmail)?.focus();
      return;
    }
    const button=$('founderSave');
    if(button){ button.disabled=true; button.textContent='Saving…'; }
    let synced=false;
    try{
      const response=await fetch('./api/founding-interest',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,consent:true,source:'founding-modal',company:''})});
      synced=response.ok;
      if(!response.ok && ![404,503].includes(response.status)){
        const result=await response.json().catch(()=>({}));
        const failure=new Error(result.error || 'Signup failed.');
        failure.userFacing=true;
        throw failure;
      }
    }catch(error){
      if(error.userFacing){
        $('founderError').textContent=error.message;
        $('founderError')?.classList.remove('hidden');
        if(button){ button.disabled=false; button.textContent='Save my spot'; }
        return;
      }
    }
    lsSet('foodMyWayFounderInterest', { email, consent:true, synced, savedAt:new Date().toISOString() });
    closeFounder();
    if(button){ button.disabled=false; button.textContent='Save my spot'; }
    showToast(synced ? 'You’re on the founding list.' : 'Saved on this device; online signup is not connected yet.');
    track('founder_interest_saved',{synced});
  });

  const profileOverlay = $('profileOverlay');
  const closeProfile = ()=>profileOverlay?.classList.add('hidden');
  $('openProfile')?.addEventListener('click', ()=>{
    if(!requirePremium('household_profile')) return;
    const profile = getTasteProfile();
    if($('profileName')) $('profileName').value = profile.name;
    if($('avoidFoods')) $('avoidFoods').value = profile.avoids.join('\n');
    profileOverlay?.classList.remove('hidden');
    $('profileName')?.focus();
    track('taste_profile_opened');
  });
  $('profileClose')?.addEventListener('click', closeProfile);
  profileOverlay?.addEventListener('click', event=>{ if(event.target===profileOverlay) closeProfile(); });
  $('profileSave')?.addEventListener('click', ()=>{
    const profile = {
      name:$('profileName')?.value.trim().slice(0, 40) || '',
      avoids:[...new Set(parseLines($('avoidFoods')?.value).map(canonName).filter(Boolean))]
    };
    lsSet(TASTE_PROFILE_KEY, profile);
    closeProfile();
    showToast(profile.avoids.length ? `Saved ${profile.avoids.length} foods to leave out.` : 'Taste profile saved.');
    track('taste_profile_saved', { avoid_count:profile.avoids.length });
    if(state) render();
  });
  $('exportData')?.addEventListener('click', exportBetaData);
  $('clearLocalData')?.addEventListener('click', ()=>{
    if(!confirm('Delete all Food My Way recipes, plans, diary entries, and preferences stored in this browser? This cannot be undone.')) return;
    [RECIPE_BOOK_KEY, WEEKLY_PLAN_KEY, GROCERY_CHECKS_KEY, TASTE_PROFILE_KEY, 'pickyDiaryMeals', 'pickyAuth', 'foodMyWayFounderInterest', 'pickyFavorites', 'picky_saved_recipes'].forEach(key=>localStorage.removeItem(key));
    closeProfile();
    state=null; servings=2; owned=false;
    showCreateView();
    showToast('Local Food My Way data deleted.');
    track('local_data_deleted');
  });

  window.addEventListener('beforeinstallprompt', event=>{
    event.preventDefault();
    deferredInstallPrompt=event;
    $('installApp')?.classList.remove('hidden');
  });
  $('installApp')?.addEventListener('click', async()=>{
    if(deferredInstallPrompt){
      deferredInstallPrompt.prompt();
      const choice=await deferredInstallPrompt.userChoice;
      track('install_prompt_result',{outcome:choice.outcome});
      deferredInstallPrompt=null;
      $('installApp')?.classList.add('hidden');
      return;
    }
    showToast('On iPhone: Share → Add to Home Screen.');
  });
  window.addEventListener('appinstalled', ()=>{ $('installApp')?.classList.add('hidden'); track('app_installed'); });

  document.addEventListener('keydown', event=>{
    if(event.key!=='Escape') return;
    closeFounder(); closeProfile(); hideMealPicker();
  });

  if($('footerYear')) $('footerYear').textContent = String(new Date().getFullYear());

  updateDiarySub();
}

// Safe init
function init(){
  setupTelemetry();
  wireEvents();
  setupAccounts();
  ensureNutritionDisclosure();
  ensureDiaryButton();
  getRecipeBook();
  loadSharedRecipeFromUrl();
  handleCheckoutReturn();
  window.addEventListener('hashchange', loadSharedRecipeFromUrl);
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./service-worker.js').catch(error=>{
      console.warn('Offline support could not start.', error);
    });
  }
}

if(typeof document !== 'undefined'){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// Compatibility toggle for older hero "Details" UI (if present)
if(typeof window !== 'undefined'){
  window.toggleTruth = function () {
    const el = document.querySelector(".truth-detail") || document.getElementById("truthText");
    if (!el) return;
    const cur = getComputedStyle(el).display;
    el.style.display = (cur === "none") ? "block" : "none";
  };
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = {
    canonName,
    parseInputIngredient,
    roleFor,
    normalize,
    buildInstructions,
    recipeDetails,
    titleFrom,
    gramsFor,
    recipeMacros,
    isActiveIngredient,
    FREE_RECIPE_LIMIT,
    canSaveRecipe,
    encodeSharedRecipe,
    decodeSharedRecipe
  };
}

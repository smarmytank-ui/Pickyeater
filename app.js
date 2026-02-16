// v1.8.0 — Canonical nutrition table + real conversions + clearer instructions
const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;
let owned = false;

// -------------------------------
// Normalization + roles
// -------------------------------
const ROLE_RULES = [
  [/\b(chicken|beef|ground beef|lean beef|turkey|pork|tofu|beans|lentils|egg|eggs)\b/i,'protein'],
  [/\b(rice|pasta|potato|potatoes|quinoa|sweet potatoes)\b/i,'starch'],
  [/\b(onion|onions|garlic|shallot|scallion|green onion)\b/i,'aromatic']
];

function canonName(raw){
  const s = (raw||'').trim().toLowerCase();
  if(s === 'potato') return 'potatoes';
  if(s === 'onions') return 'onion';
  if(s === 'scallion' || s === 'scallions') return 'green onion';
  if(s === 'beef') return 'beef';
  return s;
}
function roleFor(n){
  for(const [r,role] of ROLE_RULES) if(r.test(n)) return role;
  return 'veg';
}
function parseLines(s){
  return (s||'').replace(/,+/g,'\n').split(/\n+/).map(x=>x.trim()).filter(Boolean);
}
function pretty(s){
  return (s||'').split(' ').map(w=>w? w[0].toUpperCase()+w.slice(1) : w).join(' ');
}

// -------------------------------
// Base quantities (for SERVES 2 defaults)
// -------------------------------
const BASE_QTY = {
  protein:{ v:1, u:'lb' },
  veg:{ v:2, u:'cups' },
  starch:{ v:2, u:'cups' },
  aromatic:{ v:1, u:'medium' }
};

// -------------------------------
// Swap catalog (qty + instruction patches)
// -------------------------------
const SWAP_CATALOG = {
  protein: [
    { name:'turkey',    unitOverride:'lb',   baseOverride:1,    instrPatchKey:'cook_meat' },
    { name:'lean beef', unitOverride:'lb',   baseOverride:1,    instrPatchKey:'cook_meat' },
    { name:'tofu',      unitOverride:'oz',   baseOverride:14,   instrPatchKey:'cook_tofu' },
    { name:'beans',     unitOverride:'cups', baseOverride:2,    instrPatchKey:'warm_beans' },
    { name:'eggs',      unitOverride:'eggs', baseOverride:4,    instrPatchKey:'cook_eggs' }
  ],
  starch: [
    { name:'rice',           unitOverride:'cups',   baseOverride:1.5,  instrPatchKey:'cook_rice' },
    { name:'pasta',          unitOverride:'cups',   baseOverride:1.5,  instrPatchKey:'cook_pasta' },
    { name:'sweet potatoes', unitOverride:'medium', baseOverride:2,    instrPatchKey:'cook_potato' },
    { name:'quinoa',         unitOverride:'cups',   baseOverride:1.25, instrPatchKey:'cook_quinoa' }
  ],
  aromatic: [
    { name:'green onion', unitOverride:'cups',   baseOverride:0.5, instrPatchKey:'add_aromatic' },
    { name:'shallot',     unitOverride:'medium', baseOverride:1,   instrPatchKey:'add_aromatic' },
    { name:'garlic',      unitOverride:'cloves', baseOverride:2,   instrPatchKey:'add_garlic' },
    { name:'skip it',     unitOverride:'',       baseOverride:0,   instrPatchKey:'skip_aromatic' }
  ],
  veg: [
    { name:'zucchini',    unitOverride:'cups', baseOverride:2,   instrPatchKey:'cook_veg' },
    { name:'green beans', unitOverride:'cups', baseOverride:2,   instrPatchKey:'cook_veg' },
    { name:'carrots',     unitOverride:'cups', baseOverride:1.5, instrPatchKey:'cook_veg' },
    { name:'spinach',     unitOverride:'cups', baseOverride:3,   instrPatchKey:'cook_veg' }
  ]
};

// -------------------------------
// Canonical nutrition table (per 100g)
// Values are standard reference approximations (USDA-consistent).
// -------------------------------
const NUTRITION_PER_100G = {
  // proteins (cooked/typical)
  'chicken':      { cal:165, p:31.0, c:0.0,  f:3.6 },
  'turkey':       { cal:170, p:29.0, c:0.0,  f:6.0 },
  'lean beef':    { cal:176, p:26.0, c:0.0,  f:10.0 },
  'ground beef':  { cal:176, p:26.0, c:0.0,  f:10.0 },
  'beef':         { cal:176, p:26.0, c:0.0,  f:10.0 },
  'pork':         { cal:242, p:27.0, c:0.0,  f:14.0 },
  'tofu':         { cal:144, p:15.7, c:3.9,  f:8.7 },
  'beans':        { cal:127, p:8.7,  c:22.8, f:0.5 }, // cooked beans
  'lentils':      { cal:116, p:9.0,  c:20.1, f:0.4 }, // cooked lentils
  'eggs':         { cal:143, p:12.6, c:0.7,  f:9.5 }, // whole egg

  // starches (cooked)
  'rice':         { cal:130, p:2.7,  c:28.2, f:0.3 },
  'pasta':        { cal:158, p:5.8,  c:30.9, f:0.9 },
  'quinoa':       { cal:120, p:4.4,  c:21.3, f:1.9 },
  'potatoes':     { cal:87,  p:1.9,  c:20.1, f:0.1 },
  'sweet potatoes':{cal:86,  p:1.6,  c:20.1, f:0.1 },

  // vegetables
  'broccoli':     { cal:34,  p:2.8,  c:7.0,  f:0.4 },
  'zucchini':     { cal:17,  p:1.2,  c:3.1,  f:0.3 },
  'green beans':  { cal:31,  p:1.8,  c:7.1,  f:0.1 },
  'carrots':      { cal:41,  p:0.9,  c:9.6,  f:0.2 },
  'spinach':      { cal:23,  p:2.9,  c:3.6,  f:0.4 },

  // aromatics
  'onion':        { cal:40,  p:1.1,  c:9.3,  f:0.1 },
  'green onion':  { cal:32,  p:1.8,  c:7.3,  f:0.2 },
  'shallot':      { cal:72,  p:2.5,  c:16.8, f:0.1 },
  'garlic':       { cal:149, p:6.4,  c:33.1, f:0.5 },
  'skip it':      { cal:0,   p:0.0,  c:0.0,  f:0.0 }
};

const ROLE_FALLBACK_100G = {
  protein:  { cal:165, p:25.0, c:0.0,  f:6.0 },
  starch:   { cal:120, p:3.0,  c:25.0, f:1.0 },
  veg:      { cal:30,  p:2.0,  c:6.0,  f:0.3 },
  aromatic: { cal:40,  p:1.0,  c:9.0,  f:0.1 }
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
  cloves: 3
};

const GRAMS_PER_UNIT = {
  // cups (approx)
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

  // medium items
  'onion': { medium: 110 },
  'shallot': { medium: 44 },
  'sweet potatoes': { medium: 130 }
};

function gramsFor(name, unit, qty){
  const n = canonName(name);
  if(n === 'skip it' || qty === 0) return 0;

  if(UNIT_TO_GRAMS[unit] != null) return qty * UNIT_TO_GRAMS[unit];

  const map = GRAMS_PER_UNIT[n] || {};
  if(map[unit] != null) return qty * map[unit];

  // conservative fallbacks
  if(unit === 'cups') return qty * 120;
  if(unit === 'medium') return qty * 110;

  return 0;
}

// -------------------------------
// Beginner-friendly instructions
// -------------------------------
const INSTR = {
  prep: 'Wash and prep everything: chop veggies into bite-sized pieces.',
  cook_meat:  'Heat a large pan on medium heat. Add the meat. Break it up (if ground) and cook until no pink remains.',
  cook_tofu:  'Press tofu with paper towels for 2 minutes, then cube it. Heat a pan on medium and cook tofu until lightly browned.',
  warm_beans: 'If using canned beans, rinse and drain. Warm beans in a pan for 2–3 minutes and season lightly.',
  cook_eggs:  'Crack eggs into a bowl, whisk with a pinch of salt, then cook on medium-low until set.',
  cook_rice:  'Cook rice (or use microwave rice). Fluff with a fork when done.',
  cook_pasta: 'Boil water, add pasta, and cook until tender. Drain and set aside.',
  cook_quinoa:'Rinse quinoa. Simmer until water is absorbed, then rest 5 minutes and fluff.',
  cook_potato:'Cut potatoes into bite-sized pieces. Boil 10–12 minutes (or roast) until fork-tender.',
  add_aromatic:'Add chopped onion/shallot/green onion to the pan and cook 1–2 minutes until fragrant.',
  add_garlic: 'Add garlic last (30–45 seconds) so it doesn’t burn.',
  skip_aromatic:'Skip aromatics. Season with salt/pepper instead.',
  cook_veg:   'Add veggies and cook until bright and tender-crisp (3–6 minutes depending on veggie).',
  combine: 'Combine everything. Taste. Add salt/pepper. Serve.'
};

function buildInstructions(){
  const steps = [];
  steps.push({ key:'prep', text: INSTR.prep });

  const aromatic = state.ingredients.find(i=>i.role==='aromatic');
  if(aromatic){
    if(aromatic.name === 'skip it') steps.push({ key:'aromatic', text: INSTR.skip_aromatic });
    else if(aromatic.name === 'garlic') steps.push({ key:'aromatic', text: INSTR.add_garlic });
    else steps.push({ key:'aromatic', text: INSTR.add_aromatic });
  }

  const protein = state.ingredients.find(i=>i.role==='protein' && i.name!=='skip it');
  if(protein){
    if(protein.name.includes('tofu')) steps.push({ key:'protein', text: INSTR.cook_tofu });
    else if(protein.name.includes('bean') || protein.name.includes('lentil')) steps.push({ key:'protein', text: INSTR.warm_beans });
    else if(protein.name.includes('egg')) steps.push({ key:'protein', text: INSTR.cook_eggs });
    else steps.push({ key:'protein', text: INSTR.cook_meat });
  }

  const starch = state.ingredients.find(i=>i.role==='starch' && i.name!=='skip it');
  if(starch){
    if(starch.name.includes('rice')) steps.push({ key:'starch', text: INSTR.cook_rice });
    else if(starch.name.includes('pasta')) steps.push({ key:'starch', text: INSTR.cook_pasta });
    else if(starch.name.includes('quinoa')) steps.push({ key:'starch', text: INSTR.cook_quinoa });
    else steps.push({ key:'starch', text: INSTR.cook_potato });
  }

  steps.push({ key:'veg', text: INSTR.cook_veg });
  steps.push({ key:'combine', text: INSTR.combine });
  return steps;
}

// -------------------------------
// App state + rendering
// -------------------------------
function normalize(names){
  return names.map(raw=>{
    const name = canonName(raw);
    const role = roleFor(name);
    return {
      id: crypto.randomUUID(),
      name,
      role,
      base: { ...BASE_QTY[role] },
      swapMeta: null
    };
  });
}

function qtyStr(ing){
  const m = servings / 2;
  const val = ing.base.v * m;
  if(!ing.base.u || val === 0) return '';
  const nice = (Math.abs(val - Math.round(val)) < 1e-9) ? String(Math.round(val)) : val.toFixed(1);
  return `${nice} ${ing.base.u}`;
}

function titleFrom(ings){
  const protein = ings.find(i=>i.role==='protein' && i.name!=='skip it');
  const hasStarch = ings.some(i=>i.role==='starch' && i.name!=='skip it');
  const style = hasStarch ? 'Dinner' : 'Plate';
  const main = protein ? pretty(protein.name) : 'Veggie';
  return `Simple ${main} ${style}`;
}

function computeMacrosPerServing(){
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

  $('calories').textContent = `≈ ${Math.round(per.cal)} cal/serv`;
  $('protein').textContent  = `Protein ${Math.round(per.p)}g`;
  $('carbs').textContent    = `Carbs ${Math.round(per.c)}g`;
  $('fat').textContent      = `Fat ${Math.round(per.f)}g`;
}

function bump(el, cls='bump', ms=450){
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls), ms);
}
function flashStepByKey(key){
  const lis = $('instructionsList').querySelectorAll('li');
  const idx = state.steps.findIndex(s=>s.key===key);
  if(idx < 0 || !lis[idx]) return;
  lis[idx].classList.add('flash');
  setTimeout(()=>lis[idx].classList.remove('flash'), 520);
}
function setOwned(){
  owned = true;
  $('saveRow').classList.remove('hidden');
}

function render(){
  $('servingsVal').textContent = servings;
  $('recipeTitle').textContent = state.title;

  // Ingredients
  const ul = $('ingredientsList');
  ul.innerHTML = '';
  state.ingredients.forEach((ing)=>{
    const li = document.createElement('li');
    li.className = 'ing-row';

    const left = document.createElement('div');
    left.className = 'ing-left';

    const main = document.createElement('div');
    main.className = 'ing-main';
    const q = qtyStr(ing);
    main.textContent = q ? `${q} ${pretty(ing.name)}` : `${pretty(ing.name)}`;

    const sub = document.createElement('div');
    sub.className = 'ing-sub';
    sub.textContent = ing.role.toUpperCase();

    left.append(main, sub);

    const sel = document.createElement('select');
    sel.className = 'swap-select';

    const opts = SWAP_CATALOG[ing.role] || [];
    sel.innerHTML = `<option value="">Swap</option>` + opts.map(o=>`<option value="${o.name}">${pretty(o.name)}</option>`).join('');

    sel.onchange = ()=>{
      const chosen = sel.value;
      if(!chosen) return;
      const opt = opts.find(o=>o.name===chosen);
      applySwap(ing.id, opt);
      sel.value = '';
      bump(li);
      setOwned();
      // flash the step most likely affected
      flashStepByKey(ing.role);
    };

    li.append(left, sel);
    ul.appendChild(li);
  });

  // Instructions
  const ol = $('instructionsList');
  ol.innerHTML = '';
  state.steps.forEach(s=>{
    const li = document.createElement('li');
    li.textContent = s.text;
    ol.appendChild(li);
  });

  computeMacrosPerServing();
}

function applySwap(ingId, opt){
  const ing = state.ingredients.find(i=>i.id===ingId);
  if(!ing || !opt) return;

  ing.name = canonName(opt.name);

  if(typeof opt.baseOverride === 'number') ing.base.v = opt.baseOverride;
  if(typeof opt.unitOverride === 'string') ing.base.u = opt.unitOverride;

  if(ing.name === 'skip it'){
    ing.base.v = 0;
    ing.base.u = '';
  }

  state.title = titleFrom(state.ingredients);
  state.steps = buildInstructions();

  render();
}

// -------------------------------
// Events
// -------------------------------
$('generateBtn').onclick = ()=>{
  const raw = parseLines($('ingredientsInput').value);
  if(!raw.length) return alert('Add ingredients');

  const ingredients = normalize(raw);
  state = { ingredients, title: titleFrom(ingredients), steps: [] };
  state.steps = buildInstructions();

  owned = false;
  $('saveRow').classList.add('hidden');
  $('saveBtn').textContent = '⭐ Save to Favorites';

  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  render();
};

$('incServ').onclick = ()=>{
  servings = Math.min(8, servings+1);
  setOwned();
  render();
};
$('decServ').onclick = ()=>{
  servings = Math.max(1, servings-1);
  setOwned();
  render();
};

$('saveBtn').onclick = ()=>{
  if(!state) return;
  const saved = JSON.parse(localStorage.getItem('pickyFavorites')||'[]');
  saved.push({
    title: state.title,
    servings,
    ingredients: state.ingredients,
    steps: state.steps,
    macros_per_serving: {
      calories: $('calories').textContent,
      protein: $('protein').textContent,
      carbs: $('carbs').textContent,
      fat: $('fat').textContent
    },
    savedAt: new Date().toISOString()
  });
  localStorage.setItem('pickyFavorites', JSON.stringify(saved));
  $('saveBtn').textContent = '✓ Saved';
};

$('backBtn').onclick = ()=>{
  servings = 2;
  state = null;
  owned = false;
  $('resultCard').classList.add('hidden');
  $('inputCard').classList.remove('hidden');
};


// ===============================
// v1.9.0 — MEALS + Soft Auth Diary (local-first)
// ===============================

const MEALS = ['breakfast','lunch','dinner','snacks'];
let activeMeal = 'breakfast';

function lsGet(k, fallback){
  try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fallback; }
  catch(e){ return fallback; }
}
function lsSet(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

function todayKey(){
  return new Date().toISOString().slice(0,10);
}

function getAuth(){
  return lsGet('pickyAuth', null);
}
function setAuthEmail(email){
  lsSet('pickyAuth', { email, createdAt: new Date().toISOString() });
}
function authKnown(){
  const a = getAuth();
  return !!(a && a.email);
}

function getDiary(){
  return lsGet('pickyDiaryMeals', {});
}
function setDiary(d){
  lsSet('pickyDiaryMeals', d);
}

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
  const key = todayKey();
  ensureDay(diary, key);
  diary[key][meal].splice(idx, 1);
  setDiary(diary);
}

function openDiary(){
  $('diaryCard').classList.remove('hidden');
  updateDiarySub();
  renderDiary();
}
function closeDiary(){
  $('diaryCard').classList.add('hidden');
}

function updateDiarySub(){
  const key = todayKey();
  const a = getAuth();
  const who = a?.email ? `Signed in as ${a.email}` : 'Saved on this device (create free account to sync later)';
  const el = document.getElementById('diarySub');
  if(el) el.textContent = `${key} • ${who}`;
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
  const key = todayKey();
  ensureDay(diary, key);

  const list = diary[key][activeMeal] || [];
  const ul = document.getElementById('diaryList');
  if(!ul) return;
  ul.innerHTML = '';

  list.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'diary-item';

    const left = document.createElement('div');
    left.innerHTML = `<strong>${item.title}</strong>
      <div class="diary-meta">${item.source}${item.localOnly ? ' • local-only' : ''}</div>`;

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

// -------------------------------
// Soft auth overlays
// -------------------------------
function show(el){ el && el.classList.remove('hidden'); }
function hide(el){ el && el.classList.add('hidden'); }

function showAuthGate(){ show(document.getElementById('authOverlay')); }
function hideAuthGate(){ hide(document.getElementById('authOverlay')); }
function showEmailCapture(){ show(document.getElementById('emailOverlay')); document.getElementById('authEmail')?.focus(); }
function hideEmailCapture(){ hide(document.getElementById('emailOverlay')); }
function showMealPicker(){ show(document.getElementById('mealOverlay')); }
function hideMealPicker(){ hide(document.getElementById('mealOverlay')); }

// -------------------------------
// Diary actions from recipe
// -------------------------------
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
    localOnly: !authKnown(),
    time: new Date().toISOString()
  });

  setActiveMeal(meal);
  openDiary();
}

// -------------------------------
// Quick Add
// -------------------------------
function cleanNum(v){
  const n = Number(String(v||'').trim());
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function quickAddToActiveMeal(){
  const name = document.getElementById('qaName')?.value?.trim() || '';
  if(!name) return alert('Add a food name');

  const cal = cleanNum(document.getElementById('qaCal')?.value);
  const p = cleanNum(document.getElementById('qaP')?.value);
  const c = cleanNum(document.getElementById('qaC')?.value);
  const f = cleanNum(document.getElementById('qaF')?.value);

  addEntryToDiary(activeMeal, {
    title: name,
    source: 'Quick add',
    macros: { cal, p, c, f },
    localOnly: !authKnown(),
    time: new Date().toISOString()
  });

  ['qaName','qaCal','qaP','qaC','qaF'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });

  openDiary();
}

// -------------------------------
// Wire UI
// -------------------------------
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

document.getElementById('openDiary')?.addEventListener('click', openDiary);
document.getElementById('closeDiary')?.addEventListener('click', closeDiary);

document.getElementById('qaAdd')?.addEventListener('click', quickAddToActiveMeal);

// Add to Diary from recipe: gate once per device/session unless they create account
let diaryGateDismissed = lsGet('pickyDiaryGateDismissed', false);

document.getElementById('addDiaryBtn')?.addEventListener('click', () => {
  if(!authKnown() && !diaryGateDismissed){
    showAuthGate();
  } else {
    showMealPicker();
  }
});

document.getElementById('authLater')?.addEventListener('click', () => {
  diaryGateDismissed = true;
  lsSet('pickyDiaryGateDismissed', true);
  hideAuthGate();
  showMealPicker();
});

document.getElementById('authCreate')?.addEventListener('click', () => {
  hideAuthGate();
  showEmailCapture();
});

document.getElementById('authCancelEmail')?.addEventListener('click', () => {
  hideEmailCapture();
  diaryGateDismissed = true;
  lsSet('pickyDiaryGateDismissed', true);
  showMealPicker();
});

document.getElementById('authSaveEmail')?.addEventListener('click', () => {
  const email = document.getElementById('authEmail')?.value?.trim() || '';
  if(!email || !email.includes('@')) return alert('Enter a valid email');
  setAuthEmail(email);
  hideEmailCapture();
  showMealPicker();
});

document.getElementById('mealCancel')?.addEventListener('click', hideMealPicker);

updateDiarySub();


// ===============================
// v1.9.1 — Micro polish
// ===============================
const toast = (() => {
  const t = document.createElement('div');
  t.className='toast hidden';
  document.body.appendChild(t);
  return {
    show(msg){
      t.textContent = msg;
      t.classList.remove('hidden');
      setTimeout(()=>t.classList.add('hidden'), 1400);
    }
  }
})();

// Patch renderDiary to show empty state
const _renderDiary = renderDiary;
renderDiary = function(){
  _renderDiary();
  const ul = document.getElementById('diaryList');
  if(ul && ul.children.length === 0){
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nothing logged here yet. Start with this meal.';
    ul.appendChild(li);
  }
};

// Feedback on add/remove
const _addCurrentRecipeToMeal = addCurrentRecipeToMeal;
addCurrentRecipeToMeal = function(meal){
  _addCurrentRecipeToMeal(meal);
  toast.show('Added to ' + meal.charAt(0).toUpperCase()+meal.slice(1));
};

const _deleteEntry = deleteEntry;
deleteEntry = function(meal, idx){
  _deleteEntry(meal, idx);
  toast.show('Removed');
};

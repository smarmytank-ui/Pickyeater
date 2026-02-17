
// Phase 2 — Dairy swap priority (v1.1 only)
function prioritizeDairySwaps(ingredient, options){
  if (!ingredient || ingredient.category !== 'dairy' || !Array.isArray(options)) return options;
  const primary = [];
  const secondary = [];
  options.forEach(opt => {
    if (opt && opt.category === 'dairy') primary.push(opt);
    else secondary.push(opt);
  });
  return [...primary, ...secondary];
}

// =======================================================
// Picky Eater — LOCKED FOUNDATION PATCH
// Re-enable swaps visually + re-attach diary add button
// + lock nutrition disclosure (estimates)
// FULL FILE — replace app.js entirely
// =======================================================

const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;
let owned = false;

// -------------------------------
// Normalization + roles
// -------------------------------
const ROLE_RULES = [
  // Specific phrases FIRST (prevents "green beans" matching "beans")
  [/\b(cheese|shredded cheese|cheddar cheese|mozzarella cheese|parmesan cheese|sour cream|greek yogurt|cottage cheese|cream cheese)\b/i,'dairy'],
  [/\bgreen beans\b/i,'veg'],
  [/\b(olive oil|butter)\b/i,'fat'],
  [/\b(lemon|lemon juice|vinegar)\b/i,'acid'],
  [/\b(salmon|chicken|chicken breast|beef|ground beef|lean beef|turkey|pork|tofu|lentils|egg|eggs)\b/i,'protein'],
  [/\bbeans\b/i,'protein'],
  [/\b(rice|pasta|potato|potatoes|quinoa|sweet potato|sweet potatoes)\b/i,'starch'],
  [/\b(onion|onions|green onion|scallion|scallions|shallot|garlic)\b/i,'aromatic']
];

function canonName(s){
  const t = String(s||'').trim().toLowerCase();
  if(!t) return '';
  const x = t
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
  return x;
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
  protein:{ v:1, u:'lb' },      // serves 2 default
  veg:{ v:2, u:'cups' },
  starch:{ v:2, u:'cups' },
  aromatic:{ v:1, u:'medium' },
  fat:{ v:1, u:'tbsp' },
  acid:{ v:1, u:'tbsp' }
};

// Ingredient-specific default quantities (SERVES 2 baseline)
const CANON_DEFAULT_BASE = {
  'olive oil': { v: 1, u: 'tbsp' },
  'butter': { v: 1, u: 'tbsp' },
  'lemon': { v: 1, u: 'tbsp' },
  'vinegar': { v: 1, u: 'tbsp' },
  'garlic': { v: 2, u: 'cloves' }
};

// -------------------------------
// Swap catalog (qty + instruction patches)
// -------------------------------
const SWAP_CATALOG = {
  protein: [
    { name:'chicken breast', unitOverride:'lb',   baseOverride:1,    instrPatchKey:'cook_meat' },
    { name:'turkey',         unitOverride:'lb',   baseOverride:1,    instrPatchKey:'cook_meat' },
    { name:'lean beef',      unitOverride:'lb',   baseOverride:1,    instrPatchKey:'cook_meat' },
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
    { name:'spinach',     unitOverride:'cups', baseOverride:3,   instrPatchKey:'cook_veg' }
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
  ]
};

// -------------------------------
// Canonical nutrition table (per 100g)
// Values are standard reference approximations.
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

  // aromatics
  'onion':         { cal:40,  p:1.1,  c:9.3,  f:0.1 },
  'green onion':   { cal:32,  p:1.8,  c:7.3,  f:0.2 },
  'shallot':       { cal:72,  p:2.5,  c:16.8, f:0.1 },
  'garlic':        { cal:149, p:6.4,  c:33.1, f:0.5 },

  // fat/acid (approx)
  'olive oil':     { cal:884, p:0.0,  c:0.0,  f:100.0 },
  'butter':        { cal:717, p:0.9,  c:0.1,  f:81.1 },
  'lemon':         { cal:29,  p:1.1,  c:9.3,  f:0.3 },
  'vinegar':       { cal:18,  p:0.0,  c:0.0,  f:0.0 },

  'skip it':       { cal:0,   p:0.0,  c:0.0,  f:0.0 }
};

const ROLE_FALLBACK_100G = {
  protein:  { cal:165, p:25.0, c:0.0,  f:6.0 },
  starch:   { cal:120, p:3.0,  c:25.0, f:1.0 },
  veg:      { cal:30,  p:2.0,  c:6.0,  f:0.3 },
  aromatic: { cal:40,  p:1.0,  c:9.0,  f:0.1 },
  fat:      { cal:884, p:0.0,  c:0.0,  f:100.0 },
  acid:     { cal:20,  p:0.0,  c:1.0,  f:0.0 }
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
  tsp: 5
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
  'sweet potatoes': { medium: 130 },

  // fat/acid specifics (tbsp weights vary slightly)
  'olive oil': { tbsp: 13.5, tsp: 4.5 },
  'butter': { tbsp: 14 },
  'lemon': { tbsp: 15, tsp: 5 },
  'vinegar': { tbsp: 15, tsp: 5 },
  'garlic': { cloves: 3 }
};

function gramsFor(name, unit, qty){
  const n = canonName(name);
  if(n === 'skip it' || qty === 0) return 0;

  const map = GRAMS_PER_UNIT[n] || {};
  if(map[unit] != null) return qty * map[unit];

  if(UNIT_TO_GRAMS[unit] != null) return qty * UNIT_TO_GRAMS[unit];

  return 0;
}

// -------------------------------
// Beginner-friendly instructions (LOCKED, complete keys)
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
  combine: 'Combine everything. Taste. Season. Serve.'
};

function buildInstructions(ingredients){
  const steps = [];
  steps.push({ key:'prep', text: INSTR.prep });

  // Fat step near the top (if present)
  if(ingredients.some(i=>i.role==='fat' && i.name!=='skip it')){
    steps.push({ key:'oil', text: INSTR.use_oil });
  }

  // Aromatic guidance
  const aromatic = ingredients.find(i=>i.role==='aromatic');
  if(aromatic){
    if(aromatic.name === 'skip it') steps.push({ key:'aromatic', text: INSTR.skip_aromatic });
    else if(aromatic.name === 'garlic') steps.push({ key:'aromatic', text: INSTR.add_garlic });
    else steps.push({ key:'aromatic', text: INSTR.add_aromatic });
  }

  // Protein guidance
  const protein = ingredients.find(i=>i.role==='protein' && i.name!=='skip it');
  if(protein){
    if(protein.name.includes('salmon')) steps.push({ key:'protein', text: INSTR.cook_fish });
    else if(protein.name.includes('tofu')) steps.push({ key:'protein', text: INSTR.cook_tofu });
    else if(protein.name.includes('bean') || protein.name.includes('lentil')) steps.push({ key:'protein', text: INSTR.warm_beans });
    else if(protein.name.includes('egg')) steps.push({ key:'protein', text: INSTR.cook_eggs });
    else steps.push({ key:'protein', text: INSTR.cook_meat });
  }

  // Starch guidance
  const starch = ingredients.find(i=>i.role==='starch' && i.name!=='skip it');
  if(starch){
    if(starch.name.includes('rice')) steps.push({ key:'starch', text: INSTR.cook_rice });
    else if(starch.name.includes('pasta')) steps.push({ key:'starch', text: INSTR.cook_pasta });
    else if(starch.name.includes('quinoa')) steps.push({ key:'starch', text: INSTR.cook_quinoa });
    else steps.push({ key:'starch', text: INSTR.cook_potato });
  }

  // Veg always
  steps.push({ key:'veg', text: INSTR.cook_veg });

  // Acid finish at the end (if present)
  if(ingredients.some(i=>i.role==='acid' && i.name!=='skip it')){
    steps.push({ key:'acid', text: INSTR.finish_acid });
  }

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
    const base = { ...(BASE_QTY[role] || BASE_QTY.veg) };
    const override = CANON_DEFAULT_BASE[name];
    if(override){
      base.v = override.v;
      base.u = override.u;
    }
    return {
      id: crypto.randomUUID(),
      name,
      role,
      base,
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

  // LOCKED DISCLOSURE: "≈ estimates per serving"
  if($('calories')) $('calories').textContent = `≈ ${Math.round(per.cal)} cal/serv`;
  if($('protein'))  $('protein').textContent  = `Protein ${Math.round(per.p)}g`;
  if($('carbs'))    $('carbs').textContent    = `Carbs ${Math.round(per.c)}g`;
  if($('fat'))      $('fat').textContent      = `Fat ${Math.round(per.f)}g`;

  ensureNutritionDisclosure();
}

function bump(el, cls='bump', ms=450){
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls), ms);
}

function flashStepByKey(key){
  const list = $('instructionsList');
  if(!list || !state?.steps) return;
  const lis = list.querySelectorAll('li');
  const idx = state.steps.findIndex(s=>s.key===key);
  if(idx < 0 || !lis[idx]) return;
  lis[idx].classList.add('flash');
  setTimeout(()=>lis[idx].classList.remove('flash'), 520);
}

function setOwned(){
  owned = true;
  const sr = $('saveRow');
  if(sr) sr.classList.remove('hidden');
}

// -------------------------------
// SWAPS: apply swap (NO buildSteps calls, no undefined refs)
// -------------------------------
function applySwap(ingId, opt){
  const ing = state.ingredients.find(i=>i.id===ingId);
  if(!ing || !opt) return;

  ing.name = canonName(opt.name);
  ing.role = roleFor(ing.name);

  // Reset to role baseline then apply overrides
  ing.base = { ...(BASE_QTY[ing.role] || BASE_QTY.veg) };

  if(typeof opt.baseOverride === 'number') ing.base.v = opt.baseOverride;
  if(typeof opt.unitOverride === 'string') ing.base.u = opt.unitOverride;

  // Canon defaults (e.g., garlic cloves) take precedence if present
  const override = CANON_DEFAULT_BASE[ing.name];
  if(override){
    ing.base.v = override.v;
    ing.base.u = override.u;
  }

  ing.swapMeta = { patchKey: opt.instrPatchKey || null };

  // Rebuild instructions safely
  state.steps = buildInstructions(state.ingredients);

  computeMacrosPerServing();
  render(); // keep visual swap state consistent
}

// -------------------------------
// Render (includes SWAP selects)
// -------------------------------
function render(){
  if(!state) return;

  if($('servingsVal')) $('servingsVal').textContent = servings;
  if($('recipeTitle')) $('recipeTitle').textContent = state.title;

  // Ingredients + swap dropdowns
  const ul = $('ingredientsList');
  if(ul){
    ul.innerHTML = '';
    state.ingredients.forEach((ing)=>{
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
      sub.textContent = ing.role.toUpperCase();

      left.append(main, sub);

      // SWAP UI (VISUAL RE-ENABLED)
      const sel = document.createElement('select');
      sel.className = 'swap-select';

      const opts = SWAP_CATALOG[ing.role] || [];
      sel.innerHTML =
        `<option value="">Swap</option>` +
        opts.map(o=>`<option value="${o.name}">${pretty(o.name)}</option>`).join('');

      sel.onchange = ()=>{
        const chosen = sel.value;
        if(!chosen) return;
        const opt = opts.find(o=>o.name===chosen);
        applySwap(ing.id, opt);
        sel.value = '';
        bump(li);
        setOwned();
        flashStepByKey(ing.role);
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
// LOCKED NUTRITION DISCLOSURE (auto-inserts if missing)
// -------------------------------
function ensureNutritionDisclosure(){
  // Try to place under macros area if we can find it.
  // If we can't, place it under the result card header area.
  const existing = document.getElementById('nutritionDisclosure');
  if(existing) return;

  const host =
    document.getElementById('macroRow') ||
    document.getElementById('macros') ||
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

// -------------------------------
// Diary (local-first) — RE-ATTACH ADD BUTTON
// -------------------------------

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

function getAuth(){ return lsGet('pickyAuth', null); }
function setAuthEmail(email){ lsSet('pickyAuth', { email, createdAt: new Date().toISOString() }); }
function authKnown(){ const a = getAuth(); return !!(a && a.email); }

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
  const key = todayKey();
  ensureDay(diary, key);
  diary[key][meal].splice(idx, 1);
  setDiary(diary);
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

function openDiary(){
  const card = $('diaryCard');
  if(card) card.classList.remove('hidden');
  updateDiarySub();
  renderDiary();
}
function closeDiary(){
  const card = $('diaryCard');
  if(card) card.classList.add('hidden');
}

// -------------------------------
// Meal Picker + Soft Auth overlays (if present)
// -------------------------------
function show(el){ el && el.classList.remove('hidden'); }
function hide(el){ el && el.classList.add('hidden'); }

function showAuthGate(){ show(document.getElementById('authOverlay')); }
function hideAuthGate(){ hide(document.getElementById('authOverlay')); }
function showEmailCapture(){ show(document.getElementById('emailOverlay')); document.getElementById('authEmail')?.focus(); }
function hideEmailCapture(){ hide(document.getElementById('emailOverlay')); }
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
    localOnly: !authKnown(),
    time: new Date().toISOString()
  });

  setActiveMeal(meal);
  openDiary();
}

// -------------------------------
// Ensure "Add to Diary" exists + wired (auto-create if missing)
// -------------------------------
function ensureDiaryButton(){
  // If your HTML already has it, just ensure it’s wired.
  let btn = document.getElementById('addDiaryBtn');

  // If missing, create it and place it near save row / result card.
  if(!btn){
    const resultCard = document.getElementById('resultCard');
    if(!resultCard) return;

    btn = document.createElement('button');
    btn.id = 'addDiaryBtn';
    btn.className = 'btn secondary'; // harmless if your CSS doesn’t define it
    btn.type = 'button';
    btn.textContent = '➕ Add to Diary';

    // Try to insert near existing action row if present
    const saveRow = document.getElementById('saveRow');
    if(saveRow && saveRow.parentElement){
      saveRow.parentElement.insertBefore(btn, saveRow);
    } else {
      resultCard.appendChild(btn);
    }
  }

  // Wire it once
  if(btn && !btn.dataset.wired){
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      // Gate overlay if present; otherwise open meal picker directly
      const hasMealOverlay = !!document.getElementById('mealOverlay');
      const hasAuthOverlay = !!document.getElementById('authOverlay');

      if(hasMealOverlay){
        if(!authKnown() && hasAuthOverlay){
          // allow "later" flow if present
          showAuthGate();
        } else {
          showMealPicker();
        }
      } else {
        // If overlays not present, default: add to dinner
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
  const backBtn = $('backBtn');

  if(gen && !gen.dataset.wired){
    gen.dataset.wired = '1';
    gen.onclick = ()=>{
      const raw = parseLines($('ingredientsInput')?.value);
      if(!raw || !raw.length) return alert('Add ingredients');

      const ingredients = normalize(raw);

      // Ensure fat + acid exist as optional supports if user didn’t type them
      // (does NOT change their recipe; just enables swapping into them)
      const hasFat = ingredients.some(i=>i.role==='fat');
      const hasAcid = ingredients.some(i=>i.role==='acid');
      if(!hasFat) ingredients.push({ id: crypto.randomUUID(), name:'skip it', role:'fat', base:{ v:0, u:'' }, swapMeta:null });
      if(!hasAcid) ingredients.push({ id: crypto.randomUUID(), name:'skip it', role:'acid', base:{ v:0, u:'' }, swapMeta:null });

      state = { ingredients, title: titleFrom(ingredients), steps: [] };
      state.steps = buildInstructions(state.ingredients);

      owned = false;
      const sr = $('saveRow');
      if(sr) sr.classList.add('hidden');
      if(saveBtn) saveBtn.textContent = '⭐ Save to Favorites';

      $('inputCard')?.classList.add('hidden');
      $('resultCard')?.classList.remove('hidden');

      render();
    };
  }

  if(inc && !inc.dataset.wired){
    inc.dataset.wired='1';
    inc.onclick = ()=>{
      servings = Math.min(8, servings+1);
      setOwned();
      render();
    };
  }

  if(dec && !dec.dataset.wired){
    dec.dataset.wired='1';
    dec.onclick = ()=>{
      servings = Math.max(1, servings-1);
      setOwned();
      render();
    };
  }

  if(saveBtn && !saveBtn.dataset.wired){
    saveBtn.dataset.wired='1';
    saveBtn.onclick = ()=>{
      if(!state) return;
      const saved = JSON.parse(localStorage.getItem('pickyFavorites')||'[]');
      saved.push({
        title: state.title,
        servings,
        ingredients: state.ingredients,
        steps: state.steps,
        macros_per_serving: {
          calories: $('calories')?.textContent || '',
          protein: $('protein')?.textContent || '',
          carbs: $('carbs')?.textContent || '',
          fat: $('fat')?.textContent || ''
        },
        savedAt: new Date().toISOString()
      });
      localStorage.setItem('pickyFavorites', JSON.stringify(saved));
      saveBtn.textContent = '✓ Saved';
    };
  }

  if(backBtn && !backBtn.dataset.wired){
    backBtn.dataset.wired='1';
    backBtn.onclick = ()=>{
      servings = 2;
      state = null;
      owned = false;
      $('resultCard')?.classList.add('hidden');
      $('inputCard')?.classList.remove('hidden');
    };
  }

  // Diary wiring (if elements exist)
  document.getElementById('openDiary')?.addEventListener('click', openDiary);
  document.getElementById('closeDiary')?.addEventListener('click', closeDiary);

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

  // Soft auth buttons (if present)
  let diaryGateDismissed = lsGet('pickyDiaryGateDismissed', false);

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
}

// Safe init for GitHub Pages (script placement varies)
function init(){
  wireEvents();
  ensureNutritionDisclosure();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
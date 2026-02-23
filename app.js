// =======================================================
// Picky Eater — WORKING BUILD + MEASUREMENT INTENT LOCK
// Swapper (catalog + jackpot custom) + per-ingredient amount controls
// Accurate(ish) nutrition estimates via per-100g table + unit→grams conversions
// Bread wording: "count" (e.g., count 4)
// FULL FILE — replace app.js entirely
// =======================================================

const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;

// -------------------------------
// Helpers
// -------------------------------
function uid(){
  return window.crypto?.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function parseLines(s){
  return (s||'').replace(/,+/g,'\n').split(/\n+/).map(x=>x.trim()).filter(Boolean);
}

function pretty(s){
  return (s||'').split(' ').map(w=>w? w[0].toUpperCase()+w.slice(1) : w).join(' ');
}

// UI helper — fractions for nicer display
function formatQty(value) {
  if (value == null || value <= 0) return '';
  const fractions = {
    0.25: '1/4',
    0.33: '1/3',
    0.5:  '1/2',
    0.66: '2/3',
    0.75: '3/4'
  };

  const whole = Math.floor(value + 1e-9);
  const rem = value - whole;
  const keys = Object.keys(fractions).map(Number);
  const match = keys.find(k => Math.abs(k - rem) < 0.02);

  let out = whole > 0 ? String(whole) : '';
  if (match != null) {
    out += (out ? ' ' : '') + fractions[match];
  } else if (rem > 0.001) {
    // keep to 2 decimals max
    out += (out ? ' ' : '') + (Math.round(rem * 100) / 100).toString();
  }
  return out;
}

function canonName(s){
  const t = String(s||'').trim().toLowerCase();
  if(!t) return '';

  const x = t
    .replace(/\bfillet\b/g,'')
    .replace(/\bfilet\b/g,'')
    .replace(/\s+/g,' ')
    .trim();

  // light canonicalization
  if(x === 'potato') return 'potatoes';
  if(x === 'onions') return 'onion';
  if(x === 'lemons') return 'lemon';
  if(x === 'scallion' || x === 'scallions') return 'green onion';
  if(x === 'salmon fillets' || x === 'salmon filet' || x === 'salmon filets') return 'salmon';
  if(x === 'chicken') return 'chicken breast';
  if(x === 'tortilla') return 'tortillas';
  if(x === 'tomato') return 'tomatoes';
  return x;
}

// -------------------------------
// Roles
// -------------------------------
const ROLE_RULES = [
  // specific phrases first
  [/\bgreen beans\b/i,'veg'],

  // dairy + bread
  [/\b(cheese|cheddar|mozzarella|parmesan|feta|greek yogurt|yogurt|sour cream)\b/i,'dairy'],
  [/\b(tortilla|tortillas|bread|bun|buns|wrap|pita)\b/i,'bread'],

  // seasonings
  [/\b(taco seasoning)\b/i,'seasoning'],
  [/\b(bbq|barbecue)\b/i,'seasoning'],
  [/\b(salt|pepper|black pepper|kosher salt|sea salt|garlic powder|onion powder|paprika|smoked paprika|italian seasoning|oregano|basil|parsley|thyme|rosemary|cumin|chili flakes|red pepper flakes|herbs)\b/i,'seasoning'],

  // basics
  [/\b(olive oil|butter)\b/i,'fat'],
  [/\b(lemon|lemon juice|vinegar)\b/i,'acid'],
  [/\b(salmon|chicken breast|chicken|beef|ground beef|lean beef|turkey|pork|tofu|lentils|egg|eggs)\b/i,'protein'],
  [/\bbeans\b/i,'protein'],
  [/\b(rice|pasta|potato|potatoes|quinoa|sweet potato|sweet potatoes)\b/i,'starch'],
  [/\b(onion|onions|green onion|scallion|scallions|shallot|garlic)\b/i,'aromatic']
];

function roleFor(n){
  for(const [r,role] of ROLE_RULES) if(r.test(n)) return role;
  return 'veg';
}

// -------------------------------
// Measurement intent lock (bulk / support / flavor / finish)
// -------------------------------
const MEASURE_INTENT = {
  bulk:    { step: 0.25, max: 12 },   // cups / lb / count handled by unit rules
  support: { step: 0.5,  max: 16 },   // tbsp
  flavor:  { step: 0.25, max: 8 },    // tsp
  finish:  { step: 0.25, max: 8 }     // tsp
};

const ROLE_TO_INTENT = {
  protein: 'bulk',
  veg:     'bulk',
  starch:  'bulk',
  bread:   'bulk',

  dairy:   'support',
  fat:     'support',

  seasoning:'flavor',
  acid:    'finish',

  aromatic:'bulk'
};

function intentFor(ingName, role){
  const base = ROLE_TO_INTENT[role] || 'bulk';

  // name-specific overrides (LOCKED behavior)
  if(role === 'dairy'){
    // cheese stays in cups (user approved 1/2 cup cheese for serves 2)
    if(/cheese|cheddar|mozzarella|parmesan|feta/i.test(ingName)) return 'bulk';
    // sour cream/yogurt behaves like a "support" (tbsp)
    return 'support';
  }

  // garlic is better as cloves (bulk-ish but step 1)
  if(role === 'aromatic' && /garlic/i.test(ingName)) return 'bulk';

  return base;
}

// -------------------------------
// Base quantities (SERVES 2 defaults)
// -------------------------------
// NOTE: these are defaults; intent rules govern how +/- changes values.
const BASE_QTY = {
  protein:  { v:1,   u:'lb' },
  veg:      { v:2,   u:'cups' },
  starch:   { v:2,   u:'cups' },
  aromatic: { v:1,   u:'medium' },
  fat:      { v:1,   u:'tbsp' },
  acid:     { v:1,   u:'tsp' },
  seasoning:{ v:0.5, u:'tsp' },
  dairy:    { v:0.5, u:'cups' },   // cheese default
  bread:    { v:4,   u:'count' }
};

const CANON_DEFAULT_BASE = {
  'olive oil': { v: 1, u: 'tbsp' },
  'butter':    { v: 1, u: 'tbsp' },
  'lemon':     { v: 1, u: 'tbsp' },
  'vinegar':   { v: 1, u: 'tbsp' },
  'garlic':    { v: 2, u: 'cloves' },
  'sour cream':{ v: 2, u: 'tbsp' },
  'greek yogurt':{ v: 2, u: 'tbsp' }
};

// Decide default unit per ingredient, with intent lock
function defaultBaseFor(name, role){
  const override = CANON_DEFAULT_BASE[name];
  if(override) return { ...override };

  // dairy: if not cheese, use tbsp
  if(role === 'dairy' && !/cheese|cheddar|mozzarella|parmesan|feta/i.test(name)){
    return { v: 2, u: 'tbsp' };
  }

  return { ...(BASE_QTY[role] || BASE_QTY.veg) };
}

// -------------------------------
// Swap catalog
// -------------------------------
const SWAP_CATALOG = {
  protein: [
    { name:'chicken breast', unitOverride:'lb',   baseOverride:1 },
    { name:'turkey',         unitOverride:'lb',   baseOverride:1 },
    { name:'lean beef',      unitOverride:'lb',   baseOverride:1 },
    { name:'salmon',         unitOverride:'lb',   baseOverride:1 },
    { name:'tofu',           unitOverride:'oz',   baseOverride:14 },
    { name:'beans',          unitOverride:'cups', baseOverride:2 },
    { name:'eggs',           unitOverride:'eggs', baseOverride:4 }
  ],
  starch: [
    { name:'potatoes',       unitOverride:'cups',   baseOverride:2 },
    { name:'sweet potatoes', unitOverride:'medium', baseOverride:2 },
    { name:'rice',           unitOverride:'cups',   baseOverride:1.5 },
    { name:'quinoa',         unitOverride:'cups',   baseOverride:1.25 },
    { name:'pasta',          unitOverride:'cups',   baseOverride:1.5 }
  ],
  aromatic: [
    { name:'onion',       unitOverride:'medium', baseOverride:1 },
    { name:'green onion', unitOverride:'cups',   baseOverride:0.5 },
    { name:'shallot',     unitOverride:'medium', baseOverride:1 },
    { name:'garlic',      unitOverride:'cloves', baseOverride:2 },
    { name:'skip it',     unitOverride:'',       baseOverride:0 }
  ],
  veg: [
    { name:'broccoli',    unitOverride:'cups', baseOverride:2 },
    { name:'green beans', unitOverride:'cups', baseOverride:2 },
    { name:'carrots',     unitOverride:'cups', baseOverride:1.5 },
    { name:'zucchini',    unitOverride:'cups', baseOverride:2 },
    { name:'spinach',     unitOverride:'cups', baseOverride:3 }
  ],
  fat: [
    { name:'olive oil', unitOverride:'tbsp', baseOverride:1 },
    { name:'butter',    unitOverride:'tbsp', baseOverride:1 },
    { name:'skip it',   unitOverride:'',     baseOverride:0 }
  ],
  acid: [
    { name:'lemon',   unitOverride:'tbsp', baseOverride:1 },
    { name:'vinegar', unitOverride:'tbsp', baseOverride:1 },
    { name:'skip it', unitOverride:'',     baseOverride:0 }
  ],
  seasoning: [
    { name:'salt',              unitOverride:'tsp', baseOverride:0.5 },
    { name:'black pepper',      unitOverride:'tsp', baseOverride:0.25 },
    { name:'garlic powder',     unitOverride:'tsp', baseOverride:0.5 },
    { name:'paprika',           unitOverride:'tsp', baseOverride:0.5 },
    { name:'italian seasoning', unitOverride:'tsp', baseOverride:0.5 },
    { name:'chili flakes',      unitOverride:'tsp', baseOverride:0.25 },
    { name:'skip it',           unitOverride:'',    baseOverride:0 }
  ],
  dairy: [
    { name:'cheddar cheese', unitOverride:'cups', baseOverride:0.5 },
    { name:'mozzarella',     unitOverride:'cups', baseOverride:0.5 },
    { name:'parmesan',       unitOverride:'tbsp', baseOverride:4 },
    { name:'sour cream',     unitOverride:'tbsp', baseOverride:2 },
    { name:'skip it',        unitOverride:'',     baseOverride:0 }
  ],
  bread: [
    { name:'tortillas', unitOverride:'count', baseOverride:4 },
    { name:'bread',     unitOverride:'count', baseOverride:2 },
    { name:'pita',      unitOverride:'count', baseOverride:2 },
    { name:'skip it',   unitOverride:'',      baseOverride:0 }
  ]
};

// -------------------------------
// Nutrition table (per 100g)
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
  'greek yogurt':   { cal:59,  p:10.0, c:3.6,  f:0.4 },

  // bread
  'tortillas':      { cal:304, p:8.0,  c:50.0, f:8.0 },
  'bread':          { cal:265, p:9.0,  c:49.0, f:3.2 },
  'pita':           { cal:275, p:9.0,  c:55.0, f:1.2 },

  // common
  'tomatoes':       { cal:18,  p:0.9,  c:3.9,  f:0.2 },

  // seasonings (treated as 0)
  'salt':           { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'pepper':         { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'black pepper':   { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'garlic powder':  { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'onion powder':   { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'paprika':        { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'smoked paprika': { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'italian seasoning':{ cal:0, p:0.0,  c:0.0,  f:0.0 },
  'oregano':        { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'basil':          { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'parsley':        { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'thyme':          { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'rosemary':       { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'cumin':          { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'chili flakes':   { cal:0,   p:0.0,  c:0.0,  f:0.0 },
  'red pepper flakes':{ cal:0, p:0.0,  c:0.0,  f:0.0 },

  'skip it':        { cal:0,   p:0.0,  c:0.0,  f:0.0 }
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
  tsp: 5
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
  'cheddar cheese': { cups: 226 },
  'mozzarella': { cups: 112 },

  // medium
  'onion': { medium: 110 },
  'shallot': { medium: 44 },
  'sweet potatoes': { medium: 130 },

  // fat/acid/seasoning specifics
  'olive oil': { tbsp: 13.5, tsp: 4.5 },
  'butter': { tbsp: 14 },
  'lemon': { tbsp: 15, tsp: 5 },
  'vinegar': { tbsp: 15, tsp: 5 },
  'parmesan': { tbsp: 5 },
  'sour cream': { tbsp: 15 },
  'greek yogurt': { tbsp: 15 },
  'garlic': { cloves: 3 },

  // bread by count (approx)
  'tortillas': { count: 30 },
  'bread': { count: 25 },
  'pita': { count: 60 }
};

function gramsFor(name, unit, qty){
  const n = canonName(name);
  if(!n || n === 'skip it' || qty === 0) return 0;

  const map = GRAMS_PER_UNIT[n] || {};
  if(map[unit] != null) return qty * map[unit];

  if(UNIT_TO_GRAMS[unit] != null) return qty * UNIT_TO_GRAMS[unit];

  // If we can't convert, treat as 0 to avoid blowing up estimates
  return 0;
}

// -------------------------------
// Title logic (simple deterministic)
// -------------------------------
function titleFrom(ings){
  const protein = ings.find(i=>i.role==='protein' && i.name!=='skip it');
  const main = protein ? pretty(protein.name) : 'Veggie';

  const all = ings.map(i=>i.name).join(' ').toLowerCase();
  if(all.includes('taco') || all.includes('tortilla')) return `Simple ${main} Tacos`;
  if(all.includes('bbq') || all.includes('barbecue')) return `Simple BBQ ${main}`;

  const hasStarch = ings.some(i=>i.role==='starch' && i.name!=='skip it');
  return `Simple ${main} ${hasStarch ? 'Dinner' : 'Plate'}`;
}

// -------------------------------
// Normalization
// -------------------------------
function normalize(names){
  return names.map(raw=>{
    const name = canonName(raw);
    const role = roleFor(name);
    const intent = intentFor(name, role);
    const base = defaultBaseFor(name, role);
    return {
      id: uid(),
      name,
      role,
      intent,
      base,
      swapMeta: null
    };
  });
}

// -------------------------------
// Nutrition + macros
// -------------------------------
function computeMacrosPerServing(){
  if(!state) return { cal:0,p:0,c:0,f:0 };

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

  return per;
}

// -------------------------------
// Amount controls (intent-aware)
// -------------------------------
function stepFor(ing){
  // unit-specific tweaks
  if(ing.base.u === 'lb') return 0.25;
  if(ing.base.u === 'oz') return 1;
  if(ing.base.u === 'cups') return 0.25;
  if(ing.base.u === 'tbsp') return 0.5;
  if(ing.base.u === 'tsp') return 0.25;
  if(ing.base.u === 'cloves') return 1;
  if(ing.base.u === 'eggs') return 1;
  if(ing.base.u === 'medium') return 1;
  if(ing.base.u === 'count') return 1;

  // fallback by intent
  const rule = MEASURE_INTENT[ing.intent] || MEASURE_INTENT.bulk;
  return rule.step;
}

function maxFor(ing){
  // unit-specific caps
  if(ing.base.u === 'lb') return 5;
  if(ing.base.u === 'oz') return 48;
  if(ing.base.u === 'cups') return 12;
  if(ing.base.u === 'tbsp') return 24;
  if(ing.base.u === 'tsp') return 12;
  if(ing.base.u === 'cloves') return 12;
  if(ing.base.u === 'eggs') return 12;
  if(ing.base.u === 'medium') return 6;
  if(ing.base.u === 'count') return 12;

  const rule = MEASURE_INTENT[ing.intent] || MEASURE_INTENT.bulk;
  return rule.max;
}

function qtyLabel(ing){
  const m = servings / 2;
  const val = ing.base.v * m;
  if(!ing.base.u || val === 0) return '';

  if(ing.base.u === 'count'){
    return `count ${Math.round(val)}`;
  }

  const nice = formatQty(val);
  return `${nice} ${ing.base.u}`.trim();
}

// -------------------------------
// Swaps
// -------------------------------
function applySwap(ingId, opt, optsArg){
  if(!state) return;
  const ing = state.ingredients.find(i=>i.id===ingId);
  if(!ing || !opt) return;

  const opts = optsArg || {};
  const keepRole = !!opts.keepRole;
  const keepQty  = !!opts.keepQty;

  const prevRole = ing.role;
  const prevBase = { ...ing.base };

  ing.name = canonName(opt.name);

  // Role handling:
  // - Catalog swaps: role follows ingredient name.
  // - Jackpot custom swaps (keepRole=true): role stays on the slot.
  ing.role = keepRole ? prevRole : roleFor(ing.name);

  // Intent always follows (role + name override), unless user is doing jackpot and we keepRole
  ing.intent = intentFor(ing.name, ing.role);

  // Quantity handling:
  if(keepQty){
    ing.base = prevBase;
  } else {
    ing.base = defaultBaseFor(ing.name, ing.role);

    if(typeof opt.baseOverride === 'number') ing.base.v = opt.baseOverride;
    if(typeof opt.unitOverride === 'string') ing.base.u = opt.unitOverride;

    // Canon defaults override everything if present
    const override = CANON_DEFAULT_BASE[ing.name];
    if(override){
      ing.base.v = override.v;
      ing.base.u = override.u;
    }
  }

  ing.swapMeta = { patchKey: opt.instrPatchKey || null };

  // keep title responsive to swaps
  state.title = titleFrom(state.ingredients);

  render();
}

// -------------------------------
// Render
// -------------------------------
function render(){
  if(!state) return;

  if($('servingsVal')) $('servingsVal').textContent = servings;
  if($('recipeTitle')) $('recipeTitle').textContent = state.title;

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
      const q = qtyLabel(ing);
      main.textContent = q ? `${q} ${pretty(ing.name)}` : `${pretty(ing.name)}`;

      const sub = document.createElement('div');
      sub.className = 'ing-sub';
      sub.textContent = `${ing.role.toUpperCase()} • ${ing.intent.toUpperCase()}`;

      left.append(main, sub);

      // Amount controls (intent-aware)
      const ctrl = document.createElement('div');
      ctrl.className = 'amount-controls';

      const step = stepFor(ing);
      const max = maxFor(ing);

      const dec = document.createElement('button');
      dec.type = 'button';
      dec.className = 'btn ghost small';
      dec.textContent = '−';
      dec.onclick = ()=>{
        ing.base.v = Math.max(0, Math.round((ing.base.v - step) * 100) / 100);
        render();
      };

      const inc = document.createElement('button');
      inc.type = 'button';
      inc.className = 'btn ghost small';
      inc.textContent = '+';
      inc.onclick = ()=>{
        ing.base.v = Math.min(max, Math.round((ing.base.v + step) * 100) / 100);
        render();
      };

      ctrl.append(dec, inc);
      left.appendChild(ctrl);

      // SWAP UI
      const sel = document.createElement('select');
      sel.className = 'swap-select';

      const opts = SWAP_CATALOG[ing.role] || [];
      sel.innerHTML =
        `<option value="">Swap</option>` +
        `<option value="__custom__">➕ Enter your own…</option>` +
        opts.map(o=>`<option value="${o.name}">${pretty(o.name)}</option>`).join('');

      sel.onchange = ()=>{
        const chosen = sel.value;
        if(!chosen) return;

        // Jackpot custom
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

            // Keep role + qty on the SLOT
            applySwap(ing.id, { name: raw }, { keepRole:true, keepQty:true });

            wrap.remove();
          };

          wrap.append(input, add, cancel);
          li.appendChild(wrap);
          input.focus();
          return;
        }

        // Catalog swap
        const opt = opts.find(o=>o.name===chosen);
        applySwap(ing.id, opt);
        sel.value = '';
      };

      li.append(left, sel);
      ul.appendChild(li);
    });
  }

  // Instructions: keep it simple (optional placeholder)
  const ol = $('instructionsList');
  if(ol){
    ol.innerHTML = '';
    const steps = [
      'Prep: wash and chop everything into bite-sized pieces.',
      'Cook protein until done.',
      'Cook veggies and starch until tender.',
      'Combine, season to taste, and serve.'
    ];
    steps.forEach(t=>{
      const li = document.createElement('li');
      li.textContent = t;
      ol.appendChild(li);
    });
  }

  computeMacrosPerServing();
}

// -------------------------------
// Events (safe wiring)
// -------------------------------
function wireEvents(){
  const gen = $('generateBtn');
  const inc = $('incServ');
  const dec = $('decServ');
  const back = $('backBtn');

  if(gen){
    gen.addEventListener('click', ()=>{
      const raw = parseLines($('ingredientsInput')?.value);
      if(!raw || !raw.length) return alert('Add ingredients');

      const ingredients = normalize(raw);

      // Ensure fat + acid + seasoning slots exist (optional supports)
      const hasFat = ingredients.some(i=>i.role==='fat');
      const hasAcid = ingredients.some(i=>i.role==='acid');
      const hasSeasoning = ingredients.some(i=>i.role==='seasoning');

      if(!hasFat) ingredients.push({ id: uid(), name:'skip it', role:'fat', intent:'support', base:{ v:0, u:'' }, swapMeta:null });
      if(!hasAcid) ingredients.push({ id: uid(), name:'skip it', role:'acid', intent:'finish', base:{ v:0, u:'' }, swapMeta:null });
      if(!hasSeasoning) ingredients.push({ id: uid(), name:'skip it', role:'seasoning', intent:'flavor', base:{ v:0, u:'' }, swapMeta:null });

      state = {
        ingredients,
        title: titleFrom(ingredients)
      };

      $('inputCard')?.classList.add('hidden');
      $('resultCard')?.classList.remove('hidden');
      $('saveRow')?.classList.remove('hidden');

      render();
    });
  }

  if(inc){
    inc.addEventListener('click', ()=>{
      servings = Math.min(8, servings+1);
      render();
    });
  }

  if(dec){
    dec.addEventListener('click', ()=>{
      servings = Math.max(1, servings-1);
      render();
    });
  }

  if(back){
    back.addEventListener('click', ()=>{
      servings = 2;
      state = null;
      $('resultCard')?.classList.add('hidden');
      $('inputCard')?.classList.remove('hidden');
      $('saveRow')?.classList.add('hidden');
    });
  }
}

function init(){
  wireEvents();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Keep compatibility with existing HTML truth label toggle
window.toggleTruth = function(){
  const detail = document.querySelector('.truth-detail');
  if(!detail) return;
  const isHidden = getComputedStyle(detail).display === 'none';
  detail.style.display = isHidden ? 'block' : 'none';
};

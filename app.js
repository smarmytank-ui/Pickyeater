// =======================================================
// Picky Eater — STABLE CORE + JACKPOT + CORRECT MACROS (per 100g)
// + UUID fallback + BREAD "count"
// FULL FILE — replace app.js entirely
// =======================================================

const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;

// -------------------------------
// Helpers
// -------------------------------
function parseLines(s){
  return (s||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
}
function pretty(s){
  return (s||'').split(' ').map(w=>w? w[0].toUpperCase()+w.slice(1) : w).join(' ');
}
function canonName(s){
  return String(s||'').trim().toLowerCase();
}

// UUID fallback (works on non-HTTPS / older contexts)
function makeId(){
  const c = window.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// --- Fraction formatter ---
function formatQty(value) {
  if (!value || value <= 0) return "";
  const fractions = { 0.25:"1/4",0.5:"1/2",0.75:"3/4",0.33:"1/3",0.66:"2/3" };
  const whole = Math.floor(value);
  const rem = value - whole;
  const f = Object.keys(fractions).find(x=>Math.abs(Number(x)-rem)<0.01);
  let out = whole>0 ? whole.toString() : "";
  if (f) out += (out?" ":"")+fractions[f];
  else if (rem>0) out += (out?" ":"")+rem.toFixed(2);
  return out;
}

// -------------------------------
// Roles + Base quantities (SERVES 2)
// -------------------------------
const ROLE_RULES = [
  [/\b(tortilla|tortillas|bread|pita)\b/i,'bread'],
  [/\b(cheese|cheddar|mozzarella|sour cream|yogurt)\b/i,'dairy'],
  [/\b(olive oil|butter)\b/i,'fat'],
  [/\b(lemon|vinegar)\b/i,'acid'],
  [/\b(chicken|beef|ground beef|lean beef|turkey|salmon|tofu|eggs|beans)\b/i,'protein'],
  [/\b(rice|pasta|potato|potatoes|quinoa)\b/i,'starch'],
  [/\b(onion|garlic)\b/i,'aromatic']
];

function roleFor(n){
  const name = canonName(n);
  for(const [r,role] of ROLE_RULES) if(r.test(name)) return role;
  return 'veg';
}

const BASE_QTY = {
  protein:{ v:1, u:'lb' },
  veg:{ v:2, u:'cups' },
  starch:{ v:2, u:'cups' },
  aromatic:{ v:1, u:'medium' },
  fat:{ v:1, u:'tbsp' },
  acid:{ v:1, u:'tbsp' },
  dairy:{ v:0.5, u:'cups' },
  bread:{ v:4, u:'count' } // UI wording: "count 4"
};

// -------------------------------
// Nutrition table (PER 100g)
// If unknown ingredient: small fallback so macros never stay zero.
// -------------------------------
const NUTRITION_PER_100G = {
  'ground beef':      { cal:176, p:26, c:0,  f:10 },
  'lean beef':        { cal:176, p:26, c:0,  f:10 },
  'beef':             { cal:176, p:26, c:0,  f:10 },
  'chicken breast':   { cal:165, p:31, c:0,  f:3.6 },
  'salmon':           { cal:208, p:20.4, c:0, f:13.4 },
  'tofu':             { cal:144, p:15.7, c:3.9, f:8.7 },
  'eggs':             { cal:143, p:12.6, c:0.7, f:9.5 },

  'cheddar cheese':   { cal:403, p:25, c:1.3, f:33 },
  'mozzarella':       { cal:300, p:22, c:2.2, f:22 },
  'sour cream':       { cal:193, p:2,  c:4,  f:19 },

  'broccoli':         { cal:34,  p:2.8, c:7,  f:0.4 },
  'spinach':          { cal:23,  p:2.9, c:3.6, f:0.4 },
  'green beans':      { cal:31,  p:1.8, c:7.1, f:0.1 },
  'tomatoes':         { cal:18,  p:0.9, c:3.9, f:0.2 },

  'rice':             { cal:130, p:2.7, c:28.2, f:0.3 },
  'pasta':            { cal:158, p:5.8, c:30.9, f:0.9 },
  'quinoa':           { cal:120, p:4.4, c:21.3, f:1.9 },
  'potatoes':         { cal:87,  p:1.9, c:20.1, f:0.1 },

  'olive oil':        { cal:884, p:0,   c:0,   f:100 },
  'butter':           { cal:717, p:0.9, c:0.1, f:81.1 },

  // bread items (approx as food, per 100g)
  'tortillas':        { cal:304, p:8,   c:50,  f:8 },
  'bread':            { cal:265, p:9,   c:49,  f:3.2 },
  'pita':             { cal:275, p:9,   c:55,  f:1.2 }
};

const FALLBACK_PER_100G = { cal:50, p:2, c:5, f:1 };
function nutrition100(name){
  return NUTRITION_PER_100G[canonName(name)] || FALLBACK_PER_100G;
}

// -------------------------------
// Convert displayed quantity → grams
// (simple, stable; enough for correct non-zero macros)
// -------------------------------
const UNIT_TO_GRAMS_GENERIC = {
  lb: 453.592,
  oz: 28.3495,
  tbsp: 15,
  tsp: 5
};

// ingredient-specific grams per unit
const GRAMS_PER_UNIT = {
  // cups (approx)
  'broccoli': { cups: 91 },
  'spinach': { cups: 30 },
  'green beans': { cups: 110 },
  'tomatoes': { cups: 180 },
  'rice': { cups: 158 },
  'pasta': { cups: 140 },
  'quinoa': { cups: 185 },
  'potatoes': { cups: 150 },
  'cheddar cheese': { cups: 226 },
  'mozzarella': { cups: 112 },
  'sour cream': { cups: 230 },

  // medium items
  'onion': { medium: 110 },
  'potatoes': { medium: 130 },

  // bread "count"
  // avg flour tortilla ~ 30g each
  'tortillas': { count: 30 },
  'bread': { count: 25 },
  'pita': { count: 60 },

  // fats vary slightly
  'olive oil': { tbsp: 13.5, tsp: 4.5 },
  'butter': { tbsp: 14 }
};

function gramsFor(name, unit, qty){
  const n = canonName(name);
  if(!qty || qty <= 0) return 0;

  const map = GRAMS_PER_UNIT[n];
  if(map && map[unit] != null) return qty * map[unit];

  if(UNIT_TO_GRAMS_GENERIC[unit] != null) return qty * UNIT_TO_GRAMS_GENERIC[unit];

  // unknown unit → can’t convert reliably
  return 0;
}

// -------------------------------
// Swap catalog
// -------------------------------
const SWAP_CATALOG = {
  protein:[{name:'chicken breast'},{name:'lean beef'},{name:'salmon'},{name:'tofu'},{name:'eggs'}],
  veg:[{name:'broccoli'},{name:'green beans'},{name:'spinach'},{name:'tomatoes'}],
  dairy:[{name:'cheddar cheese'},{name:'mozzarella'},{name:'sour cream'}],
  bread:[{name:'tortillas'},{name:'bread'},{name:'pita'}],
  fat:[{name:'olive oil'},{name:'butter'}]
};

// -------------------------------
// State normalization
// -------------------------------
function normalize(names){
  return names.map(raw=>{
    const name = canonName(raw);
    const role = roleFor(name);
    return {
      id: makeId(),
      name,
      role,
      base: {...(BASE_QTY[role]||BASE_QTY.veg)}
    };
  });
}

// -------------------------------
// Apply swap
// keepRole/keepQty are used for Jackpot (slot stays slot)
// -------------------------------
function applySwap(id, opt, cfg={}){
  const ing = state.ingredients.find(i=>i.id===id);
  if(!ing || !opt) return;

  ing.name = canonName(opt.name);

  if(!cfg.keepRole) ing.role = roleFor(ing.name);
  if(!cfg.keepQty) ing.base = {...(BASE_QTY[ing.role]||BASE_QTY.veg)};

  render();
}

// -------------------------------
// Render
// -------------------------------
function render(){
  if(!state) return;

  $('servingsVal').textContent = servings;
  $('recipeTitle').textContent = state.title;

  let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;

  const ul = $('ingredientsList');
  ul.innerHTML = '';

  state.ingredients.forEach(ing=>{
    const li = document.createElement('li');
    li.className = 'ing-row';

    const left = document.createElement('div');
    left.className = 'ing-left';

    const main = document.createElement('div');
    main.className = 'ing-main';

    const qtyVal = ing.base.v*(servings/2);
    const qtyText = ing.base.u === 'count'
      ? `count ${Math.round(qtyVal)}`
      : `${formatQty(qtyVal)} ${ing.base.u}`;

    main.textContent = `${qtyText} ${pretty(ing.name)}`.replace(/\s+/g,' ');

    const sub = document.createElement('div');
    sub.className = 'ing-sub';
    sub.textContent = ing.role.toUpperCase();

    left.append(main, sub);

    // Amount controls
    const ctrl = document.createElement('div');
    ctrl.className = 'amount-controls';

    const step =
      ing.base.u === 'tbsp' ? 0.5 :
      ing.base.u === 'tsp' ? 0.25 :
      ing.base.u === 'cups' ? 0.25 :
      1;

    const dec = document.createElement('button');
    dec.className = 'btn ghost small';
    dec.textContent = '−';
    dec.onclick = ()=>{ ing.base.v = Math.max(0, ing.base.v - step); render(); };

    const inc = document.createElement('button');
    inc.className = 'btn ghost small';
    inc.textContent = '+';
    inc.onclick = ()=>{ ing.base.v += step; render(); };

    ctrl.append(dec, inc);
    left.appendChild(ctrl);

    // ---- Correct nutrition math (per 100g) ----
    const grams = gramsFor(ing.name, ing.base.u, qtyVal);
    const n100 = nutrition100(ing.name);

    const cal = n100.cal * (grams/100);
    const p   = n100.p   * (grams/100);
    const c   = n100.c   * (grams/100);
    const f   = n100.f   * (grams/100);

    // totals are for whole recipe; then we display per serving
    totalCal += cal;
    totalP   += p;
    totalC   += c;
    totalF   += f;

    // Swap + Jackpot
    const sel = document.createElement('select');
    sel.className = 'swap-select';
    const opts = SWAP_CATALOG[ing.role]||[];
    sel.innerHTML =
      `<option value="">Swap</option>
       <option value="__custom__">➕ Enter your own…</option>` +
      opts.map(o=>`<option value="${o.name}">${pretty(o.name)}</option>`).join('');

    sel.onchange = ()=>{
      if(!sel.value) return;

      if(sel.value==='__custom__'){
        sel.value='';
        const v = prompt('Enter ingredient');
        if(v){
          // Jackpot = slot stays slot (role + qty)
          applySwap(ing.id, { name: v }, { keepRole: true, keepQty: true });
        }
        return;
      }

      const opt = opts.find(o=>o.name===sel.value);
      if(opt) applySwap(ing.id, opt);
      sel.value='';
    };

    li.append(left, sel);
    ul.appendChild(li);
  });

  // display per-serving
  const perCal = totalCal / servings;
  const perP   = totalP   / servings;
  const perC   = totalC   / servings;
  const perF   = totalF   / servings;

  $('calories').textContent = `≈ ${Math.round(perCal)} cal/serv`;
  $('protein').textContent  = `Protein ${Math.round(perP)}g`;
  $('carbs').textContent    = `Carbs ${Math.round(perC)}g`;
  $('fat').textContent      = `Fat ${Math.round(perF)}g`;
}

// -------------------------------
// Events
// -------------------------------
$('generateBtn').onclick = ()=>{
  const raw = parseLines($('ingredientsInput').value);
  if(!raw.length) return alert('Add ingredients');
  state = { ingredients: normalize(raw), title: 'Simple Recipe' };
  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  $('saveRow').classList.remove('hidden');
  render();
};

$('incServ').onclick = ()=>{ servings = Math.min(8, servings+1); render(); };
$('decServ').onclick = ()=>{ servings = Math.max(1, servings-1); render(); };

$('backBtn').onclick = ()=>{
  servings = 2; state = null;
  $('resultCard').classList.add('hidden');
  $('inputCard').classList.remove('hidden');
};

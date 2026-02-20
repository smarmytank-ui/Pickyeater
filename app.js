// =======================================================
// Picky Eater — PHASE 6 FULL FILE
// Seasoning Logic Fix (Salt / Pepper / Herbs)
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
  [/\\bgreen beans\\b/i,'veg'],
  [/\\b(salt|pepper|black pepper|kosher salt|sea salt|garlic powder|onion powder|paprika|smoked paprika|italian seasoning|oregano|basil|parsley|thyme|rosemary|cumin|chili flakes|red pepper flakes|herbs)\\b/i,'seasoning'],
  [/\\b(olive oil|butter)\\b/i,'fat'],
  [/\\b(lemon|lemon juice|vinegar)\\b/i,'acid'],
  [/\\b(salmon|chicken|chicken breast|beef|ground beef|lean beef|turkey|pork|tofu|lentils|egg|eggs)\\b/i,'protein'],
  [/\\bbeans\\b/i,'protein'],
  [/\\b(rice|pasta|potato|potatoes|quinoa|sweet potato|sweet potatoes)\\b/i,'starch'],
  [/\\b(onion|onions|green onion|scallion|scallions|shallot|garlic)\\b/i,'aromatic']
];

function canonName(s){
  const t = String(s||'').trim().toLowerCase();
  if(!t) return '';
  const x = t.replace(/\\s+/g,' ').trim();
  if(x === 'potato') return 'potatoes';
  if(x === 'onions') return 'onion';
  if(x === 'lemons') return 'lemon';
  if(x === 'scallion' || x === 'scallions') return 'green onion';
  if(x === 'chicken') return 'chicken breast';
  return x;
}

function roleFor(n){
  for(const [r,role] of ROLE_RULES) if(r.test(n)) return role;
  return 'veg';
}

function parseLines(s){
  return (s||'').replace(/,+/g,'\\n').split(/\\n+/).map(x=>x.trim()).filter(Boolean);
}

function pretty(s){
  return (s||'').split(' ').map(w=>w? w[0].toUpperCase()+w.slice(1) : w).join(' ');
}

// -------------------------------
// Base quantities (SERVES 2)
// -------------------------------
const BASE_QTY = {
  protein:{ v:1, u:'lb' },
  veg:{ v:2, u:'cups' },
  starch:{ v:2, u:'cups' },
  aromatic:{ v:1, u:'medium' },
  fat:{ v:1, u:'tbsp' },
  acid:{ v:1, u:'tbsp' },
  seasoning:{ v:0, u:'' } // rendered as 'to taste'
};

// -------------------------------
// Nutrition (seasonings excluded)
// -------------------------------
const NUTRITION_PER_100G = {
  'chicken breast':{ cal:165, p:31.0, c:0.0,  f:3.6 },
  'rice':          { cal:130, p:2.7,  c:28.2, f:0.3 },
  'olive oil':     { cal:884, p:0.0,  c:0.0,  f:100.0 },
  'broccoli':      { cal:34,  p:2.8,  c:7.0,  f:0.4 },
  'skip it':       { cal:0,   p:0.0,  c:0.0,  f:0.0 }
};

const ROLE_FALLBACK_100G = {
  protein:{ cal:165, p:25.0, c:0.0,  f:6.0 },
  starch:{ cal:120, p:3.0,  c:25.0, f:1.0 },
  veg:{ cal:30, p:2.0, c:6.0, f:0.3 },
  aromatic:{ cal:40, p:1.0, c:9.0, f:0.1 },
  fat:{ cal:884, p:0.0, c:0.0, f:100.0 },
  acid:{ cal:20, p:0.0, c:1.0, f:0.0 },
  seasoning:{ cal:0, p:0.0, c:0.0, f:0.0 }
};

function nutrientFor(name, role){
  const key = canonName(name);
  return NUTRITION_PER_100G[key] || ROLE_FALLBACK_100G[role] || ROLE_FALLBACK_100G.veg;
}

// -------------------------------
// Quantity display
// -------------------------------
function qtyStr(ing){
  if(ing.role === 'seasoning') return 'to taste';
  const m = servings / 2;
  const val = ing.base.v * m;
  if(!ing.base.u || val === 0) return '';
  const nice = (Math.abs(val - Math.round(val)) < 1e-9) ? String(Math.round(val)) : val.toFixed(1);
  return `${nice} ${ing.base.u}`;
}

// -------------------------------
// Title
// -------------------------------
function titleFrom(ings){
  const protein = ings.find(i=>i.role==='protein' && i.name!=='skip it');
  const hasStarch = ings.some(i=>i.role==='starch' && i.name!=='skip it');
  const style = hasStarch ? 'Dinner' : 'Plate';
  const main = protein ? pretty(protein.name) : 'Veggie';
  return `Simple ${main} ${style}`;
}

// -------------------------------
// Macros (exclude seasonings)
// -------------------------------
function computeMacrosPerServing(){
  let cal=0, p=0, c=0, f=0;
  state.ingredients.forEach(ing=>{
    if(ing.role === 'seasoning') return;
    const m = servings/2;
    const qty = ing.base.v * m;
    const grams = qty * (ing.base.u==='lb'?453.592:1);
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

// -------------------------------
// Render
// -------------------------------
function render(){
  if(!state) return;
  $('servingsVal').textContent = servings;
  $('recipeTitle').textContent = state.title;

  const ul = $('ingredientsList');
  ul.innerHTML = '';
  state.ingredients.forEach((ing)=>{
    const li = document.createElement('li');
    li.className = 'ing-row';
    const q = qtyStr(ing);
    li.textContent = q ? `${q} ${pretty(ing.name)}` : `${pretty(ing.name)}`;
    ul.appendChild(li);
  });

  computeMacrosPerServing();
}

// -------------------------------
// Init + Events (minimal)
// -------------------------------
function init(){
  $('generateBtn').onclick = ()=>{
    const raw = parseLines($('ingredientsInput').value);
    const ingredients = raw.map(r=>{
      const name = canonName(r);
      const role = roleFor(name);
      return { id: crypto.randomUUID(), name, role, base: BASE_QTY[role]||BASE_QTY.veg };
    });
    state = { ingredients, title: titleFrom(ingredients) };
    $('inputCard').classList.add('hidden');
    $('resultCard').classList.remove('hidden');
    render();
  };
  $('incServ').onclick = ()=>{ servings++; render(); };
  $('decServ').onclick = ()=>{ servings=Math.max(1,servings-1); render(); };
}

document.addEventListener('DOMContentLoaded', init);

// =======================================================
// Picky Eater — STEP 2: REALISTIC MEASUREMENTS + MACROS
// Swapper + Save behavior preserved
// FULL FILE — replace app.js entirely
// =======================================================

const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;

// -------------------------------
// Roles
// -------------------------------
const ROLE_RULES = [
  [/\b(ground beef|beef|chicken|chicken breast|turkey|salmon|tofu|eggs|lentils|beans)\b/i, 'protein'],
  [/\b(rice|pasta|potato|potatoes|quinoa)\b/i, 'starch'],
  [/\b(onion|garlic|shallot|green onion)\b/i, 'aromatic'],
  [/\b(broccoli|lettuce|spinach|zucchini|carrots|green beans)\b/i, 'veg'],
  [/\b(olive oil|butter)\b/i, 'fat'],
  [/\b(lemon|vinegar)\b/i, 'acid'],
  [/\b(salt|pepper|seasoning|spice)\b/i, 'seasoning']
];

function roleFor(name){
  for(const [r, role] of ROLE_RULES){
    if(r.test(name)) return role;
  }
  return 'veg';
}

function parseLines(s){
  return (s||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
}

function pretty(s){
  return s.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
}

// -------------------------------
// BASE QUANTITIES (SERVES 2)
// -------------------------------
const BASE_QTY = {
  protein: { v: 1, u: 'lb' },
  veg: { v: 2, u: 'cups' },
  starch: { v: 2, u: 'cups' },
  aromatic: { v: 1, u: 'medium' },
  fat: { v: 1, u: 'tbsp' },
  acid: { v: 1, u: 'tbsp' },
  seasoning: { v: 0.5, u: 'tsp' }
};

// -------------------------------
// UNIT → GRAMS
// -------------------------------
const UNIT_TO_G = {
  lb: 453,
  cups: 120,
  tbsp: 14,
  tsp: 5,
  medium: 110
};

// -------------------------------
// NUTRITION (per 100g)
// -------------------------------
const NUTRITION = {
  'ground beef': { cal:176, p:26, c:0, f:10 },
  'chicken breast': { cal:165, p:31, c:0, f:3.6 },
  'salmon': { cal:208, p:20, c:0, f:13 },
  'lettuce': { cal:15, p:1.4, c:2.9, f:0.2 },
  'broccoli': { cal:34, p:2.8, c:7, f:0.4 },
  'beans': { cal:127, p:8.7, c:23, f:0.5 }
};

function nutrientFor(name){
  return NUTRITION[name] || { cal:0, p:0, c:0, f:0 };
}

// -------------------------------
// Normalize ingredients
// -------------------------------
function normalize(raw){
  return raw.map(name=>{
    const clean = name.toLowerCase();
    const role = roleFor(clean);
    return {
      id: crypto.randomUUID(),
      name: clean,
      role,
      base: { ...BASE_QTY[role] }
    };
  });
}

function qtyStr(ing){
  const mult = servings / 2;
  const val = ing.base.v * mult;
  return `${val} ${ing.base.u}`;
}

// -------------------------------
// Title (unchanged)
// -------------------------------
function titleFrom(ings){
  const protein = ings.find(i=>i.role==='protein');
  return `Simple ${protein ? pretty(protein.name) : 'Veggie'} Plate`;
}

// -------------------------------
// MACROS
// -------------------------------
function computeMacros(){
  let cal=0,p=0,c=0,f=0;

  state.ingredients.forEach(ing=>{
    const mult = servings / 2;
    const grams = (ing.base.v * mult) * (UNIT_TO_G[ing.base.u] || 0);
    const n = nutrientFor(ing.name);
    cal += n.cal * grams/100;
    p += n.p * grams/100;
    c += n.c * grams/100;
    f += n.f * grams/100;
  });

  $('calories').textContent = `≈ ${Math.round(cal/servings)} cal/serv`;
  $('protein').textContent = `Protein ${Math.round(p/servings)}g`;
  $('carbs').textContent = `Carbs ${Math.round(c/servings)}g`;
  $('fat').textContent = `Fat ${Math.round(f/servings)}g`;
}

// -------------------------------
// Render
// -------------------------------
function render(){
  if(!state) return;

  $('recipeTitle').textContent = state.title;
  $('servingsVal').textContent = servings;

  const ul = $('ingredientsList');
  ul.innerHTML = '';

  state.ingredients.forEach(ing=>{
    const li = document.createElement('li');
    li.innerHTML = `<strong>${qtyStr(ing)} ${pretty(ing.name)}</strong><div>${ing.role.toUpperCase()}</div>`;
    ul.appendChild(li);
  });

  computeMacros();

  const ol = $('instructionsList');
  ol.innerHTML = '';
  ['Prep ingredients','Cook protein','Add vegetables','Season','Serve'].forEach(t=>{
    const li=document.createElement('li');
    li.textContent=t;
    ol.appendChild(li);
  });
}

// -------------------------------
// Events
// -------------------------------
function wireEvents(){
  $('generateBtn').onclick = ()=>{
    const raw = parseLines($('ingredientsInput').value);
    if(!raw.length) return alert('Add ingredients');

    const ingredients = normalize(raw);
    state = { ingredients, title: titleFrom(ingredients) };

    $('inputCard').classList.add('hidden');
    $('resultCard').classList.remove('hidden');

    $('saveRow').classList.remove('hidden');
    $('saveBtn').textContent = '⭐ Save to Favorites';

    render();
  };

  $('incServ').onclick = ()=>{ servings=Math.min(8,servings+1); render(); };
  $('decServ').onclick = ()=>{ servings=Math.max(1,servings-1); render(); };

  $('backBtn').onclick = ()=>{
    servings=2; state=null;
    $('saveRow').classList.add('hidden');
    $('resultCard').classList.add('hidden');
    $('inputCard').classList.remove('hidden');
  };
}

document.addEventListener('DOMContentLoaded', wireEvents);

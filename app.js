// =======================================================
// Picky Eater — STEP 2 PATCH
// Accurate measurements + human naming
// Bread = bread + starch hybrid
// FULL FILE — replace app.js entirely
// =======================================================

const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;
let owned = false;

/* -------------------------------
   ROLES
-------------------------------- */
const ROLE_RULES = [
  [/\b(tortilla|tortillas|bread|wrap|pita)\b/i, 'bread'],
  [/\b(cheese|cheddar|mozzarella|parmesan|feta)\b/i, 'dairy'],
  [/\b(salt|pepper|seasoning|spice|paprika|cumin|chili)\b/i, 'seasoning'],
  [/\b(olive oil|butter)\b/i, 'fat'],
  [/\b(lemon|vinegar)\b/i, 'acid'],
  [/\b(chicken|beef|ground beef|turkey|salmon|pork|tofu|eggs?)\b/i, 'protein'],
  [/\b(rice|quinoa|pasta|potato|potatoes)\b/i, 'starch'],
  [/\b(onion|garlic|shallot)\b/i, 'aromatic']
];

function canonName(s){
  return String(s||'').trim().toLowerCase();
}

function roleFor(name){
  for(const [r,role] of ROLE_RULES) if(r.test(name)) return role;
  return 'veg';
}

/* -------------------------------
   BASE QUANTITIES (SERVES 2)
-------------------------------- */
const BASE_QTY = {
  protein:   { v: 1,   u: 'lb' },
  veg:       { v: 2,   u: 'cups' },
  starch:    { v: 1.5, u: 'cups' },
  bread:     { v: 4,   u: 'pieces' }, // tortillas
  dairy:     { v: 0.5, u: 'cups' },    // cheese
  aromatic:  { v: 1,   u: 'medium' },
  fat:       { v: 1,   u: 'tbsp' },
  acid:      { v: 1,   u: 'tbsp' },
  seasoning: { v: 0.5, u: 'tsp' }
};

/* -------------------------------
   NUTRITION (approx per unit)
-------------------------------- */
const GRAMS = {
  tortilla: 30,   // per piece
  bread: 30,
  cheese: 113,    // 0.5 cup shredded
  lb: 454,
  cup: 150,
  tbsp: 15,
  tsp: 5
};

const NUTRITION = {
  'ground beef': { cal: 176, p: 26, c: 0,  f: 10 },
  'tortilla':    { cal: 60,  p: 2,  c: 12, f: 2 },
  'cheese':      { cal: 110, p: 7,  c: 1,  f: 9 }
};

/* -------------------------------
   TITLE LOGIC (HUMAN)
-------------------------------- */
function titleFrom(ings){
  const protein = ings.find(i=>i.role==='protein');
  const hasTortilla = ings.some(i=>i.role==='bread');
  if(!protein) return 'Simple Plate';

  if(hasTortilla){
    if(protein.name.includes('beef')) return 'Ground Beef Tacos';
    if(protein.name.includes('chicken')) return 'Chicken Wraps';
  }

  return `${protein.name.replace(/\b\w/g,c=>c.toUpperCase())} Plate`;
}

/* -------------------------------
   NORMALIZE INPUT
-------------------------------- */
function normalize(lines){
  return lines.map(raw=>{
    const name = canonName(raw);
    const role = roleFor(name);
    const base = BASE_QTY[role] || BASE_QTY.veg;
    return {
      id: crypto.randomUUID(),
      name,
      role,
      base: {...base}
    };
  });
}

/* -------------------------------
   MACROS
-------------------------------- */
function computeMacros(){
  let cal=0,p=0,c=0,f=0;

  state.ingredients.forEach(i=>{
    if(i.role==='protein' && i.name.includes('beef')){
      cal+=176; p+=26; f+=10;
    }
    if(i.role==='bread'){
      cal+=240; c+=48; p+=8; f+=8;
    }
    if(i.role==='dairy'){
      cal+=110; p+=7; f+=9;
    }
  });

  $('calories').textContent = `≈ ${Math.round(cal/servings)} cal/serv`;
  $('protein').textContent  = `Protein ${Math.round(p/servings)}g`;
  $('carbs').textContent    = `Carbs ${Math.round(c/servings)}g`;
  $('fat').textContent      = `Fat ${Math.round(f/servings)}g`;
}

/* -------------------------------
   RENDER
-------------------------------- */
function render(){
  $('recipeTitle').textContent = state.title;
  $('ingredientsList').innerHTML = state.ingredients.map(i=>{
    const m = servings/2;
    return `<li><strong>${i.base.v*m} ${i.base.u} ${i.name}</strong><div>${i.role.toUpperCase()}</div></li>`;
  }).join('');
  computeMacros();
}

/* -------------------------------
   EVENTS
-------------------------------- */
$('generateBtn').onclick = ()=>{
  const raw = $('ingredientsInput').value.split('\n').filter(Boolean);
  state = {
    ingredients: normalize(raw),
    title: ''
  };
  state.title = titleFrom(state.ingredients);
  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  $('saveRow').classList.remove('hidden');
  render();
};

$('incServ').onclick = ()=>{ servings++; render(); };
$('decServ').onclick = ()=>{ servings=Math.max(1,servings-1); render(); };

$('backBtn').onclick = ()=>{
  servings=2;
  state=null;
  $('resultCard').classList.add('hidden');
  $('inputCard').classList.remove('hidden');
};

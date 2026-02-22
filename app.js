// =======================================================
// Picky Eater — LOCKED FOUNDATION PATCH
// STEP 1 FIX: Save visible after Generate (not swap-gated)
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
  [/\bgreen beans\b/i,'veg'],
  [/\b(salt|pepper|black pepper|kosher salt|sea salt|garlic powder|onion powder|paprika|smoked paprika|italian seasoning|oregano|basil|parsley|thyme|rosemary|cumin|chili flakes|red pepper flakes|herbs)\b/i,'seasoning'],
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
  return t.replace(/\s+/g,' ');
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
// Base quantities
// -------------------------------
const BASE_QTY = {
  protein:{ v:1, u:'lb' },
  veg:{ v:2, u:'cups' },
  starch:{ v:2, u:'cups' },
  aromatic:{ v:1, u:'medium' },
  fat:{ v:1, u:'tbsp' },
  acid:{ v:1, u:'tbsp' },
  seasoning:{ v:0.5, u:'tsp' }
};

// -------------------------------
// Instructions (unchanged)
// -------------------------------
const INSTR = {
  prep:'Wash and prep everything.',
  cook_meat:'Cook protein until done.',
  cook_veg:'Cook vegetables.',
  season:'Season to taste.',
  combine:'Combine and serve.'
};

function buildInstructions(){
  return [
    { text: INSTR.prep },
    { text: INSTR.cook_meat },
    { text: INSTR.cook_veg },
    { text: INSTR.season },
    { text: INSTR.combine }
  ];
}

// -------------------------------
// Normalize ingredients
// -------------------------------
function normalize(names){
  return names.map(raw=>{
    const name = canonName(raw);
    const role = roleFor(name);
    return {
      id: crypto.randomUUID(),
      name,
      role,
      base: { ...(BASE_QTY[role] || BASE_QTY.veg) }
    };
  });
}

function qtyStr(ing){
  const m = servings / 2;
  const val = ing.base.v * m;
  if(!ing.base.u || val === 0) return '';
  return `${val} ${ing.base.u}`;
}

function titleFrom(ings){
  const protein = ings.find(i=>i.role==='protein');
  return `Simple ${protein ? pretty(protein.name) : 'Veggie'} Plate`;
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
    li.textContent = `${qtyStr(ing)} ${pretty(ing.name)}`;
    ul.appendChild(li);
  });
}

// -------------------------------
// Events
// -------------------------------
function wireEvents(){
  const gen = $('generateBtn');
  const inc = $('incServ');
  const dec = $('decServ');
  const saveBtn = $('saveBtn');
  const backBtn = $('backBtn');

  gen.onclick = ()=>{
    const raw = parseLines($('ingredientsInput').value);
    if(!raw.length) return alert('Add ingredients');

    const ingredients = normalize(raw);
    state = {
      ingredients,
      title: titleFrom(ingredients),
      steps: buildInstructions()
    };

    // 🔑 STEP 1 FIX: SHOW SAVE IMMEDIATELY
    const sr = $('saveRow');
    if(sr) sr.classList.remove('hidden');
    if(saveBtn) saveBtn.textContent = '⭐ Save to Favorites';

    $('inputCard').classList.add('hidden');
    $('resultCard').classList.remove('hidden');

    render();
  };

  inc.onclick = ()=>{
    servings = Math.min(8, servings+1);
    render();
  };

  dec.onclick = ()=>{
    servings = Math.max(1, servings-1);
    render();
  };

  saveBtn.onclick = ()=>{
    if(!state) return;
    saveBtn.textContent = '✓ Saved';
  };

  backBtn.onclick = ()=>{
    servings = 2;
    state = null;
    owned = false;

    const sr = $('saveRow');
    if(sr) sr.classList.add('hidden');

    $('resultCard').classList.add('hidden');
    $('inputCard').classList.remove('hidden');
  };
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', wireEvents);
} else {
  wireEvents();
}

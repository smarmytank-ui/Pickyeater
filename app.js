// =======================================================
// Picky Eater — LOCKED FOUNDATION PATCH (STEP 2 FIXED)
// Roles fixed: dairy + bread
// Quantities fixed: cheese + tortillas
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
  // veg specifics
  [/\bgreen beans\b/i,'veg'],

  // seasoning
  [/\b(salt|pepper|black pepper|garlic powder|onion powder|paprika|smoked paprika|italian seasoning|oregano|basil|parsley|thyme|rosemary|cumin|chili flakes|red pepper flakes|taco seasoning|herbs)\b/i,'seasoning'],

  // fats
  [/\b(olive oil|butter)\b/i,'fat'],

  // acid
  [/\b(lemon|lemon juice|vinegar|lime|lime juice)\b/i,'acid'],

  // dairy
  [/\b(cheddar|cheese|mozzarella|parmesan|feta|jack cheese|colby)\b/i,'dairy'],

  // bread / wraps
  [/\b(tortilla|tortillas|bread|wrap|wraps|pita|naan|bun|buns)\b/i,'bread'],

  // protein
  [/\b(salmon|chicken|chicken breast|beef|ground beef|lean beef|turkey|pork|tofu|lentils|egg|eggs)\b/i,'protein'],
  [/\bbeans\b/i,'protein'],

  // starch
  [/\b(rice|pasta|potato|potatoes|quinoa|sweet potato|sweet potatoes)\b/i,'starch'],

  // aromatics
  [/\b(onion|onions|green onion|scallion|scallions|shallot|garlic)\b/i,'aromatic']
];

function canonName(s){
  return String(s||'')
    .trim()
    .toLowerCase()
    .replace(/\s+/g,' ');
}

function roleFor(n){
  for(const [r,role] of ROLE_RULES){
    if(r.test(n)) return role;
  }
  return 'veg';
}

function parseLines(s){
  return (s||'')
    .replace(/,+/g,'\n')
    .split(/\n+/)
    .map(x=>x.trim())
    .filter(Boolean);
}

function pretty(s){
  return s.split(' ')
    .map(w=>w.charAt(0).toUpperCase()+w.slice(1))
    .join(' ');
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
  seasoning:{ v:0.5, u:'tsp' },

  // NEW ROLES
  dairy:{ v:0.5, u:'cups' },     // ✅ cheese
  bread:{ v:4, u:'pieces' }      // ✅ tortillas
};

// -------------------------------
// Nutrition (simplified / unchanged)
// -------------------------------
const NUTRITION_PER_100G = {
  'ground beef':{ cal:176,p:26,c:0,f:10 },
  'cheddar cheese':{ cal:403,p:25,c:1.3,f:33 },
  'cheese':{ cal:403,p:25,c:1.3,f:33 },
  'tortilla':{ cal:237,p:6.3,c:49,f:2.9 },
  'tortillas':{ cal:237,p:6.3,c:49,f:2.9 }
};

function nutrientFor(name){
  return NUTRITION_PER_100G[name] || { cal:0,p:0,c:0,f:0 };
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
  return `${val} ${ing.base.u}`;
}

// -------------------------------
// Title (unchanged for now — Step 3 later)
// -------------------------------
function titleFrom(ings){
  const protein = ings.find(i=>i.role==='protein');
  return protein ? `Simple ${pretty(protein.name)} Plate` : 'Simple Veggie Plate';
}

// -------------------------------
// Instructions (unchanged)
// -------------------------------
function buildInstructions(){
  return [
    'Prep ingredients.',
    'Cook protein.',
    'Add vegetables.',
    'Season.',
    'Serve.'
  ];
}

// -------------------------------
// Rendering
// -------------------------------
function render(){
  if(!state) return;

  $('recipeTitle').textContent = state.title;

  const ul = $('ingredientsList');
  ul.innerHTML = '';

  state.ingredients.forEach(ing=>{
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${qtyStr(ing)} ${pretty(ing.name)}</strong>
      <div class="ing-sub">${ing.role.toUpperCase()}</div>
    `;
    ul.appendChild(li);
  });

  $('instructionsList').innerHTML =
    buildInstructions().map(s=>`<li>${s}</li>`).join('');
}

// -------------------------------
// Events
// -------------------------------
function wireEvents(){
  $('generateBtn').onclick = ()=>{
    const raw = parseLines($('ingredientsInput').value);
    if(!raw.length) return;

    const ingredients = normalize(raw);

    state = {
      ingredients,
      title: titleFrom(ingredients)
    };

    $('inputCard').classList.add('hidden');
    $('resultCard').classList.remove('hidden');
    $('saveRow').classList.remove('hidden'); // ✅ Save immediately

    render();
  };

  $('backBtn').onclick = ()=>{
    state = null;
    servings = 2;
    $('resultCard').classList.add('hidden');
    $('inputCard').classList.remove('hidden');
    $('saveRow').classList.add('hidden'); // ✅ Hide save
  };
}

document.addEventListener('DOMContentLoaded', wireEvents);

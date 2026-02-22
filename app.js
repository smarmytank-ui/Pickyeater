// =======================================================
// Picky Eater — STABLE SWAPPER + SAVE FIX (LOCKED)
// Matches current index.html exactly
// =======================================================

const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;

// -------------------------------
// Roles & parsing
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
  return (s||'')
    .split(/\n+/)
    .map(x=>x.trim())
    .filter(Boolean);
}

function pretty(s){
  return s.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
}

// -------------------------------
// Swap catalog (LOCKED)
// -------------------------------
const SWAP_CATALOG = {
  protein: ['chicken breast','ground beef','turkey','salmon','tofu','eggs','beans'],
  veg: ['broccoli','spinach','lettuce','zucchini','carrots','green beans'],
  starch: ['rice','pasta','potatoes','quinoa'],
  aromatic: ['onion','garlic','green onion','shallot'],
  fat: ['olive oil','butter','skip it'],
  acid: ['lemon','vinegar','skip it'],
  seasoning: ['salt','pepper','italian seasoning','skip it']
};

// -------------------------------
// Normalize ingredients
// -------------------------------
function normalize(raw){
  return raw.map(name=>{
    const clean = name.toLowerCase();
    return {
      id: crypto.randomUUID(),
      name: clean,
      role: roleFor(clean)
    };
  });
}

// -------------------------------
// Title
// -------------------------------
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

  // Ingredients + swaps
  const ul = $('ingredientsList');
  ul.innerHTML = '';

  state.ingredients.forEach(ing=>{
    const li = document.createElement('li');
    li.className = 'ing-row';

    const left = document.createElement('div');
    left.className = 'ing-left';

    const main = document.createElement('div');
    main.className = 'ing-main';
    main.textContent = pretty(ing.name);

    const sub = document.createElement('div');
    sub.className = 'ing-sub';
    sub.textContent = ing.role.toUpperCase();

    left.append(main, sub);

    const sel = document.createElement('select');
    sel.className = 'swap-select';
    sel.innerHTML =
      `<option value="">Swap</option>` +
      `<option value="__custom__">➕ Enter your own…</option>` +
      (SWAP_CATALOG[ing.role] || []).map(o =>
        `<option value="${o}">${pretty(o)}</option>`
      ).join('');

    sel.onchange = ()=>{
      if(!sel.value) return;

      if(sel.value === '__custom__'){
        const v = prompt('Enter ingredient');
        if(v){
          ing.name = v.toLowerCase();
        }
      } else {
        ing.name = sel.value;
      }

      sel.value = '';
      render();
    };

    li.append(left, sel);
    ul.appendChild(li);
  });

  // Instructions (simple locked)
  const ol = $('instructionsList');
  ol.innerHTML = '';
  [
    'Prep ingredients.',
    'Cook protein.',
    'Add vegetables.',
    'Season to taste.',
    'Serve and enjoy.'
  ].forEach(t=>{
    const li = document.createElement('li');
    li.textContent = t;
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

    state = {
      ingredients,
      title: titleFrom(ingredients)
    };

    $('inputCard').classList.add('hidden');
    $('resultCard').classList.remove('hidden');

    // SHOW SAVE IMMEDIATELY
    $('saveRow').classList.remove('hidden');
    $('saveBtn').textContent = '⭐ Save to Favorites';

    render();
  };

  $('incServ').onclick = ()=>{
    servings = Math.min(8, servings+1);
    render();
  };

  $('decServ').onclick = ()=>{
    servings = Math.max(1, servings-1);
    render();
  };

  $('backBtn').onclick = ()=>{
    servings = 2;
    state = null;
    $('saveRow').classList.add('hidden');
    $('resultCard').classList.add('hidden');
    $('inputCard').classList.remove('hidden');
  };
}

// -------------------------------
// Init
// -------------------------------
document.addEventListener('DOMContentLoaded', wireEvents);

// v1.7.1 — anchored calories (trust-first)

const $ = (id) => document.getElementById(id);
let servings = 2;
let state = null;

// --- role detection
const ROLE_RULES = [
  [/\b(chicken|beef|turkey|pork|tofu|beans|lentils|egg|eggs)\b/i,'protein'],
  [/\b(rice|pasta|potato|potatoes|quinoa)\b/i,'starch'],
  [/\b(onion|onions|garlic|shallot|scallion|green onion)\b/i,'aromatic']
];

// --- base qty (serves 2)
const BASE_QTY = {
  protein:{ v:1, u:'lb' },
  veg:{ v:2, u:'cups' },
  starch:{ v:2, u:'cups' },
  aromatic:{ v:1, u:'medium' }
};

// --- calorie anchors per serving by meal archetype
const CAL_ANCHORS = {
  protein_veg: { min:420, max:560 },
  protein_starch_veg: { min:520, max:680 },
  plant_based: { min:360, max:520 }
};

// --- macro signals (relative, dampened)
const MACRO_SIGNALS = {
  protein: { p: 1.0, c: 0.2, f: 0.5 },
  starch:  { p: 0.2, c: 1.0, f: 0.1 },
  veg:     { p: 0.1, c: 0.3, f: 0.05 },
  aromatic:{ p: 0.05,c: 0.1, f: 0.0 }
};

// --- swaps (qty only; calories anchored separately)
const SWAPS = {
  protein:['turkey','lean beef','tofu','beans','eggs'],
  veg:['zucchini','green beans','carrots','spinach'],
  starch:['rice','pasta','sweet potatoes','quinoa'],
  aromatic:['green onion','shallot','garlic','skip it']
};

function canonName(s){
  s = (s||'').toLowerCase().trim();
  if(s === 'potato') return 'potatoes';
  if(s === 'onions') return 'onion';
  if(s === 'scallions') return 'green onion';
  return s;
}
function roleFor(n){
  for(const [r,v] of ROLE_RULES) if(r.test(n)) return v;
  return 'veg';
}
function parseLines(s){
  return (s||'').replace(/,+/g,'\n').split(/\n+/).map(x=>x.trim()).filter(Boolean);
}
function pretty(s){ return s.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '); }

function normalize(names){
  return names.map(n=>{
    const name = canonName(n);
    const role = roleFor(name);
    return {
      id: crypto.randomUUID(),
      name, role,
      base:{...BASE_QTY[role]}
    };
  });
}

function qtyStr(i){
  const m = servings/2;
  const v = i.base.v * m;
  if(!i.base.u || v===0) return '';
  const n = Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : v.toFixed(1);
  return `${n} ${i.base.u}`;
}

function titleFrom(ings){
  const protein = ings.find(i=>i.role==='protein' && i.name!=='skip it');
  const hasStarch = ings.some(i=>i.role==='starch' && i.name!=='skip it');
  const main = protein ? pretty(protein.name) : 'Veggie';
  return `Simple ${main} ${hasStarch ? 'Dinner' : 'Plate'}`;
}

// --- anchored calories
function computeAnchoredCalories(){
  const hasProtein = state.ingredients.some(i=>i.role==='protein' && i.name!=='skip it');
  const hasStarch = state.ingredients.some(i=>i.role==='starch' && i.name!=='skip it');
  const isPlant = state.ingredients.every(i=>i.role!=='protein' || ['tofu','beans','lentils'].includes(i.name));

  let anchor;
  if(isPlant) anchor = CAL_ANCHORS.plant_based;
  else if(hasProtein && hasStarch) anchor = CAL_ANCHORS.protein_starch_veg;
  else anchor = CAL_ANCHORS.protein_veg;

  // nudge within range based on swaps count
  const swapsCount = state.ingredients.filter(i=>i.name && i._swapped).length;
  const span = anchor.max - anchor.min;
  const nudge = Math.min(span*0.2, swapsCount*span*0.08);
  const cal = anchor.min + span*0.45 + nudge;

  return Math.round(cal);
}

// --- macro direction (relative, dampened)
function computeMacroDirection(){
  let p=0,c=0,f=0;
  state.ingredients.forEach(i=>{
    const m = MACRO_SIGNALS[i.role];
    p += m.p; c += m.c; f += m.f;
  });
  const norm = Math.max(p,c,f,1);
  return {
    p: Math.round((p/norm)*100),
    c: Math.round((c/norm)*100),
    f: Math.round((f/norm)*100)
  };
}

function render(){
  $('servingsVal').textContent = servings;
  $('recipeTitle').textContent = state.title;

  // macros
  const cal = computeAnchoredCalories();
  $('calories').textContent = `≈ ${cal} cal/serv`;

  const md = computeMacroDirection();
  $('protein').textContent = `Protein ${md.p}%`;
  $('carbs').textContent   = `Carbs ${md.c}%`;
  $('fat').textContent     = `Fat ${md.f}%`;

  // ingredients
  const ul = $('ingredientsList'); ul.innerHTML='';
  state.ingredients.forEach(i=>{
    const li = document.createElement('li'); li.className='ing-row';
    const left = document.createElement('div'); left.className='ing-left';
    const main = document.createElement('div'); main.className='ing-main';
    const q = qtyStr(i);
    main.textContent = q ? `${q} ${pretty(i.name)}` : `${pretty(i.name)}`;
    const sub = document.createElement('div'); sub.className='ing-sub'; sub.textContent = i.role.toUpperCase();
    left.append(main,sub);

    const sel = document.createElement('select'); sel.className='swap-select';
    sel.innerHTML = `<option value="">Swap</option>` + (SWAPS[i.role]||[]).map(s=>`<option>${s}</option>`).join('');
    sel.onchange = ()=>{
      if(!sel.value) return;
      i.name = canonName(sel.value);
      i._swapped = true;
      $('saveRow').classList.remove('hidden');
      state.title = titleFrom(state.ingredients);
      render();
      sel.value='';
    };

    li.append(left,sel);
    ul.appendChild(li);
  });

  // instructions
  const ol = $('instructionsList'); ol.innerHTML='';
  [
    'Prep ingredients and season lightly.',
    'Cook protein until done; cook starch if included.',
    'Cook veggies until tender-crisp.',
    'Combine everything, adjust seasoning, and serve.'
  ].forEach(t=>{
    const li = document.createElement('li'); li.textContent=t; ol.appendChild(li);
  });
}

// events
$('generateBtn').onclick = ()=>{
  const raw = parseLines($('ingredientsInput').value);
  if(!raw.length) return alert('Add ingredients');
  const ingredients = normalize(raw);
  state = { ingredients, title:titleFrom(ingredients) };
  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  $('saveRow').classList.add('hidden');
  render();
};
$('incServ').onclick = ()=>{ servings=Math.min(8,servings+1); $('saveRow').classList.remove('hidden'); render(); };
$('decServ').onclick = ()=>{ servings=Math.max(1,servings-1); $('saveRow').classList.remove('hidden'); render(); };
$('saveBtn').onclick = ()=>{
  const saved = JSON.parse(localStorage.getItem('pickyFavorites')||'[]');
  saved.push({ title:state.title, servings, ingredients:state.ingredients, savedAt:new Date().toISOString() });
  localStorage.setItem('pickyFavorites', JSON.stringify(saved));
  $('saveBtn').textContent='✓ Saved';
};
$('backBtn').onclick = ()=>{
  servings=2; state=null;
  $('resultCard').classList.add('hidden');
  $('inputCard').classList.remove('hidden');
};

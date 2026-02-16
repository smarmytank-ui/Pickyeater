// v1.7.0 — merge: smarter swaps + conditional save + macros that actually change
const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;
let owned = false;

// --- role rules
const ROLE_RULES = [
  [/\b(chicken|beef|turkey|pork|tofu|beans|lentils|egg|eggs)\b/i,'protein'],
  [/\b(rice|pasta|potato|potatoes|quinoa)\b/i,'starch'],
  [/\b(onion|onions|garlic|shallot|scallion|green onion)\b/i,'aromatic']
];

// --- base qty for SERVES 2
const BASE_QTY = {
  protein:{ v:1, u:'lb' },
  veg:{ v:2, u:'cups' },
  starch:{ v:2, u:'cups' },
  aromatic:{ v:1, u:'medium' }
};

// --- nutrition "base" (per ingredient) tied to the *same unit/amount* we use for serves-2 defaults.
// These are directional estimates meant for UI framing, not medical precision.
const NUTRI = {
  // proteins
  'chicken':      { baseV:1,  unit:'lb',    cal:750, p:120, c:0,  f:25 },
  'turkey':       { baseV:1,  unit:'lb',    cal:720, p:110, c:0,  f:22 },
  'lean beef':    { baseV:1,  unit:'lb',    cal:800, p:95,  c:0,  f:50 },
  'ground beef':  { baseV:1,  unit:'lb',    cal:800, p:95,  c:0,  f:50 },
  'beef':         { baseV:1,  unit:'lb',    cal:800, p:95,  c:0,  f:50 },
  'tofu':         { baseV:14, unit:'oz',    cal:420, p:45,  c:10, f:25 },
  'beans':        { baseV:2,  unit:'cups',  cal:480, p:30,  c:85, f:2  },
  'eggs':         { baseV:4,  unit:'eggs',  cal:280, p:24,  c:2,  f:20 },

  // starches
  'rice':         { baseV:1.5,unit:'cups',  cal:310, p:6,   c:69, f:1  },
  'pasta':        { baseV:1.5,unit:'cups',  cal:300, p:10,  c:60, f:2  },
  'quinoa':       { baseV:1.25,unit:'cups', cal:280, p:10,  c:50, f:4  },
  'potatoes':     { baseV:2,  unit:'cups',  cal:260, p:6,   c:60, f:0  },
  'sweet potatoes':{baseV:2,  unit:'medium',cal:224, p:4,   c:52, f:0  },

  // veg (per 2 cups, unless noted)
  'broccoli':     { baseV:2,  unit:'cups',  cal:62,  p:5,   c:12, f:1  },
  'zucchini':     { baseV:2,  unit:'cups',  cal:40,  p:3,   c:7,  f:0  },
  'green beans':  { baseV:2,  unit:'cups',  cal:62,  p:4,   c:14, f:0  },
  'carrots':      { baseV:1.5,unit:'cups',  cal:80,  p:2,   c:20, f:0  },
  'spinach':      { baseV:3,  unit:'cups',  cal:21,  p:3,   c:3,  f:0  },

  // aromatics
  'onion':        { baseV:1,  unit:'medium',cal:44,  p:1,   c:10, f:0  },
  'green onion':  { baseV:0.5,unit:'cups',  cal:16,  p:1,   c:4,  f:0  },
  'shallot':      { baseV:1,  unit:'medium',cal:30,  p:1,   c:7,  f:0  },
  'garlic':       { baseV:2,  unit:'cloves',cal:9,   p:0,   c:2,  f:0  },
  'skip it':      { baseV:1,  unit:'',      cal:0,   p:0,   c:0,  f:0  }
};

// --- swap catalog with qty/unit changes + instruction patch keys
const SWAP_CATALOG = {
  protein: [
    { name:'turkey',    qtyMultiplier:1.0, unitOverride:'lb',   baseOverride:1,   instrPatchKey:'cook_meat' },
    { name:'lean beef', qtyMultiplier:1.0, unitOverride:'lb',   baseOverride:1,   instrPatchKey:'cook_meat' },
    { name:'tofu',      qtyMultiplier:1.0, unitOverride:'oz',   baseOverride:14,  instrPatchKey:'cook_tofu' },
    { name:'beans',     qtyMultiplier:1.0, unitOverride:'cups', baseOverride:2,   instrPatchKey:'warm_beans' },
    { name:'eggs',      qtyMultiplier:1.0, unitOverride:'eggs', baseOverride:4,   instrPatchKey:'cook_eggs' }
  ],
  starch: [
    { name:'rice',           qtyMultiplier:1.0, unitOverride:'cups',   baseOverride:1.5, instrPatchKey:'cook_rice' },
    { name:'pasta',          qtyMultiplier:1.0, unitOverride:'cups',   baseOverride:1.5, instrPatchKey:'cook_pasta' },
    { name:'sweet potatoes', qtyMultiplier:1.0, unitOverride:'medium', baseOverride:2,   instrPatchKey:'cook_potato' },
    { name:'quinoa',         qtyMultiplier:1.0, unitOverride:'cups',   baseOverride:1.25,instrPatchKey:'cook_quinoa' }
  ],
  aromatic: [
    { name:'green onion', qtyMultiplier:1.0, unitOverride:'cups',   baseOverride:0.5, instrPatchKey:'add_aromatic' },
    { name:'shallot',     qtyMultiplier:1.0, unitOverride:'medium', baseOverride:1,   instrPatchKey:'add_aromatic' },
    { name:'garlic',      qtyMultiplier:1.0, unitOverride:'cloves', baseOverride:2,   instrPatchKey:'add_garlic' },
    { name:'skip it',     qtyMultiplier:0.0, unitOverride:'',       baseOverride:0,   instrPatchKey:'skip_aromatic' }
  ],
  veg: [
    { name:'zucchini',    qtyMultiplier:1.0, unitOverride:'cups', baseOverride:2,   instrPatchKey:'cook_veg' },
    { name:'green beans', qtyMultiplier:1.0, unitOverride:'cups', baseOverride:2,   instrPatchKey:'cook_veg' },
    { name:'carrots',     qtyMultiplier:1.0, unitOverride:'cups', baseOverride:1.5, instrPatchKey:'cook_veg' },
    { name:'spinach',     qtyMultiplier:1.0, unitOverride:'cups', baseOverride:3,   instrPatchKey:'cook_veg' }
  ]
};

// --- instruction patches
const INSTR_PATCHES = {
  cook_meat:  'Cook the protein in a skillet over medium heat until browned and cooked through.',
  cook_tofu:  'Press and cube tofu, then cook in a skillet until lightly browned and heated through.',
  warm_beans: 'Warm beans gently in a pan; season to taste (avoid overcooking).',
  cook_eggs:  'Cook eggs to your preference (scramble or fry) and season lightly.',
  cook_rice:  'Cook rice (or use pre-cooked) while you prep everything else.',
  cook_pasta: 'Boil pasta until tender; drain and set aside.',
  cook_quinoa:'Cook quinoa until fluffy; let it rest 5 minutes before serving.',
  cook_potato:'Cook potatoes until tender (roast, boil, or microwave), then season.',
  add_aromatic:'Sauté aromatics briefly until fragrant (30–60 seconds).',
  add_garlic: 'Add garlic near the end so it doesn’t burn (30–45 seconds).',
  skip_aromatic:'Skip the aromatic step and season with salt/pepper instead.',
  cook_veg:   'Cook veggies until tender-crisp (steam, sauté, or roast).'
};

function canonName(raw){
  const s = (raw||'').trim().toLowerCase();
  if(s === 'potato') return 'potatoes';
  if(s === 'potatoes') return 'potatoes';
  if(s === 'onions') return 'onion';
  if(s === 'scallion' || s === 'scallions') return 'green onion';
  if(s === 'beef') return 'beef';
  return s;
}

function roleFor(n){
  for(const [r,v] of ROLE_RULES) if(r.test(n)) return v;
  return 'veg';
}

function parseLines(s){
  return (s||'')
    .replace(/,+/g,'\n')
    .split(/\n+/)
    .map(x=>x.trim())
    .filter(Boolean);
}

function normalize(names){
  return names.map(n=>{
    const name = canonName(n);
    const role = roleFor(name);
    return {
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
      name,
      role,
      base: { ...BASE_QTY[role] },
      swapMeta: null
    };
  });
}

function pretty(s){
  return (s||'').split(' ').map(w=>w? w[0].toUpperCase()+w.slice(1):w).join(' ');
}

function qtyStr(i){
  const m = servings/2;
  const val = i.base.v * m;
  const u = i.base.u;
  if(!u || val === 0) return '';
  const nice = (Math.abs(val - Math.round(val)) < 1e-9) ? String(Math.round(val)) : val.toFixed(1);
  return `${nice} ${u}`;
}

function titleFrom(ings){
  const protein = ings.find(i=>i.role==='protein' && i.name!=='skip it');
  const hasStarch = ings.some(i=>i.role==='starch' && i.name!=='skip it');
  const style = hasStarch ? 'Dinner' : 'Plate';
  const main = protein ? pretty(protein.name) : 'Veggie';
  return `Simple ${main} ${style}`;
}

function buildInstructions(){
  const steps = [
    { key:'prep', text:'Prep ingredients and season lightly.' },
    { key:'cook_main', text:'Cook protein until done; cook starch if included.' },
    { key:'veg', text:'Cook veggies until tender-crisp.' },
    { key:'combine', text:'Combine everything, adjust seasoning, and serve.' }
  ];

  const patchKeys = new Set();
  state.ingredients.forEach(i=>{
    if(i.swapMeta && i.swapMeta.instrPatchKey) patchKeys.add(i.swapMeta.instrPatchKey);

    if(i.role === 'aromatic'){
      if(i.name === 'garlic') patchKeys.add('add_garlic');
      else if(i.name === 'skip it') patchKeys.add('skip_aromatic');
      else patchKeys.add('add_aromatic');
    }
    if(i.role === 'veg') patchKeys.add('cook_veg');
    if(i.role === 'starch'){
      if(i.name.includes('rice')) patchKeys.add('cook_rice');
      if(i.name.includes('pasta')) patchKeys.add('cook_pasta');
      if(i.name.includes('quinoa')) patchKeys.add('cook_quinoa');
      if(i.name.includes('potato')) patchKeys.add('cook_potato');
    }
    if(i.role === 'protein'){
      if(i.name.includes('tofu')) patchKeys.add('cook_tofu');
      else if(i.name.includes('bean')) patchKeys.add('warm_beans');
      else if(i.name.includes('egg')) patchKeys.add('cook_eggs');
      else patchKeys.add('cook_meat');
    }
  });

  const patched = steps.map(s=>({ ...s }));

  // aromatic insert/replace near top
  if(patchKeys.has('skip_aromatic')) patched.splice(1, 0, { key:'aromatic', text:INSTR_PATCHES['skip_aromatic'] });
  else if(patchKeys.has('add_garlic')) patched.splice(1, 0, { key:'aromatic', text:INSTR_PATCHES['add_garlic'] });
  else if(patchKeys.has('add_aromatic')) patched.splice(1, 0, { key:'aromatic', text:INSTR_PATCHES['add_aromatic'] });

  // protein step
  const proteinPref = ['cook_tofu','warm_beans','cook_eggs','cook_meat'].find(k=>patchKeys.has(k));
  if(proteinPref){
    const idx = patched.findIndex(s=>s.key==='cook_main');
    patched[idx].text = INSTR_PATCHES[proteinPref];
  }

  // starch step inserted after cook_main
  const starchPref = ['cook_rice','cook_pasta','cook_quinoa','cook_potato'].find(k=>patchKeys.has(k));
  if(starchPref){
    const afterCook = patched.findIndex(s=>s.key==='cook_main');
    patched.splice(afterCook+1, 0, { key:'starch', text:INSTR_PATCHES[starchPref] });
  }

  // veg step
  const vegIdx = patched.findIndex(s=>s.key==='veg');
  if(vegIdx !== -1) patched[vegIdx].text = INSTR_PATCHES['cook_veg'];

  // unique keys
  const seen = new Set();
  const finalSteps = [];
  for(const s of patched){
    if(seen.has(s.key)) continue;
    seen.add(s.key);
    finalSteps.push(s);
  }
  return finalSteps;
}

// --- macros
function macroForIngredient(ing){
  const key = canonName(ing.name);
  // fallback: role defaults (very rough)
  const fallback = {
    protein:{ baseV:1, unit:'lb', cal:750, p:110, c:0, f:25 },
    starch:{ baseV:2, unit:'cups', cal:400, p:10, c:90, f:4 },
    veg:{ baseV:2, unit:'cups', cal:80, p:5, c:15, f:1 },
    aromatic:{ baseV:1, unit:'medium', cal:40, p:1, c:10, f:0 }
  }[ing.role];

  return NUTRI[key] || fallback;
}

function computeMacrosPerServing(){
  // compute total macros for current servings, then divide by servings
  let cal=0,p=0,c=0,f=0;
  const servingScale = servings/2;

  state.ingredients.forEach(ing=>{
    const n = macroForIngredient(ing);
    if(!n.unit || n.cal === 0){
      return;
    }
    // Scale by the ratio of our base quantity (for SERVES 2) to the nutrition baseV,
    // then scale by servings/2.
    const qtyRatio = (n.baseV === 0) ? 0 : (ing.base.v / n.baseV);
    const totalFactor = qtyRatio * servingScale;

    cal += n.cal * totalFactor;
    p   += n.p   * totalFactor;
    c   += n.c   * totalFactor;
    f   += n.f   * totalFactor;
  });

  const per = {
    cal: cal/servings,
    p: p/servings,
    c: c/servings,
    f: f/servings
  };

  $('calories').textContent = `≈ ${Math.round(per.cal)} cal/serv`;
  $('protein').textContent  = `Protein ${Math.round(per.p)}g`;
  $('carbs').textContent    = `Carbs ${Math.round(per.c)}g`;
  $('fat').textContent      = `Fat ${Math.round(per.f)}g`;
}

// --- UI helpers
function bump(el, cls='bump', ms=450){
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls), ms);
}
function flashStep(idx){
  const li = $('instructionsList').querySelectorAll('li')[idx];
  if(!li) return;
  li.classList.add('flash');
  setTimeout(()=>li.classList.remove('flash'), 520);
}

function setOwned(){
  owned = true;
  $('saveRow').classList.remove('hidden');
}

function render(){
  $('servingsVal').textContent = servings;
  $('recipeTitle').textContent = state.title;

  // Ingredients
  const ul = $('ingredientsList'); ul.innerHTML='';
  state.ingredients.forEach((i)=>{
    const li = document.createElement('li'); li.className='ing-row';
    const left = document.createElement('div'); left.className='ing-left';
    const main = document.createElement('div'); main.className='ing-main';
    const q = qtyStr(i);
    main.textContent = q ? `${q} ${pretty(i.name)}` : `${pretty(i.name)}`;
    const sub = document.createElement('div'); sub.className='ing-sub'; sub.textContent = i.role.toUpperCase();
    left.append(main,sub);

    const sel = document.createElement('select'); sel.className='swap-select';
    const opts = SWAP_CATALOG[i.role] || [];
    sel.innerHTML = `<option value="">Swap</option>` + opts.map(o=>`<option value="${o.name}">${pretty(o.name)}</option>`).join('');

    sel.onchange = ()=>{
      const chosen = sel.value;
      if(!chosen) return;
      const opt = opts.find(o=>o.name===chosen);
      applySwap(i.id, opt);
      sel.value = '';
      bump(li);
      setOwned();
      // flash likely affected step
      const steps = state.steps;
      const idx = steps.findIndex(s=> (i.role==='protein' && s.key==='cook_main') ||
                                      (i.role==='starch' && s.key==='starch') ||
                                      (i.role==='aromatic' && s.key==='aromatic'));
      if(idx !== -1) flashStep(idx);
    };

    li.append(left,sel);
    ul.appendChild(li);
  });

  // Instructions
  const ol = $('instructionsList'); ol.innerHTML='';
  state.steps.forEach(s=>{
    const li = document.createElement('li');
    li.textContent = s.text;
    ol.appendChild(li);
  });

  computeMacrosPerServing();
}

function applySwap(ingId, opt){
  const ing = state.ingredients.find(i=>i.id===ingId);
  if(!ing || !opt) return;

  ing.name = opt.name;

  // qty overrides
  if(typeof opt.baseOverride === 'number') ing.base.v = opt.baseOverride;
  if(typeof opt.unitOverride === 'string') ing.base.u = opt.unitOverride;
  if(typeof opt.qtyMultiplier === 'number') ing.base.v = ing.base.v * opt.qtyMultiplier;

  if(opt.name === 'skip it'){
    ing.base.v = 0;
    ing.base.u = '';
  }

  ing.swapMeta = { instrPatchKey: opt.instrPatchKey || null };

  state.title = titleFrom(state.ingredients);
  state.steps = buildInstructions();

  render();
}

$('generateBtn').onclick = ()=>{
  const raw = parseLines($('ingredientsInput').value);
  if(!raw.length) return alert('Add ingredients');
  const ingredients = normalize(raw);
  state = { ingredients, title: titleFrom(ingredients), steps: [] };
  state.steps = buildInstructions();

  owned = false;
  $('saveRow').classList.add('hidden');
  $('saveBtn').textContent = '⭐ Save to Favorites';

  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  render();
};

$('incServ').onclick = ()=>{
  servings = Math.min(8, servings+1);
  setOwned();
  render();
};
$('decServ').onclick = ()=>{
  servings = Math.max(1, servings-1);
  setOwned();
  render();
};

$('saveBtn').onclick = ()=>{
  if(!state) return;
  const saved = JSON.parse(localStorage.getItem('pickyFavorites')||'[]');
  saved.push({
    title: state.title,
    servings,
    ingredients: state.ingredients,
    steps: state.steps,
    macros_per_serving: {
      calories: $('calories').textContent,
      protein: $('protein').textContent,
      carbs: $('carbs').textContent,
      fat: $('fat').textContent
    },
    savedAt: new Date().toISOString()
  });
  localStorage.setItem('pickyFavorites', JSON.stringify(saved));
  $('saveBtn').textContent = '✓ Saved';
};

$('backBtn').onclick = ()=>{
  servings = 2;
  state = null;
  owned = false;
  $('resultCard').classList.add('hidden');
  $('inputCard').classList.remove('hidden');
};

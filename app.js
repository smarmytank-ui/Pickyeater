// v1.5.0 — smarter swaps: quantity + instruction patches (no regen)
const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;

// --- role rules
const ROLE_RULES = [
  [/\b(chicken|beef|turkey|pork|tofu|beans|lentils|egg|eggs)\b/i, 'protein'],
  [/\b(rice|pasta|potato|potatoes|quinoa)\b/i, 'starch'],
  [/\b(onion|onions|garlic)\b/i, 'aromatic']
];

// --- canonicalization
function canonName(raw){
  const s = (raw||'').trim().toLowerCase();
  // basic plural normalization
  if(s === 'potatoes') return 'potatoes';
  if(s === 'onions') return 'onion';
  if(s === 'eggs') return 'eggs';
  return s;
}

// --- base qty for SERVES 2
const BASE = {
  protein: { v: 1, u: 'lb' },
  veg:     { v: 2, u: 'cups' },
  starch:  { v: 2, u: 'cups' },
  aromatic:{ v: 1, u: 'medium' }
};

// --- swap catalogs by role (shown in dropdown)
// Each option can include: name, unitOverride, baseOverride, qtyMultiplier, instrPatchKey
const SWAP_CATALOG = {
  protein: [
    { name:'turkey',   qtyMultiplier: 1.0, unitOverride:'lb', instrPatchKey:'cook_meat' },
    { name:'lean beef',qtyMultiplier: 1.0, unitOverride:'lb', instrPatchKey:'cook_meat' },
    { name:'tofu',     qtyMultiplier: 0.9, unitOverride:'oz', baseOverride: 14, instrPatchKey:'cook_tofu' },
    { name:'beans',    qtyMultiplier: 1.0, unitOverride:'cups', baseOverride: 2.0, instrPatchKey:'warm_beans' },
    { name:'eggs',     qtyMultiplier: 1.0, unitOverride:'eggs', baseOverride: 4, instrPatchKey:'cook_eggs' }
  ],
  starch: [
    { name:'rice',            qtyMultiplier: 0.75, unitOverride:'cups', baseOverride: 1.5, instrPatchKey:'cook_rice' },
    { name:'pasta',           qtyMultiplier: 0.75, unitOverride:'cups', baseOverride: 1.5, instrPatchKey:'cook_pasta' },
    { name:'sweet potatoes',  qtyMultiplier: 1.0, unitOverride:'medium', baseOverride: 2, instrPatchKey:'cook_potato' },
    { name:'quinoa',          qtyMultiplier: 0.75, unitOverride:'cups', baseOverride: 1.25, instrPatchKey:'cook_quinoa' }
  ],
  aromatic: [
    { name:'green onion',  qtyMultiplier: 0.25, unitOverride:'cups', baseOverride: 0.5, instrPatchKey:'add_aromatic' },
    { name:'shallot',      qtyMultiplier: 1.0, unitOverride:'medium', baseOverride: 1, instrPatchKey:'add_aromatic' },
    { name:'garlic',       qtyMultiplier: 0.2, unitOverride:'cloves', baseOverride: 2, instrPatchKey:'add_garlic' },
    { name:'skip it',      qtyMultiplier: 0.0, unitOverride:'', baseOverride: 0, instrPatchKey:'skip_aromatic' }
  ],
  veg: [
    { name:'zucchini',     qtyMultiplier: 1.0, unitOverride:'cups', baseOverride: 2, instrPatchKey:'cook_veg' },
    { name:'green beans',  qtyMultiplier: 1.0, unitOverride:'cups', baseOverride: 2, instrPatchKey:'cook_veg' },
    { name:'carrots',      qtyMultiplier: 1.0, unitOverride:'cups', baseOverride: 1.5, instrPatchKey:'cook_veg' },
    { name:'spinach',      qtyMultiplier: 1.0, unitOverride:'cups', baseOverride: 3, instrPatchKey:'cook_veg' }
  ]
};

// --- instruction patches (no AI, deterministic)
// We keep steps simple but more specific.
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

function roleFor(raw){
  for(const [re, role] of ROLE_RULES){
    if(re.test(raw)) return role;
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

// Normalized ingredient object:
// { id, raw, name, role, base:{v,u}, swapMeta:{instrPatchKey?} }
function normalize(rawList){
  return rawList.map((raw) => {
    const role = roleFor(raw);
    const name = canonName(raw) || raw;
    const base = { ...BASE[role] };
    return {
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
      raw,
      name,
      role,
      base,
      swapMeta: null
    };
  });
}

// qty string from base (SERVES 2) scaled to servings
function qtyStr(ing){
  const m = servings / 2;
  let v = ing.base.v * m;
  const u = ing.base.u;
  // hide if "skip it"
  if(!u || v === 0) return '';
  const nice = (Math.abs(v - Math.round(v)) < 1e-9) ? String(Math.round(v)) : v.toFixed(1);
  return `${nice} ${u}`;
}

function titleFrom(ings){
  const protein = ings.find(i=>i.role==='protein' && i.name !== 'skip it');
  const hasStarch = ings.some(i=>i.role==='starch' && i.name !== 'skip it');
  const style = hasStarch ? 'Dinner' : 'Plate';
  const main = protein ? pretty(protein.name) : 'Veggie';
  // slightly more human than ingredient soup
  return `Simple ${main} ${style}`;
}

function pretty(s){
  return (s||'').split(' ').map(w=>w? w[0].toUpperCase()+w.slice(1):w).join(' ');
}

// Build instructions from template + patch keys present
function buildInstructions(){
  // Base skeleton
  const steps = [
    { key:'prep', text:'Prep ingredients and season lightly.' },
    { key:'cook_main', text:'Cook protein until done; cook starch if included.' },
    { key:'veg', text:'Cook veggies until tender-crisp.' },
    { key:'combine', text:'Combine everything, adjust seasoning, and serve.' }
  ];

  // Gather patches from current ingredients
  const patchKeys = new Set();
  state.ingredients.forEach(i=>{
    if(i.swapMeta && i.swapMeta.instrPatchKey) patchKeys.add(i.swapMeta.instrPatchKey);
    // also, map certain base ingredient names to patches
    if(i.role === 'aromatic' && (i.name.includes('onion') || i.name.includes('shallot') || i.name.includes('green onion'))) patchKeys.add('add_aromatic');
    if(i.role === 'aromatic' && i.name === 'garlic') patchKeys.add('add_garlic');
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

  // Apply patches deterministically by replacing relevant base steps
  const patched = steps.map(s => ({...s}));

  // Replace cook_main based on protein patch
  const proteinPref = ['cook_tofu','warm_beans','cook_eggs','cook_meat'].find(k=>patchKeys.has(k));
  if(proteinPref){
    const idx = patched.findIndex(s=>s.key==='cook_main');
    patched[idx].text = INSTR_PATCHES[proteinPref];
  }

  // Replace starch behavior: if starch exists pick one
  const starchPref = ['cook_rice','cook_pasta','cook_quinoa','cook_potato'].find(k=>patchKeys.has(k));
  if(starchPref){
    // insert after cook_main (or replace veg step's first sentence? keep simple: insert new step)
    patched.splice(2, 0, { key:'starch', text: INSTR_PATCHES[starchPref] });
  }

  // Aromatic: if skip it, insert skip note; else include aromatic tip
  if(patchKeys.has('skip_aromatic')){
    patched.splice(1, 0, { key:'aromatic', text: INSTR_PATCHES['skip_aromatic'] });
  } else if(patchKeys.has('add_garlic')){
    patched.splice(1, 0, { key:'aromatic', text: INSTR_PATCHES['add_garlic'] });
  } else if(patchKeys.has('add_aromatic')){
    patched.splice(1, 0, { key:'aromatic', text: INSTR_PATCHES['add_aromatic'] });
  }

  // Veg step always uses cook_veg patch
  const vegIdx = patched.findIndex(s=>s.key==='veg');
  if(vegIdx !== -1) patched[vegIdx].text = INSTR_PATCHES['cook_veg'];

  // Remove duplicates / keep order by key uniqueness (first occurrence wins)
  const seen = new Set();
  const finalSteps = [];
  for(const s of patched){
    if(seen.has(s.key)) continue;
    seen.add(s.key);
    finalSteps.push(s);
  }
  return finalSteps;
}

// Flash helpers
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

function render(){
  $('servingsVal').textContent = servings;

  // Title
  $('recipeTitle').textContent = state.title;

  // Ingredients list (each row has qty + name + swap dropdown)
  const ul = $('ingredientsList');
  ul.innerHTML = '';

  state.ingredients.forEach((ing) => {
    const li = document.createElement('li');
    li.className = 'ing-row';
    li.dataset.id = ing.id;

    const left = document.createElement('div');
    left.className = 'ing-left';

    const main = document.createElement('div');
    main.className = 'ing-main';
    const q = qtyStr(ing);
    main.textContent = q ? `${q} ${pretty(ing.name)}` : `${pretty(ing.name)}`;

    const sub = document.createElement('div');
    sub.className = 'ing-sub';
    sub.textContent = ing.role.toUpperCase();

    left.appendChild(main);
    left.appendChild(sub);

    const sel = document.createElement('select');
    sel.className = 'swap-select';

    const opts = SWAP_CATALOG[ing.role] || [];
    sel.innerHTML = `<option value="">Swap</option>` + opts.map(o=>`<option value="${o.name}">${pretty(o.name)}</option>`).join('');

    sel.onchange = () => {
      const chosen = sel.value;
      if(!chosen) return;

      const opt = opts.find(o=>o.name === chosen);
      applySwap(ing.id, opt);
      // reset dropdown
      sel.value = '';
      // bump ingredient row
      bump(li);
      // flash a likely affected instruction (protein: cook_main, starch: starch, aromatic: aromatic)
      const steps = state.steps;
      const idx = steps.findIndex(s=> (ing.role==='protein' && s.key==='cook_main') ||
                                      (ing.role==='starch' && s.key==='starch') ||
                                      (ing.role==='aromatic' && s.key==='aromatic'));
      if(idx !== -1) flashStep(idx);
    };

    li.appendChild(left);
    li.appendChild(sel);
    ul.appendChild(li);
  });

  // Instructions
  const ol = $('instructionsList');
  ol.innerHTML = '';
  state.steps.forEach((s) => {
    const li = document.createElement('li');
    li.textContent = s.text;
    ol.appendChild(li);
  });
}

function applySwap(ingId, opt){
  const ing = state.ingredients.find(i=>i.id===ingId);
  if(!ing || !opt) return;

  ing.name = opt.name;

  // quantity overrides (base quantity is for SERVES 2)
  if(typeof opt.baseOverride === 'number'){
    ing.base.v = opt.baseOverride;
  }
  if(typeof opt.unitOverride === 'string'){
    ing.base.u = opt.unitOverride;
  }

  // multiplier adjusts base v (for serves 2) if present
  if(typeof opt.qtyMultiplier === 'number'){
    ing.base.v = ing.base.v * opt.qtyMultiplier;
  }

  // handle "skip it"
  if(opt.name === 'skip it'){
    ing.base.v = 0;
    ing.base.u = '';
  }

  ing.swapMeta = { instrPatchKey: opt.instrPatchKey || null };

  // rebuild title and steps
  state.title = titleFrom(state.ingredients);
  state.steps = buildInstructions();

  render();
}

// --- EVENTS
$('generateBtn').onclick = () => {
  const raw = parseLines($('ingredientsInput').value);
  if(!raw.length) return alert('Add ingredients.');

  const ingredients = normalize(raw);
  state = {
    ingredients,
    title: titleFrom(ingredients),
    steps: [] // filled below
  };
  state.steps = buildInstructions();

  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  render();
};

$('incServ').onclick = () => { servings = Math.min(8, servings + 1); render(); };
$('decServ').onclick = () => { servings = Math.max(1, servings - 1); render(); };

$('backBtn').onclick = () => {
  servings = 2;
  state = null;
  $('resultCard').classList.add('hidden');
  $('inputCard').classList.remove('hidden');
};

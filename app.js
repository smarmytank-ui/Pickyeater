// =======================================================
// Picky Eater — v1.9.7 FOUNDATION LOCK
// Full file — NO external plugins — NO undefined refs
// =======================================================

const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;
let owned = false;

// -------------------------------------------------------
// ROLE RULES
// -------------------------------------------------------
const ROLE_RULES = [
  [/\bgreen beans\b/i,'veg'],
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
  if(t === 'potato') return 'potatoes';
  if(t === 'onions') return 'onion';
  if(t === 'lemons') return 'lemon';
  if(t === 'scallions') return 'green onion';
  if(t === 'chicken') return 'chicken breast';
  return t;
}

function roleFor(name){
  for(const [r,role] of ROLE_RULES) if(r.test(name)) return role;
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
  return s.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
}

// -------------------------------------------------------
// BASE QUANTITIES (serves 2)
// -------------------------------------------------------
const BASE_QTY = {
  protein:{ v:1, u:'lb' },
  veg:{ v:2, u:'cups' },
  starch:{ v:2, u:'cups' },
  aromatic:{ v:1, u:'medium' },
  fat:{ v:1, u:'tbsp' },
  acid:{ v:1, u:'tbsp' }
};

// -------------------------------------------------------
// SWAPS
// -------------------------------------------------------
const SWAP_CATALOG = {
  protein:[
    {name:'turkey', baseOverride:1, unitOverride:'lb'},
    {name:'tofu', baseOverride:14, unitOverride:'oz'},
    {name:'beans', baseOverride:2, unitOverride:'cups'},
    {name:'eggs', baseOverride:4, unitOverride:'eggs'}
  ],
  starch:[
    {name:'rice', baseOverride:1.5, unitOverride:'cups'},
    {name:'pasta', baseOverride:1.5, unitOverride:'cups'},
    {name:'quinoa', baseOverride:1.25, unitOverride:'cups'},
    {name:'sweet potatoes', baseOverride:2, unitOverride:'medium'}
  ],
  veg:[
    {name:'broccoli', baseOverride:2, unitOverride:'cups'},
    {name:'green beans', baseOverride:2, unitOverride:'cups'},
    {name:'zucchini', baseOverride:2, unitOverride:'cups'}
  ],
  aromatic:[
    {name:'onion', baseOverride:1, unitOverride:'medium'},
    {name:'garlic', baseOverride:2, unitOverride:'cloves'},
    {name:'skip it', baseOverride:0, unitOverride:''}
  ]
};

// -------------------------------------------------------
// NUTRITION PER 100g (USDA-style)
// -------------------------------------------------------
const NUTRITION = {
  'chicken breast':{cal:165,p:31,c:0,f:3.6},
  'turkey':{cal:170,p:29,c:0,f:6},
  'lean beef':{cal:176,p:26,c:0,f:10},
  'tofu':{cal:144,p:15.7,c:3.9,f:8.7},
  'beans':{cal:127,p:8.7,c:22.8,f:0.5},
  'rice':{cal:130,p:2.7,c:28.2,f:0.3},
  'pasta':{cal:158,p:5.8,c:30.9,f:0.9},
  'quinoa':{cal:120,p:4.4,c:21.3,f:1.9},
  'potatoes':{cal:87,p:1.9,c:20.1,f:0.1},
  'sweet potatoes':{cal:86,p:1.6,c:20.1,f:0.1},
  'broccoli':{cal:34,p:2.8,c:7,f:0.4},
  'green beans':{cal:31,p:1.8,c:7.1,f:0.1},
  'zucchini':{cal:17,p:1.2,c:3.1,f:0.3},
  'onion':{cal:40,p:1.1,c:9.3,f:0.1},
  'garlic':{cal:149,p:6.4,c:33.1,f:0.5},
  'olive oil':{cal:884,p:0,c:0,f:100},
  'lemon':{cal:29,p:1.1,c:9.3,f:0.3}
};

const UNIT_G = {
  lb:453.6, oz:28.3, cups:150, medium:110, tbsp:15, eggs:50, cloves:3
};

// -------------------------------------------------------
// INSTRUCTIONS (ALL DEFINED — NO MISSING KEYS)
// -------------------------------------------------------
const INSTR = {
  prep:'Wash and prep everything. Cut into bite-sized pieces.',
  cook_meat:'Cook protein in a pan over medium heat until fully cooked.',
  cook_tofu:'Cook tofu in a pan until lightly browned.',
  warm_beans:'Rinse beans and warm gently in a pan.',
  cook_starch:'Cook starch according to package directions.',
  cook_veg:'Cook vegetables until tender-crisp.',
  use_oil:'Add oil to the pan to prevent sticking.',
  finish_acid:'Finish with lemon or vinegar off heat.',
  combine:'Combine everything, season, and serve.'
};

function buildInstructions(ingredients){
  const steps = [];
  steps.push(INSTR.prep);

  if(ingredients.some(i=>i.role==='fat')) steps.push(INSTR.use_oil);
  if(ingredients.some(i=>i.role==='protein')) steps.push(INSTR.cook_meat);
  if(ingredients.some(i=>i.role==='starch')) steps.push(INSTR.cook_starch);
  if(ingredients.some(i=>i.role==='veg')) steps.push(INSTR.cook_veg);
  if(ingredients.some(i=>i.role==='acid')) steps.push(INSTR.finish_acid);

  steps.push(INSTR.combine);
  return steps;
}

// -------------------------------------------------------
// NORMALIZE
// -------------------------------------------------------
function normalize(lines){
  return lines.map(l=>{
    const name = canonName(l);
    const role = roleFor(name);
    return {
      id: crypto.randomUUID(),
      name,
      role,
      base:{...BASE_QTY[role]}
    };
  });
}

// -------------------------------------------------------
// MACROS
// -------------------------------------------------------
function computeMacros(){
  let cal=0,p=0,c=0,f=0;
  state.ingredients.forEach(i=>{
    const g = (i.base.v * UNIT_G[i.base.u]) || 0;
    const n = NUTRITION[i.name] || {cal:0,p:0,c:0,f:0};
    cal += n.cal*(g/100);
    p += n.p*(g/100);
    c += n.c*(g/100);
    f += n.f*(g/100);
  });

  $('calories').textContent = `≈ ${Math.round(cal/servings)} cal/serv`;
  $('protein').textContent = `Protein ${Math.round(p/servings)}g`;
  $('carbs').textContent = `Carbs ${Math.round(c/servings)}g`;
  $('fat').textContent = `Fat ${Math.round(f/servings)}g`;
}

// -------------------------------------------------------
// RENDER
// -------------------------------------------------------
function render(){
  $('recipeTitle').textContent = state.title;
  $('servingsVal').textContent = servings;

  const ul = $('ingredientsList');
  ul.innerHTML = '';
  state.ingredients.forEach(ing=>{
    const li = document.createElement('li');
    li.textContent = `${ing.base.v} ${ing.base.u} ${pretty(ing.name)}`;
    ul.appendChild(li);
  });

  const ol = $('instructionsList');
  ol.innerHTML = '';
  state.steps.forEach(s=>{
    const li = document.createElement('li');
    li.textContent = s;
    ol.appendChild(li);
  });

  computeMacros();
}

// -------------------------------------------------------
// GENERATE BUTTON — FIXED
// -------------------------------------------------------
$('generateBtn').onclick = ()=>{
  const raw = parseLines($('ingredientsInput').value);
  if(!raw.length) return alert('Add ingredients');

  const ingredients = normalize(raw);
  state = {
    ingredients,
    title:'Simple Custom Dinner',
    steps: buildInstructions(ingredients)
  };

  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  render();
};

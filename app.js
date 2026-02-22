// =======================================================
// Picky Eater — v1.1 LOCKED CORE
// Stable Generator + Jackpot Swapper + Macros
// Scroll-to-adjust ingredient amounts (SAFE)
// FULL FILE — replace app.js entirely
// =======================================================

const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;

// -------------------------------
// Helpers
// -------------------------------
function parseLines(s){
  return (s||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
}
function pretty(s){
  return (s||'').split(' ').map(w=>w? w[0].toUpperCase()+w.slice(1) : w).join(' ');
}

// Fraction display
function formatQty(value) {
  if (!value || value <= 0) return "";
  const fractions = { 0.25:"1/4",0.5:"1/2",0.75:"3/4" };
  const whole = Math.floor(value);
  const rem = value - whole;
  const f = Object.keys(fractions).find(x=>Math.abs(x-rem)<0.01);
  let out = whole>0 ? whole.toString() : "";
  if (f) out += (out?" ":"")+fractions[f];
  else if (rem>0) out += (out?" ":"")+rem.toFixed(2);
  return out;
}

// -------------------------------
// Units + Steps (LOCKED)
// -------------------------------
const UNIT_STEPS = {
  tsp: 0.25,
  tbsp: 0.5,
  cup: 0.25,
  lb: 0.25,
  count: 1
};

// -------------------------------
// Roles
// -------------------------------
const ROLE_RULES = [
  [/\b(tortilla|bread|pita)\b/i,'bread'],
  [/\b(cheese|cheddar|mozzarella|sour cream|yogurt)\b/i,'dairy'],
  [/\b(olive oil|butter)\b/i,'fat'],
  [/\b(lemon|vinegar)\b/i,'acid'],
  [/\b(chicken|beef|turkey|salmon|tofu|eggs|beans)\b/i,'protein'],
  [/\b(rice|pasta|potato|quinoa)\b/i,'starch'],
  [/\b(onion|garlic)\b/i,'aromatic']
];

function roleFor(n){
  for(const [r,role] of ROLE_RULES) if(r.test(n)) return role;
  return 'veg';
}

// -------------------------------
// Base quantities (SERVES 2)
// -------------------------------
const BASE_QTY = {
  protein:{ v:1, u:'lb' },
  veg:{ v:2, u:'cup' },
  starch:{ v:2, u:'cup' },
  aromatic:{ v:1, u:'count' },
  fat:{ v:1, u:'tbsp' },
  acid:{ v:1, u:'tbsp' },
  dairy:{ v:0.5, u:'cup' },
  bread:{ v:4, u:'count' }
};

// -------------------------------
// Nutrition (per BASE_QTY for 2 servings)
// -------------------------------
const NUTRITION = {
  'ground beef':     { cal:176, p:26, c:0,  f:10 },
  'lean beef':       { cal:176, p:26, c:0,  f:10 },
  'chicken breast': { cal:165, p:31, c:0,  f:4  },
  'salmon':          { cal:208, p:20, c:0,  f:13 },
  'eggs':            { cal:72,  p:6,  c:0,  f:5  },
  'cheddar cheese':  { cal:403, p:25, c:1,  f:33 },
  'sour cream':      { cal:193, p:2,  c:4,  f:19 },
  'broccoli':        { cal:34,  p:3,  c:7,  f:0  },
  'spinach':         { cal:23,  p:3,  c:4,  f:0  },
  'rice':            { cal:130, p:2,  c:28, f:0  },
  'tortillas':       { cal:304, p:8,  c:50, f:6  },
  'olive oil':       { cal:884, p:0,  c:0,  f:100 }
};

// -------------------------------
// Swap catalog + Jackpot
// -------------------------------
const SWAP_CATALOG = {
  protein:[{name:'chicken breast'},{name:'lean beef'},{name:'salmon'},{name:'tofu'}],
  veg:[{name:'broccoli'},{name:'green beans'},{name:'spinach'}],
  dairy:[{name:'cheddar cheese'},{name:'sour cream'}],
  bread:[{name:'tortillas'}]
};

// -------------------------------
// Normalize ingredients
// -------------------------------
function normalize(names){
  return names.map(raw=>{
    const name = raw.toLowerCase();
    const role = roleFor(name);
    return {
      id: window.crypto?.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
      name,
      role,
      base: {...(BASE_QTY[role]||BASE_QTY.veg)}
    };
  });
}

// -------------------------------
// Apply swap
// -------------------------------
function applySwap(id, opt, cfg={}){
  const ing = state.ingredients.find(i=>i.id===id);
  if(!ing) return;

  ing.name = opt.name.toLowerCase();
  if(!cfg.keepRole) ing.role = roleFor(ing.name);
  if(!cfg.keepQty) ing.base = {...(BASE_QTY[ing.role]||BASE_QTY.veg)};
  render();
}

// -------------------------------
// Naming v1 (LOCKED)
// -------------------------------
function inferTitle(){
  if(!state) return 'Simple Recipe';
  const names = state.ingredients.map(i=>i.name);
  const protein = names.find(n=>/(chicken|beef|salmon|turkey|tofu)/i.test(n));
  if(names.some(n=>/(tortilla|bread|pita)/i.test(n)))
    return `Simple ${pretty(protein||'Recipe')} Wraps`;
  if(names.some(n=>/(rice|pasta|potato|quinoa)/i.test(n)))
    return `Simple ${pretty(protein||'Recipe')} Plate`;
  if(protein) return `Simple ${pretty(protein)} Recipe`;
  return 'Simple Recipe';
}

// -------------------------------
// Render
// -------------------------------
function render(){
  if(!state) return;

  $('servingsVal').textContent = servings;
  $('recipeTitle').textContent = inferTitle();

  let totalCal=0,totalP=0,totalC=0,totalF=0;

  const ul = $('ingredientsList');
  ul.innerHTML = '';

  state.ingredients.forEach(ing=>{
    const li = document.createElement('li');
    li.className='ing-row';

    const left = document.createElement('div');
    left.className='ing-left';

    const main = document.createElement('div');
    main.className='ing-main';

    // v1.1 scroll-to-adjust
    main.addEventListener('wheel',(e)=>{
      e.preventDefault();
      const step = UNIT_STEPS[ing.base.u]||1;
      ing.base.v = Math.max(0, ing.base.v - Math.sign(e.deltaY)*step);
      render();
    });

    const qtyVal = ing.base.v*(servings/2);
    const qty = ing.base.u==='count'
      ? `count ${Math.round(qtyVal)}`
      : `${formatQty(qtyVal)} ${ing.base.u}`;

    main.textContent = `${qty} ${pretty(ing.name)}`.replace(/\s+/g,' ');

    const sub=document.createElement('div');
    sub.className='ing-sub';
    sub.textContent=ing.role.toUpperCase();

    left.append(main,sub);

    // +/- controls
    const ctrl=document.createElement('div');
    ctrl.className='amount-controls';

    const step=UNIT_STEPS[ing.base.u]||1;

    const dec=document.createElement('button');
    dec.className='btn ghost small';
    dec.textContent='−';
    dec.onclick=()=>{ing.base.v=Math.max(0,ing.base.v-step);render();};

    const inc=document.createElement('button');
    inc.className='btn ghost small';
    inc.textContent='+';
    inc.onclick=()=>{ing.base.v+=step;render();};

    ctrl.append(dec,inc);
    left.appendChild(ctrl);

    // Macros
    const nut=NUTRITION[ing.name];
    if(nut){
      const ratio=qtyVal/(BASE_QTY[ing.role]?.v||1);
      totalCal+=nut.cal*ratio;
      totalP+=(nut.p||0)*ratio;
      totalC+=(nut.c||0)*ratio;
      totalF+=(nut.f||0)*ratio;
    }

    // Swap + Jackpot
    const sel=document.createElement('select');
    sel.className='swap-select';
    const opts=SWAP_CATALOG[ing.role]||[];
    sel.innerHTML=`<option value="">Swap</option>
      <option value="__custom__">➕ Enter your own…</option>`+
      opts.map(o=>`<option value="${o.name}">${pretty(o.name)}</option>`).join('');

    sel.onchange=()=>{
      if(!sel.value) return;
      if(sel.value==='__custom__'){
        sel.value='';
        const v=prompt('Ingredient name?');
        if(v) applySwap(ing.id,{name:v},{keepRole:true,keepQty:true});
        return;
      }
      const opt=opts.find(o=>o.name===sel.value);
      if(opt) applySwap(ing.id,opt);
      sel.value='';
    };

    li.append(left,sel);
    ul.appendChild(li);
  });

  $('calories').textContent=`≈ ${Math.round(totalCal/servings)} cal/serv`;
  $('protein').textContent=`Protein ${Math.round(totalP/servings)}g`;
  $('carbs').textContent=`Carbs ${Math.round(totalC/servings)}g`;
  $('fat').textContent=`Fat ${Math.round(totalF/servings)}g`;
}

// -------------------------------
// Events
// -------------------------------
$('generateBtn').onclick=()=>{
  const raw=parseLines($('ingredientsInput').value);
  if(!raw.length) return alert('Add ingredients');
  state={ingredients:normalize(raw)};
  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  $('saveRow').classList.remove('hidden');
  render();
};

$('incServ').onclick=()=>{servings=Math.min(8,servings+1);render();};
$('decServ').onclick=()=>{servings=Math.max(1,servings-1);render();};

$('backBtn').onclick=()=>{
  servings=2;state=null;
  $('resultCard').classList.add('hidden');
  $('inputCard').classList.remove('hidden');
};

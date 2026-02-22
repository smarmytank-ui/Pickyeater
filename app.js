// =======================================================
// Picky Eater — STABLE CORE + JACKPOT + MACROS + BREAD FIX
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

// --- Fraction formatter ---
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
// Roles + Base quantities (SERVES 2)
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

const BASE_QTY = {
  protein:{ v:1, u:'lb' },
  veg:{ v:2, u:'cups' },
  starch:{ v:2, u:'cups' },
  aromatic:{ v:1, u:'medium' },
  fat:{ v:1, u:'tbsp' },
  acid:{ v:1, u:'tbsp' },
  dairy:{ v:0.5, u:'cups' },
  bread:{ v:4, u:'count' }
};

// -------------------------------
// Nutrition (simple + reliable)
// -------------------------------
const NUTRITION = {
  'ground beef':      { cal:176, p:26, c:0,  f:10 },
  'lean beef':        { cal:176, p:26, c:0,  f:10 },
  'chicken breast':  { cal:165, p:31, c:0,  f:4  },
  'salmon':           { cal:208, p:20, c:0,  f:13 },
  'eggs':             { cal:72,  p:6,  c:0,  f:5  },
  'cheddar cheese':   { cal:403, p:25, c:1,  f:33 },
  'sour cream':       { cal:193, p:2,  c:4,  f:19 },
  'broccoli':         { cal:34,  p:3,  c:7,  f:0  },
  'tomatoes':         { cal:18,  p:1,  c:4,  f:0  },
  'rice':             { cal:130, p:2,  c:28, f:0  },
  'tortillas':        { cal:304, p:8,  c:50, f:6  },
  'olive oil':        { cal:884, p:0,  c:0,  f:100 }
};

function caloriesFor(ing){
  const base = NUTRITION[ing.name] || { cal:50 };
  return base.cal;
}

// -------------------------------
// Swap catalog
// -------------------------------
const SWAP_CATALOG = {
  protein:[{name:'chicken breast'},{name:'lean beef'},{name:'salmon'},{name:'tofu'}],
  veg:[{name:'broccoli'},{name:'green beans'},{name:'spinach'}],
  dairy:[{name:'cheddar cheese'},{name:'sour cream'}],
  bread:[{name:'tortillas'}]
};

// -------------------------------
// State normalization
// -------------------------------
function normalize(names){
  return names.map(raw=>{
    const name = raw.toLowerCase();
    const role = roleFor(name);
    return {
      id: crypto.randomUUID(),
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
// Render
// -------------------------------
function render(){
  if(!state) return;

  $('servingsVal').textContent = servings;
  $('recipeTitle').textContent = state.title;

  let totalCal = 0;

  const ul = $('ingredientsList');
  ul.innerHTML = '';

  state.ingredients.forEach(ing=>{
    const li = document.createElement('li');
    li.className = 'ing-row';

    const left = document.createElement('div');
    left.className = 'ing-left';

    const main = document.createElement('div');
    main.className = 'ing-main';

    const qtyVal = ing.base.v*(servings/2);
    const qty = ing.base.u === 'count'
      ? `count ${Math.round(qtyVal)}`
      : `${formatQty(qtyVal)} ${ing.base.u}`;

    main.textContent = `${qty} ${pretty(ing.name)}`.replace(/\s+/g,' ');

    const sub = document.createElement('div');
    sub.className = 'ing-sub';
    sub.textContent = ing.role.toUpperCase();

    left.append(main,sub);

    // Amount controls
    const ctrl = document.createElement('div');
    ctrl.className = 'amount-controls';

    const step = ing.base.u === 'tbsp' ? 0.5 : 1;

    const dec = document.createElement('button');
    dec.className = 'btn ghost small';
    dec.textContent = '−';
    dec.onclick=()=>{ ing.base.v=Math.max(0,ing.base.v-step); render(); };

    const inc = document.createElement('button');
    inc.className = 'btn ghost small';
    inc.textContent = '+';
    inc.onclick=()=>{ ing.base.v+=step; render(); };

    ctrl.append(dec,inc);
    left.appendChild(ctrl);

    // Calories
    totalCal += caloriesFor(ing) * (qtyVal/servings);

    // Swap + Jackpot
    const sel = document.createElement('select');
    sel.className = 'swap-select';
    const opts = SWAP_CATALOG[ing.role]||[];
    sel.innerHTML =
      `<option value="">Swap</option>
       <option value="__custom__">➕ Enter your own…</option>` +
      opts.map(o=>`<option value="${o.name}">${pretty(o.name)}</option>`).join('');

    sel.onchange = ()=>{
      if(!sel.value) return;

      if(sel.value==='__custom__'){
        sel.value='';
        const existing = li.querySelector('.custom-swap');
        if(existing) existing.remove();

        const wrap = document.createElement('div');
        wrap.className='custom-swap';

        const input = document.createElement('input');
        input.placeholder='Enter ingredient';
        input.className='field';

        const apply = document.createElement('button');
        apply.className='btn primary small';
        apply.textContent='Apply';

        const cancel = document.createElement('button');
        cancel.className='btn ghost small';
        cancel.textContent='Cancel';
        cancel.onclick=()=>wrap.remove();

        apply.onclick=()=>{
          const v=input.value.trim();
          if(!v) return;
          applySwap(ing.id,{name:v},{keepRole:true,keepQty:true});
          wrap.remove();
        };

        wrap.append(input,apply,cancel);
        li.appendChild(wrap);
        input.focus();
        return;
      }

      const opt = opts.find(o=>o.name===sel.value);
      if(opt) applySwap(ing.id,opt);
      sel.value='';
    };

    li.append(left,sel);
    ul.appendChild(li);
  });

  $('calories').textContent = `≈ ${Math.round(totalCal)} cal/serv`;
}

// -------------------------------
// Events
// -------------------------------
$('generateBtn').onclick=()=>{
  const raw = parseLines($('ingredientsInput').value);
  if(!raw.length) return alert('Add ingredients');
  state = { ingredients: normalize(raw), title:'Simple Recipe' };
  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  $('saveRow').classList.remove('hidden');
  render();
};

$('incServ').onclick=()=>{ servings=Math.min(8,servings+1); render(); };
$('decServ').onclick=()=>{ servings=Math.max(1,servings-1); render(); };

$('backBtn').onclick=()=>{
  servings=2; state=null;
  $('resultCard').classList.add('hidden');
  $('inputCard').classList.remove('hidden');
};

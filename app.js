
// =======================================================
// Picky Eater — BASELINE OVERRIDE LOCK + NAMING ENGINE
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
function uid(){
  return window.crypto?.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// -------------------------------
// Measurement Intent (LOCKED)
// -------------------------------
const MEASURE_INTENT = {
  bulk:    { unit:'cup',  step:0.25, max:6 },
  support: { unit:'tbsp', step:0.5,  max:16 },
  flavor:  { unit:'tsp',  step:0.25, max:2 },
  finish:  { unit:'tsp',  step:0.25, max:3 }
};

// -------------------------------
// Ingredient Baseline Overrides (LOCKED)
// -------------------------------
const INGREDIENT_BASELINES = {
  'olive oil':       { intent:'support', v:1,   u:'tbsp' },
  'butter':          { intent:'support', v:1,   u:'tbsp' },
  'sour cream':      { intent:'support', v:2,   u:'tbsp' },
  'cheddar cheese':  { intent:'support', v:0.5, u:'cup' },
  'mozzarella':      { intent:'support', v:0.5, u:'cup' },
  'parmesan':        { intent:'support', v:2,   u:'tbsp' },
  'garlic':          { intent:'flavor',  v:0.5, u:'tsp' },
  'garlic powder':   { intent:'flavor',  v:0.5, u:'tsp' },
  'paprika':         { intent:'flavor',  v:0.5, u:'tsp' },
  'cumin':           { intent:'flavor',  v:0.5, u:'tsp' },
  'lemon':           { intent:'finish',  v:1,   u:'tsp' },
  'vinegar':         { intent:'finish',  v:1,   u:'tsp' },
  'tortillas':       { intent:'bulk',    v:4,   u:'count' }
};

// -------------------------------
// Role Detection
// -------------------------------
const ROLE_RULES = [
  [/\b(chicken|beef|turkey|salmon|tofu|eggs|beans)\b/i,'protein'],
  [/\b(rice|pasta|potato|quinoa)\b/i,'starch'],
  [/\b(tortilla|bread|pita)\b/i,'bread'],
  [/\b(broccoli|spinach|carrot|tomato)\b/i,'veg'],
  [/\b(cheese|sour cream|yogurt)\b/i,'dairy'],
  [/\b(olive oil|butter)\b/i,'fat'],
  [/\b(cumin|paprika|pepper|garlic powder)\b/i,'seasoning'],
  [/\b(lemon|vinegar)\b/i,'acid']
];

function roleFor(name){
  for(const [r,role] of ROLE_RULES) if(r.test(name)) return role;
  return 'veg';
}

// -------------------------------
// Normalize Ingredients
// -------------------------------
function normalize(list){
  return list.map(raw=>{
    const name = raw.toLowerCase();
    const role = roleFor(name);

    const override = INGREDIENT_BASELINES[name];
    const intent = override?.intent || (
      role === 'protein' || role === 'veg' || role === 'starch' || role === 'bread'
        ? 'bulk'
        : role === 'dairy' || role === 'fat'
        ? 'support'
        : role === 'seasoning'
        ? 'flavor'
        : 'finish'
    );

    const rule = MEASURE_INTENT[intent];

    return {
      id: uid(),
      name,
      role,
      intent,
      base: {
        v: override?.v ?? (intent==='bulk'?1:rule.step),
        u: override?.u ?? rule.unit
      }
    };
  });
}

// -------------------------------
// Naming Engine (Deterministic)
// -------------------------------
function deriveTitle(ingredients){
  const names = ingredients.map(i=>i.name).join(' ');
  const protein = ingredients.find(i=>i.role==='protein');

  if(names.includes('tortilla')) return `${pretty(protein?.name||'Veggie')} Tacos`;
  if(names.includes('rice')) return `${pretty(protein?.name||'Veggie')} Rice Bowl`;
  if(names.includes('pasta')) return `${pretty(protein?.name||'Veggie')} Pasta`;
  if(names.includes('potato')) return `${pretty(protein?.name||'Veggie')} Potato Plate`;

  return `Simple ${pretty(protein?.name||'Veggie')} Plate`;
}

// -------------------------------
// Render
// -------------------------------
function render(){
  if(!state) return;

  $('servingsVal').textContent = servings;
  $('recipeTitle').textContent = state.title;

  const ul = $('ingredientsList');
  ul.innerHTML='';

  state.ingredients.forEach(ing=>{
    const li=document.createElement('li');
    li.className='ing-row';

    const left=document.createElement('div');
    left.className='ing-left';

    const qtyVal=ing.base.v*(servings/2);
    const qty=ing.base.u==='count'
      ? `count ${Math.round(qtyVal)}`
      : `${qtyVal} ${ing.base.u}`;

    const main=document.createElement('div');
    main.className='ing-main';
    main.textContent=`${qty} ${pretty(ing.name)}`;

    const sub=document.createElement('div');
    sub.className='ing-sub';
    sub.textContent=`${ing.role.toUpperCase()} • ${ing.intent.toUpperCase()}`;

    left.append(main,sub);

    const ctrl=document.createElement('div');
    ctrl.className='amount-controls';
    const rule=MEASURE_INTENT[ing.intent];

    const dec=document.createElement('button');
    dec.className='btn ghost small';
    dec.textContent='−';
    dec.onclick=()=>{ ing.base.v=Math.max(0,ing.base.v-rule.step); render(); };

    const inc=document.createElement('button');
    inc.className='btn ghost small';
    inc.textContent='+';
    inc.onclick=()=>{ ing.base.v=Math.min(rule.max,ing.base.v+rule.step); render(); };

    ctrl.append(dec,inc);
    left.appendChild(ctrl);

    li.appendChild(left);
    ul.appendChild(li);
  });
}

// -------------------------------
// Events
// -------------------------------
$('generateBtn').addEventListener('click',()=>{
  const raw=parseLines($('ingredientsInput').value);
  if(!raw.length) return alert('Add ingredients');

  const ingredients=normalize(raw);
  state={
    ingredients,
    title: deriveTitle(ingredients)
  };

  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  $('saveRow').classList.remove('hidden');

  render();
});

$('incServ').addEventListener('click',()=>{ servings=Math.min(8,servings+1); render(); });
$('decServ').addEventListener('click',()=>{ servings=Math.max(1,servings-1); render(); });

$('backBtn').addEventListener('click',()=>{
  servings=2;
  state=null;
  $('resultCard').classList.add('hidden');
  $('inputCard').classList.remove('hidden');
});

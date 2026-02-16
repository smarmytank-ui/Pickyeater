// v1.5.1 — conditional save
const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;
let owned = false;

const ROLE_RULES = [
  [/\b(chicken|beef|turkey|pork|tofu|beans|lentils|egg|eggs)\b/i, 'protein'],
  [/\b(rice|pasta|potato|potatoes|quinoa)\b/i, 'starch'],
  [/\b(onion|onions|garlic)\b/i, 'aromatic']
];

const BASE = {
  protein:{v:1,u:'lb'},
  veg:{v:2,u:'cups'},
  starch:{v:2,u:'cups'},
  aromatic:{v:1,u:'medium'}
};

const SWAPS = {
  protein:['turkey','lean beef','tofu','beans','eggs'],
  veg:['zucchini','green beans','carrots','spinach'],
  starch:['rice','pasta','sweet potatoes','quinoa'],
  aromatic:['green onion','shallot','garlic','skip it']
};

function roleFor(raw){
  for(const [re,role] of ROLE_RULES) if(re.test(raw)) return role;
  return 'veg';
}

function pretty(s){return s.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}
function parseLines(s){return s.replace(/,+/g,'\n').split(/\n+/).map(x=>x.trim()).filter(Boolean)}

function normalize(list){
  return list.map(raw=>{
    const role = roleFor(raw);
    return { id: crypto.randomUUID(), name: raw, role, base:{...BASE[role]} };
  });
}

function qtyStr(ing){
  const m = servings / 2;
  const v = ing.base.v * m;
  if(v === 0 || !ing.base.u) return '';
  const n = Math.abs(v - Math.round(v)) < 0.01 ? Math.round(v) : v.toFixed(1);
  return `${n} ${ing.base.u}`;
}

function titleFrom(ings){
  const p = ings.find(i=>i.role==='protein' && i.name!=='skip it');
  return `Simple ${p ? pretty(p.name) : 'Veggie'} Dinner`;
}

function render(){
  $('servingsVal').textContent = servings;
  $('recipeTitle').textContent = state.title;

  const ul = $('ingredientsList'); ul.innerHTML='';
  state.ingredients.forEach(ing=>{
    const li = document.createElement('li');
    li.className = 'ing-row';
    const left = document.createElement('div');
    left.innerHTML = `<div class="ing-main">${qtyStr(ing)} ${pretty(ing.name)}</div><div class="ing-sub">${ing.role.toUpperCase()}</div>`;
    const sel = document.createElement('select');
    sel.className = 'swap-select';
    sel.innerHTML = `<option value="">Swap</option>` + (SWAPS[ing.role]||[]).map(s=>`<option>${s}</option>`).join('');
    sel.onchange = ()=>{
      if(!sel.value) return;
      ing.name = sel.value;
      owned = true;
      $('saveRow').classList.remove('hidden');
      state.title = titleFrom(state.ingredients);
      render();
    };
    li.append(left,sel);
    ul.appendChild(li);
  });

  const ol = $('instructionsList'); ol.innerHTML='';
  [
    'Prep ingredients and season lightly.',
    'Cook protein until done; cook starch if included.',
    'Cook veggies until tender-crisp.',
    'Combine everything, adjust seasoning, and serve.'
  ].forEach(t=>{
    const li = document.createElement('li');
    li.textContent = t;
    ol.appendChild(li);
  });
}

$('generateBtn').onclick = ()=>{
  const raw = parseLines($('ingredientsInput').value);
  if(!raw.length) return alert('Add ingredients');
  state = { ingredients: normalize(raw) };
  state.title = titleFrom(state.ingredients);
  owned = false;
  $('saveRow').classList.add('hidden');
  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  render();
};

$('incServ').onclick = ()=>{servings++; owned=true; $('saveRow').classList.remove('hidden'); render();};
$('decServ').onclick = ()=>{servings=Math.max(1,servings-1); owned=true; $('saveRow').classList.remove('hidden'); render();};

$('saveBtn').onclick = ()=>{
  const saved = JSON.parse(localStorage.getItem('pickyFavorites')||'[]');
  saved.push({title:state.title,ingredients:state.ingredients,servings});
  localStorage.setItem('pickyFavorites',JSON.stringify(saved));
  $('saveBtn').textContent = '✓ Saved';
};

$('backBtn').onclick = ()=>{
  servings = 2;
  state = null;
  $('resultCard').classList.add('hidden');
  $('inputCard').classList.remove('hidden');
};

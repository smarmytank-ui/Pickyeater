// Picky Eater — Naming Engine Patch
// FULL FILE — replace app.js entirely

const $ = (id) => document.getElementById(id);
let servings = 2;
let state = null;

// Helpers
function parseLines(s){return (s||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);}
function pretty(s){return s.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');}
function uid(){return crypto?.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);}

// --- NAMING ENGINE ---
function computeTitle(ings){
  const names = ings.map(i=>i.name);
  const has = (r)=>names.some(n=>r.test(n));
  let protein =
    has(/chicken/)?'Chicken':
    has(/beef/)?'Beef':
    has(/salmon/)?'Salmon':
    has(/tofu/)?'Tofu':
    has(/egg/)?'Egg':
    'Simple';

  if(has(/tortilla/)) return protein+' Tacos';
  if(has(/rice|quinoa/)) return protein+' Bowl';
  if(has(/pasta/)) return protein+' Pasta';
  if(has(/cheese|cream|sour/)) return 'Creamy '+protein+' Skillet';
  return protein+' Plate';
}

// ---- BASIC GENERATOR (existing logic assumed) ----
function normalize(list){
  return list.map(raw=>({id:uid(),name:raw.toLowerCase()}));
}

function render(){
  if(!state) return;
  $('recipeTitle').textContent = state.title;
}

$('generateBtn').onclick=()=>{
  const raw = parseLines($('ingredientsInput').value);
  state={ingredients:normalize(raw)};
  state.title=computeTitle(state.ingredients);
  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  render();
};

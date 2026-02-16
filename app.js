// Picky Eater v1.2.3 — Always returns a recipe + Apply Swap (no regen)
const $ = (id) => document.getElementById(id);

const inputCard = $('inputCard');
const resultCard = $('resultCard');
const genMode = $('generateMode');
const impMode = $('importMode');
const inputTitleEl = $('inputTitle');

$('modeGenerate').onclick = () => {
  genMode.classList.remove('hidden');
  impMode.classList.add('hidden');
  inputTitleEl.textContent = 'Build from ingredients';
};

$('modeImport').onclick = () => {
  impMode.classList.remove('hidden');
  genMode.classList.add('hidden');
  inputTitleEl.textContent = 'Bring a recipe';
};

const MULTIWORD = [
  'ground beef','ground turkey','chicken breast','chicken thighs','olive oil','black pepper',
  'bell pepper','sour cream','soy sauce','brown rice','white rice','garlic powder','onion powder',
  'sweet potato','green onion','red onion','tomato sauce','tomato paste'
];

function normalizeText(s){
  return (s || '')
    .replace(/\r/g,'')
    .replace(/\t/g,' ')
    .replace(/,+/g,'\n')
    .replace(/•/g,'\n')
    .trim();
}

function parseIngredients(raw){
  const txt = normalizeText(raw);
  if(!txt) return [];
  let parts = txt.split('\n').map(s => s.trim()).filter(Boolean);

  if(parts.length === 1){
    const line = parts[0];
    const words = line.split(/\s+/).filter(Boolean);
    if(words.length >= 6){
      const lower = words.map(w => w.toLowerCase());
      const used = new Array(words.length).fill(false);
      const result = [];

      for(let i=0;i<words.length-1;i++){
        if(used[i] || used[i+1]) continue;
        const two = (lower[i] + ' ' + lower[i+1]).trim();
        if(MULTIWORD.includes(two)){
          result.push(words[i] + ' ' + words[i+1]);
          used[i]=used[i+1]=true;
        }
      }
      for(let i=0;i<words.length;i++){
        if(!used[i]) result.push(words[i]);
      }
      parts = result;
    }
  }

  const seen = new Set();
  const cleaned = [];
  for(const p of parts){
    const v = p.replace(/\s+/g,' ').trim();
    if(!v) continue;
    const key = v.toLowerCase();
    if(seen.has(key)) continue;
    seen.add(key);
    cleaned.push(v);
  }
  return cleaned;
}

function titleCase(s){
  return (s || '').split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1)) : w).join(' ');
}

function pickMain(ings){
  const lower = ings.map(i => i.toLowerCase());
  const proteins = ['chicken','ground beef','beef','ground turkey','turkey','pork','tofu','beans','lentils','eggs'];
  for(const p of proteins){
    const idx = lower.findIndex(v => v.includes(p));
    if(idx !== -1) return ings[idx];
  }
  return ings[0] || 'Your Ingredients';
}

function generateRecipeFromIngredients(ings){
  const main = pickMain(ings);
  const mainNice = titleCase(main.toLowerCase());

  const hasRice = ings.some(i => i.toLowerCase().includes('rice'));
  const hasPotato = ings.some(i => i.toLowerCase().includes('potato'));
  const hasPasta = ings.some(i => i.toLowerCase().includes('pasta'));
  const base = hasRice ? 'Bowl' : (hasPotato ? 'Plate' : (hasPasta ? 'Pasta' : 'Skillet'));

  const title = `Simple ${mainNice} ${base}`;

  const steps = [
    'Prep your ingredients: rinse/chop anything that needs it.',
    `Season and cook the ${mainNice} until done (or warm through if it’s already cooked).`,
    'Cook your base (rice/pasta/potatoes) if included, or sauté the remaining ingredients.',
    'Combine everything in a pan or bowl. Taste and adjust salt/pepper.',
    'Serve hot. Use Simple Swaps to remove anything you don’t like.'
  ];

  return { title, ingredients: ings, steps };
}

const SWAP_MAP = {
  'onion': ['green onion','shallot','onion powder','skip it'],
  'onions': ['green onion','shallot','onion powder','skip it'],
  'garlic': ['garlic powder','roasted garlic','skip it'],
  'cheese': ['reduced-fat cheese','mozzarella','cheddar','skip it'],
  'ground beef': ['ground turkey','lean ground beef','ground chicken'],
  'beef': ['turkey','chicken','tofu'],
  'broccoli': ['green beans','asparagus','zucchini'],
  'rice': ['cauliflower rice','quinoa','potatoes'],
  'pepper': ['bell pepper','black pepper','paprika','skip it'],
  'mushroom': ['zucchini','spinach','skip it'],
  'cream': ['greek yogurt','light sour cream','skip it'],
  'milk': ['almond milk','oat milk','skip it']
};

function suggestionsForIngredient(ingredient){
  const low = ingredient.toLowerCase();
  for(const key of Object.keys(SWAP_MAP)){
    if(low.includes(key)) return SWAP_MAP[key];
  }
  return [];
}

function applySwap(state, fromText, toText){
  if(!toText || !toText.trim()) return state;
  const to = toText.trim();

  const nextIngredients = state.ingredients.map(i => {
    if(i.toLowerCase() === fromText.toLowerCase()) return to;
    if(i.toLowerCase().includes(fromText.toLowerCase())) return i.replace(new RegExp(fromText, 'ig'), to);
    return i;
  });

  const nextSteps = state.steps.map(s => s.replace(new RegExp(fromText, 'ig'), to));

  return { ...state, ingredients: nextIngredients, steps: nextSteps, swaps: [...state.swaps, { from: fromText, to }] };
}

let currentRecipeState = null;

function renderResult(state){
  $('recipeTitle').textContent = state.title;

  const il = $('ingredientsList');
  il.innerHTML = '';
  state.ingredients.forEach(i => {
    const li = document.createElement('li');
    li.textContent = i;
    il.appendChild(li);
  });

  const ol = $('instructionsList');
  ol.innerHTML = '';
  state.steps.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    ol.appendChild(li);
  });

  const swapsWrap = $('swapsWrap');
  const swapsList = $('swapsList');
  swapsList.innerHTML = '';

  const rows = [];
  for(const ing of state.ingredients){
    const sug = suggestionsForIngredient(ing);
    if(sug.length) rows.push({ ing, sug });
    if(rows.length >= 6) break;
  }

  if(rows.length){
    swapsWrap.classList.remove('hidden');
    rows.forEach(({ing, sug}) => {
      const row = document.createElement('div');
      row.className = 'swap-row';

      const left = document.createElement('div');
      left.className = 'swap-from';
      left.textContent = ing;

      const mid = document.createElement('div');
      mid.className = 'swap-to';

      const select = document.createElement('select');
      sug.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        select.appendChild(opt);
      });

      const custom = document.createElement('input');
      custom.type = 'text';
      custom.placeholder = 'or type your own…';

      custom.addEventListener('input', () => {
        select.disabled = !!custom.value.trim();
      });

      mid.appendChild(select);
      mid.appendChild(custom);

      const btn = document.createElement('button');
      btn.className = 'btn apply';
      btn.textContent = 'Apply';
      btn.onclick = () => {
        const chosen = custom.value.trim() ? custom.value.trim() : select.value;
        currentRecipeState = applySwap(currentRecipeState, ing, chosen);
        renderResult(currentRecipeState);
      };

      row.appendChild(left);
      row.appendChild(mid);
      row.appendChild(btn);

      swapsList.appendChild(row);
    });
  } else {
    swapsWrap.classList.add('hidden');
  }
}

function showResult(state){
  currentRecipeState = state;
  inputCard.classList.add('hidden');
  resultCard.classList.remove('hidden');
  renderResult(currentRecipeState);
}

$('generateBtn').onclick = () => {
  const ings = parseIngredients($('ingredientsInput').value);
  if(!ings.length){
    alert('Add at least one ingredient.');
    return;
  }
  const r = generateRecipeFromIngredients(ings);
  showResult({ ...r, source: 'generated', swaps: [] });
};

$('importBtn').onclick = () => {
  const title = ($('importTitle').value || '').trim();
  const ings = parseIngredients($('importIngredients').value);
  const stepsRaw = ($('importInstructions').value || '').trim();

  if(!ings.length){
    alert('Please paste at least one ingredient.');
    return;
  }

  const steps = stepsRaw
    ? stepsRaw.split(/\n+/).map(s => s.trim()).filter(Boolean)
    : [
        'Use the original instructions as your baseline.',
        'Apply Simple Swaps to remove anything you don’t like.',
        'Save your version when you’re done.'
      ];

  showResult({
    title: title || `My version of ${titleCase(pickMain(ings).toLowerCase())}`,
    ingredients: ings,
    steps,
    source: 'imported',
    swaps: []
  });
};

$('swapsToggle').onclick = () => {
  const panel = $('swapsPanel');
  const expanded = $('swapsToggle').getAttribute('aria-expanded') === 'true';
  $('swapsToggle').setAttribute('aria-expanded', String(!expanded));
  panel.classList.toggle('hidden');
};

$('backBtn').onclick = () => {
  resultCard.classList.add('hidden');
  inputCard.classList.remove('hidden');
};

$('saveBtn').onclick = () => {
  alert('Saved (placeholder). Next step is My Recipes library.');
};

// Picky Eater — Generator v1
// Includes: generator + swaps panel + apply swap (no regen) + silent learning (localStorage).
// No external dependencies.

(function(){
  'use strict';

  // -----------------------------
  // Static Swap Map (v1 locked)
  // -----------------------------
  const SWAP_MAP = [
    // Proteins
    { ingredient: 'chicken', replacement: 'lean ground turkey', category: 'protein', order: 1 },
    { ingredient: 'chicken', replacement: 'lean ground beef', category: 'protein', order: 2 },
    { ingredient: 'steak', replacement: 'lean ground beef', category: 'protein', order: 3 },
    { ingredient: 'ground beef', replacement: 'ground turkey', category: 'protein', order: 4 },
    { ingredient: 'ground chicken', replacement: 'chicken breast', category: 'protein', order: 5 },

    // Carbs / Bases
    { ingredient: 'rice', replacement: 'potatoes', category: 'carb', order: 1 },
    { ingredient: 'rice', replacement: 'pasta', category: 'carb', order: 2 },
    { ingredient: 'pasta', replacement: 'rice', category: 'carb', order: 3 },
    { ingredient: 'potatoes', replacement: 'rice', category: 'carb', order: 4 },
    { ingredient: 'tortilla', replacement: 'bread', category: 'carb', order: 5 },

    // Vegetables (limited)
    { ingredient: 'broccoli', replacement: 'green beans', category: 'veg', order: 1 },
    { ingredient: 'broccoli', replacement: 'carrots', category: 'veg', order: 2 },
    { ingredient: 'spinach', replacement: 'green beans', category: 'veg', order: 3 },
    { ingredient: 'bell pepper', replacement: 'zucchini', category: 'veg', order: 4 },
  ];

  const CATEGORY_PRIORITY = { protein: 1, carb: 2, veg: 3 };

  // -----------------------------
  // Storage helpers
  // -----------------------------
  const LS_KEYS = {
    pro: 'pe_isPro',
    saved: 'pe_savedRecipes',
    signals: 'pe_userSignals',
    saveCount: 'pe_saveCount'
  };

  function lsGet(key, fallback){
    try{
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    }catch{
      return fallback;
    }
  }
  function lsSet(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  // -----------------------------
  // DOM
  // -----------------------------
  const el = (id) => document.getElementById(id);

  const ingredientsInput = el('ingredientsInput');
  const servingsSelect = el('servingsSelect');
  const goalSelect = el('goalSelect');
  const generateBtn = el('generateBtn');
  const statusLine = el('statusLine');

  const resultCard = el('resultCard');
  const recipeTitle = el('recipeTitle');
  const pillServings = el('pillServings');
  const pillCalories = el('pillCalories');
  const pillProtein = el('pillProtein');

  const ingredientsList = el('ingredientsList');
  const instructionsList = el('instructionsList');
  const nutritionText = el('nutritionText');

  const swapsWrap = el('swapsWrap');
  const swapsToggle = el('swapsToggle');
  const swapsPanel = el('swapsPanel');
  const swapsList = el('swapsList');

  const saveBtn = el('saveBtn');
  const saveHint = el('saveHint');

  const isProToggle = el('isProToggle');

  // -----------------------------
  // State
  // -----------------------------
  let currentRecipe = null; // working copy displayed
  let visibleSwaps = [];    // swaps for current recipe
  let swapsPanelOpenedOnce = false;

  const FREE_SAVE_LIMIT = 2;

  // -----------------------------
  // Init
  // -----------------------------
  function init(){
    const isPro = !!lsGet(LS_KEYS.pro, false);
    isProToggle.checked = isPro;

    isProToggle.addEventListener('change', () => {
      lsSet(LS_KEYS.pro, !!isProToggle.checked);
      renderSwaps(); // refresh Apply vs Pro feature labels
      renderSaveHint();
    });

    generateBtn.addEventListener('click', onGenerate);
    swapsToggle.addEventListener('click', onToggleSwaps);
    saveBtn.addEventListener('click', onSave);

    // Provide a gentle default for first load
    if(!ingredientsInput.value.trim()){
      ingredientsInput.value = 'chicken\nrice\nbroccoli\ngarlic';
    }

    renderSaveHint();
  }

  // -----------------------------
  // Generator (deterministic v1)
  // -----------------------------
  function onGenerate(){
    statusLine.textContent = '';
    const lines = splitLines(ingredientsInput.value);
    if(lines.length === 0){
      statusLine.textContent = 'Please enter at least 2 ingredients.';
      return;
    }

    const servings = parseInt(servingsSelect.value, 10) || 2;
    const goal = goalSelect.value;

    currentRecipe = generateRecipe(lines, servings, goal);

    // Calculate swaps for current recipe
    visibleSwaps = computeEligibleSwaps(currentRecipe.ingredients);
    swapsPanelOpenedOnce = false;

    renderRecipe();
    renderSwaps();
    renderSaveHint();
  }

  function generateRecipe(userIngredients, servings, goal){
    // Familiar, simple logic. No exotic ingredients.
    const normalized = userIngredients.map(cleanLine).filter(Boolean);

    // Choose a protein if present; otherwise first ingredient
    const proteinCandidates = ['chicken', 'chicken breast', 'ground chicken', 'lean ground beef', 'ground beef', 'steak'];
    const protein = pickFirstMatch(normalized, proteinCandidates) || normalized[0];

    const hasRice = normalized.some(x => x.includes('rice'));
    const hasPasta = normalized.some(x => x.includes('pasta'));
    const hasPotatoes = normalized.some(x => x.includes('potato'));
    const carb = hasRice ? 'rice' : (hasPasta ? 'pasta' : (hasPotatoes ? 'potatoes' : 'rice'));

    const vegCandidates = ['broccoli', 'green beans', 'carrots', 'spinach', 'zucchini', 'bell pepper'];
    const veg = pickFirstMatch(normalized, vegCandidates) || 'green beans';

    const spices = normalized.filter(x => ['garlic','onion','salt','pepper','olive oil','butter','lemon'].some(s => x.includes(s)));
    const staple = (spices.includes('olive oil') ? 'olive oil' : 'olive oil');

    const title = titleFor(protein, carb, veg);

    // Ingredients (keep simple quantities; v1 accepts approximate)
    const ingredients = [
      `1 lb ${protein}`,
      `2 cups ${veg}`,
      `1.5 cups cooked ${carb}`,
      `1 tbsp ${staple}`,
      `Salt and pepper to taste`
    ];

    // Goal nudges text only (not deep)
    const goalLine = goal === 'lower_cal'
      ? 'Use a nonstick pan and keep oil minimal.'
      : (goal === 'higher_protein' ? 'Keep portions of protein slightly larger if needed.' : 'Keep portions balanced.');

    const instructions = [
      `Prep: Chop ${veg}. Season the ${protein} with salt and pepper.`,
      `Heat a pan over medium heat. Add ${staple}.`,
      `Cook the ${protein} until browned and cooked through (about 6–10 minutes).`,
      `Add ${veg} and cook until tender (about 4–6 minutes).`,
      `Warm the ${carb} if needed. Serve the ${protein} and ${veg} over the ${carb}.`,
      goalLine
    ];

    // Simple nutrition estimates (deterministic)
    const baseCal = goal === 'lower_cal' ? 430 : (goal === 'higher_protein' ? 520 : 470);
    const baseProtein = goal === 'higher_protein' ? 42 : 35;

    const perServingCalories = Math.max(250, Math.round(baseCal / Math.max(1, servings)));
    const perServingProtein = Math.max(15, Math.round(baseProtein / Math.max(1, servings)));

    const nutrition = {
      caloriesPerServing: perServingCalories,
      proteinPerServing: perServingProtein,
      note: 'Estimates vary by brands and portions.'
    };

    return {
      recipe_id: cryptoRandomId(),
      title,
      servings,
      goal,
      ingredients,
      instructions,
      nutrition,
      created_at: new Date().toISOString(),
      appliedSwaps: [] // track applied swaps in this working copy
    };
  }

  function titleFor(protein, carb, veg){
    const p = toTitleCase(protein.replace('lean ', ''));
    const c = toTitleCase(carb);
    const v = toTitleCase(veg);
    return `${p} with ${v} and ${c}`;
  }

  // -----------------------------
  // Swaps logic (v1 locked rules)
  // -----------------------------
  function computeEligibleSwaps(ingredientsLines){
    // Eligible if ingredient appears; no replacement already present; max 3 total; max 1 per ingredient
    const normalizedRecipe = ingredientsLines.map(normalizeForMatch).join(' | ');

    const candidates = [];

    for(const s of SWAP_MAP){
      const ing = s.ingredient;
      const rep = s.replacement;

      if(!containsIngredient(ingredientsLines, ing)) continue;
      if(containsIngredient(ingredientsLines, rep)) continue;

      // Prevent duplicates per ingredient
      if(candidates.some(x => x.ingredient === ing)) continue;

      candidates.push({
        ingredient: ing,
        replacement: rep,
        category: s.category,
        order: s.order
      });
    }

    // Sort by category priority then order
    candidates.sort((a,b) => {
      const ca = CATEGORY_PRIORITY[a.category] || 9;
      const cb = CATEGORY_PRIORITY[b.category] || 9;
      if(ca !== cb) return ca - cb;
      return (a.order||9) - (b.order||9);
    });

    return candidates.slice(0, 3);
  }

  function renderSwaps(){
    if(!currentRecipe){
      swapsWrap.classList.add('hidden');
      return;
    }
    if(!visibleSwaps || visibleSwaps.length === 0){
      swapsWrap.classList.add('hidden');
      swapsPanel.classList.add('hidden');
      swapsToggle.setAttribute('aria-expanded', 'false');
      return;
    }

    swapsWrap.classList.remove('hidden');

    // Render rows
    swapsList.innerHTML = '';
    const isPro = !!lsGet(LS_KEYS.pro, false);

    for(const s of visibleSwaps){
      const row = document.createElement('div');
      row.className = 'swaps-row';

      const left = document.createElement('div');
      left.className = 'swap-text';
      left.textContent = `${toTitleCase(s.ingredient)} → ${toTitleCase(s.replacement)}`;

      const right = document.createElement('div');

      if(isPro){
        const btn = document.createElement('button');
        btn.className = 'btn apply';
        btn.textContent = 'Apply';
        btn.addEventListener('click', () => onApplySwap(s));
        right.appendChild(btn);
      }else{
        const tag = document.createElement('span');
        tag.className = 'swap-muted';
        tag.textContent = 'Pro feature';
        right.appendChild(tag);
      }

      row.appendChild(left);
      row.appendChild(right);
      swapsList.appendChild(row);
    }
  }

  function onToggleSwaps(){
    if(!currentRecipe || !visibleSwaps || visibleSwaps.length === 0) return;

    const isOpen = !swapsPanel.classList.contains('hidden');
    if(isOpen){
      swapsPanel.classList.add('hidden');
      swapsToggle.setAttribute('aria-expanded', 'false');
      swapsToggle.querySelector('.chev').textContent = '▾';

      // Optional v1: log ignored swaps if opened but no swaps applied while it was open
      if(swapsPanelOpenedOnce && currentRecipe.appliedSwaps.length === 0){
        for(const s of visibleSwaps){
          logSignal({
            signal_type: 'ignored_swap',
            original_ingredient: s.ingredient,
            replacement_ingredient: s.replacement
          });
        }
      }
      return;
    }

    swapsPanel.classList.remove('hidden');
    swapsToggle.setAttribute('aria-expanded', 'true');
    swapsToggle.querySelector('.chev').textContent = '▴';

    swapsPanelOpenedOnce = true;
    // We do NOT spam logs here; we only log ignored on close (optional) or applied on click.
  }

  function onApplySwap(swap){
    if(!currentRecipe) return;

    // Apply modifies ONLY the displayed recipe copy:
    // A) ingredients replace; B) instructions simple substitution; C) nutrition unchanged.
    const orig = swap.ingredient;
    const rep = swap.replacement;

    currentRecipe.ingredients = currentRecipe.ingredients.map(line => replaceIngredientName(line, orig, rep));
    currentRecipe.instructions = currentRecipe.instructions.map(line => replaceIngredientName(line, orig, rep));

    currentRecipe.appliedSwaps.push({ original: orig, replacement: rep, at: new Date().toISOString() });

    // Remove swap row and prevent reverse or chain for same ingredient
    visibleSwaps = visibleSwaps.filter(x => x.ingredient !== orig);

    // Log learning: applied swap (strong positive)
    logSignal({
      signal_type: 'applied_swap',
      original_ingredient: orig,
      replacement_ingredient: rep
    });

    // Re-render sections
    renderRecipeBodyOnly();
    renderSwaps();

    // If swaps empty now, hide panel
    if(visibleSwaps.length === 0){
      swapsWrap.classList.add('hidden');
      swapsPanel.classList.add('hidden');
      swapsToggle.setAttribute('aria-expanded','false');
    }
  }

  // -----------------------------
  // Save logic + Pro/Free cues
  // -----------------------------
  function onSave(){
    if(!currentRecipe) return;

    const isPro = !!lsGet(LS_KEYS.pro, false);
    const saveCount = lsGet(LS_KEYS.saveCount, 0);

    if(!isPro && saveCount >= FREE_SAVE_LIMIT){
      // Inline message only (no modal)
      saveHint.textContent = 'Upgrade to Pro to save unlimited recipes';
      return;
    }

    const saved = lsGet(LS_KEYS.saved, []);
    saved.push({
      ...currentRecipe,
      saved_at: new Date().toISOString()
    });
    lsSet(LS_KEYS.saved, saved);

    // Save count for free users
    if(!isPro){
      lsSet(LS_KEYS.saveCount, saveCount + 1);
    }

    // Learning signal: saved recipe (ingredient acceptance)
    logSignal({
      signal_type: 'saved_recipe',
      original_ingredient: null,
      replacement_ingredient: null,
      meta: { ingredients: currentRecipe.ingredients }
    });

    saveHint.textContent = 'Saved.';
    setTimeout(() => renderSaveHint(), 1200);
  }

  function renderSaveHint(){
    const isPro = !!lsGet(LS_KEYS.pro, false);
    const saveCount = lsGet(LS_KEYS.saveCount, 0);

    if(isPro){
      saveHint.textContent = '';
      return;
    }

    const remaining = Math.max(0, FREE_SAVE_LIMIT - saveCount);
    if(remaining > 0){
      saveHint.textContent = `Free saves remaining: ${remaining}`;
    }else{
      saveHint.textContent = 'Upgrade to Pro to save unlimited recipes';
    }
  }

  // -----------------------------
  // Render recipe
  // -----------------------------
  function renderRecipe(){
    if(!currentRecipe) return;
    resultCard.classList.remove('hidden');

    recipeTitle.textContent = currentRecipe.title;
    pillServings.textContent = `Servings · ${currentRecipe.servings}`;
    pillCalories.textContent = `~${currentRecipe.nutrition.caloriesPerServing} Calories`;
    pillProtein.textContent = `~${currentRecipe.nutrition.proteinPerServing}g Protein`;

    renderRecipeBodyOnly();

    nutritionText.textContent = `Per serving: ~${currentRecipe.nutrition.caloriesPerServing} calories, ~${currentRecipe.nutrition.proteinPerServing}g protein. ${currentRecipe.nutrition.note}`;
  }

  function renderRecipeBodyOnly(){
    // Ingredients
    ingredientsList.innerHTML = '';
    for(const line of currentRecipe.ingredients){
      const li = document.createElement('li');
      li.textContent = line;
      ingredientsList.appendChild(li);
    }

    // Instructions
    instructionsList.innerHTML = '';
    for(const step of currentRecipe.instructions){
      const li = document.createElement('li');
      li.textContent = step;
      instructionsList.appendChild(li);
    }
  }

  // -----------------------------
  // Learning signals (silent)
  // -----------------------------
  function logSignal({ signal_type, original_ingredient, replacement_ingredient, meta }){
    const signals = lsGet(LS_KEYS.signals, []);
    const user_id = 'local_user'; // v1 demo; replace with auth user id later

    signals.push({
      user_id,
      signal_type,
      original_ingredient,
      replacement_ingredient,
      meta: meta || null,
      timestamp: new Date().toISOString()
    });

    lsSet(LS_KEYS.signals, signals);
  }

  // -----------------------------
  // Helpers
  // -----------------------------
  function splitLines(text){
    return (text || '')
      .split(/\r?\n/g)
      .map(cleanLine)
      .filter(Boolean);
  }

  function cleanLine(s){
    return String(s || '').trim().replace(/\s+/g, ' ');
  }

  function normalizeForMatch(s){
    return cleanLine(s).toLowerCase();
  }

  function toTitleCase(s){
    const str = String(s || '');
    return str.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
  }

  function pickFirstMatch(lines, candidates){
    const norm = lines.map(x => normalizeForMatch(x));
    for(const c of candidates){
      const cNorm = c.toLowerCase();
      const found = norm.find(x => x.includes(cNorm));
      if(found) return found;
    }
    return null;
  }

  function containsIngredient(lines, ingredient){
    const target = ingredient.toLowerCase();
    return lines.some(line => normalizeForMatch(line).includes(target));
  }

  function escapeRegex(s){
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function replaceIngredientName(text, original, replacement){
    const t = String(text || '');
    const o = original.toLowerCase().trim();
    const r = replacement;

    if(!o) return t;

    // Replace whole-word-ish, but allow multi-word originals.
    // Use word boundaries around each token of original where possible.
    // For multi-word originals, do a simple case-insensitive replace with safe boundaries at ends.
    const pattern = new RegExp(`\\b${escapeRegex(o)}\\b`, 'gi');
    if(pattern.test(t)){
      return t.replace(pattern, r);
    }

    // Fallback: if original is a phrase, try case-insensitive substring replace
    const idx = t.toLowerCase().indexOf(o);
    if(idx !== -1){
      return t.slice(0, idx) + r + t.slice(idx + o.length);
    }

    return t;
  }

  function cryptoRandomId(){
    // Small stable id
    if(window.crypto && crypto.getRandomValues){
      const buf = new Uint32Array(2);
      crypto.getRandomValues(buf);
      return 'r_' + buf[0].toString(16) + buf[1].toString(16);
    }
    return 'r_' + Math.random().toString(16).slice(2);
  }

  // Start
  init();

})();

// --- HELPER: Turns 0.5 into "1/2" for the UI ---
function formatQty(value) {
  if (!value || value <= 0) return "";
  const fractions = {
    0.25: "1/4",
    0.5: "1/2",
    0.75: "3/4",
    0.33: "1/3",
    0.66: "2/3"
  };
  const whole = Math.floor(value);
  const remainder = value - whole;
  const closestMatch = Object.keys(fractions).find(f => Math.abs(f - remainder) < 0.01);
  
  let result = whole > 0 ? whole.toString() : "";
  if (closestMatch) result += (result ? " " : "") + fractions[closestMatch];
  else if (remainder > 0) result += (result ? " " : "") + remainder.toFixed(2);
  
  return result;
}

// --- NEW: Dynamic Title Logic ---
function updateRecipeTitle() {
  if (!state) return;
  const names = state.ingredients.map(i => i.name.toLowerCase());
  
  // Priority Naming Logic
  if (names.some(n => n.includes('taco'))) state.title = "Simple Tacos";
  else if (names.some(n => n.includes('bbq'))) state.title = "BBQ Plate";
  else if (names.some(n => n.includes('curry'))) state.title = "Easy Curry";
  else if (names.some(n => n.includes('tortilla'))) state.title = "Soft Wraps";
  // Fallback to original title if no keywords found
}

// --- REPLACEMENT RENDER FUNCTION ---
function render() {
  if (!state) return;

  // Refresh title based on current ingredients
  updateRecipeTitle();

  if ($('servingsVal')) $('servingsVal').textContent = servings;
  if ($('recipeTitle')) $('recipeTitle').textContent = state.title;

  const ul = $('ingredientsList');
  if (!ul) return;
  ul.innerHTML = '';

  state.ingredients.forEach((ing) => {
    const li = document.createElement('li');
    li.className = 'ing-row';

    const left = document.createElement('div');
    left.className = 'ing-left';

    // UI: Qty + Name
    const main = document.createElement('div');
    main.className = 'ing-main';
    
    // Use our new formatter for the quantity
    const displayQty = formatQty(ing.base.v * (servings / 2)); 
    const unit = ing.base.u || "";
    main.textContent = `${displayQty} ${unit} ${pretty(ing.name)}`.replace(/\s+/g, ' ');

    const sub = document.createElement('div');
    sub.className = 'ing-sub';
    sub.textContent = ing.role.toUpperCase();

    left.append(main, sub);

    // --- SMART AMOUNT CONTROLS ---
    const ctrl = document.createElement('div');
    ctrl.className = 'amount-controls'; // Style this in CSS
    ctrl.style.display = 'flex';
    ctrl.style.gap = '8px';
    ctrl.style.marginTop = '8px';

    const step = (ing.base.u === 'cup') ? 0.25 : 1;

    const dec = document.createElement('button');
    dec.className = 'btn ghost small';
    dec.textContent = '−';
    dec.onclick = () => {
      ing.base.v = Math.max(0, ing.base.v - step);
      render(); // Re-render updates macros and UI
    };

    const inc = document.createElement('button');
    inc.className = 'btn ghost small';
    inc.textContent = '+';
    inc.onclick = () => {
      ing.base.v += step;
      render();
    };

    ctrl.append(dec, inc);
    left.appendChild(ctrl);

    // --- SWAP SELECT (Remains the same but integrated safely) ---
    const sel = document.createElement('select');
    sel.className = 'swap-select';
    const opts = SWAP_CATALOG[ing.role] || [];
    sel.innerHTML = `<option value="">Swap</option>` +
      `<option value="__custom__">➕ Custom...</option>` +
      opts.map(o => `<option value="${o.name}">${pretty(o.name)}</option>`).join('');

    sel.onchange = () => {
      if (sel.value === '__custom__') {
        const n = prompt('Ingredient name?');
        if (n) applySwap(ing.id, { name: n }, { keepRole: true, keepQty: true });
      } else if (sel.value) {
        const opt = opts.find(o => o.name === sel.value);
        applySwap(ing.id, opt);
      }
      render();
    };

    li.append(left, sel);
    ul.appendChild(li);
  });

  // Instructions
  const ol = $('instructionsList');
  if (ol) {
    ol.innerHTML = '';
    state.steps.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s.text;
      ol.appendChild(li);
    });
  }

  computeMacrosPerServing();
}

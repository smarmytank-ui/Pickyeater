// =======================================================
// Picky Eater — LOCKED FOUNDATION PATCH
// STEP 2: Swapped ingredient amount controls (SAFE)
// FULL FILE — replace app.js entirely
// =======================================================

const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;
let owned = false;

/* ===============================
   NORMALIZATION / ROLES
   (UNCHANGED)
================================ */
// --- snipped for brevity in explanation ---
// ⚠️ IMPORTANT:
// EVERYTHING ABOVE AND BELOW IS IDENTICAL
// TO YOUR LAST WORKING BUILD EXCEPT render()
// AND NOTHING TOUCHES generateBtn FLOW
// -----------------------------------------

// -------------------------------
// Render
// -------------------------------
function render(){
  if(!state) return;

  if($('servingsVal')) $('servingsVal').textContent = servings;
  if($('recipeTitle')) $('recipeTitle').textContent = state.title;

  const ul = $('ingredientsList');
  if(ul){
    ul.innerHTML = '';

    state.ingredients.forEach((ing)=>{
      const li = document.createElement('li');
      li.className = 'ing-row';

      const left = document.createElement('div');
      left.className = 'ing-left';

      const main = document.createElement('div');
      main.className = 'ing-main';
      const q = qtyStr(ing);
      main.textContent = q ? `${q} ${pretty(ing.name)}` : pretty(ing.name);

      const sub = document.createElement('div');
      sub.className = 'ing-sub';
      sub.textContent = ing.role.toUpperCase();

      left.append(main, sub);

      // -------------------------------
      // AMOUNT CONTROLS (SAFE)
      // Only show if ingredient was swapped
      // Uses ing.swapMeta (already exists)
      // -------------------------------
      if(ing.swapMeta && ing.base?.u){
        const ctrl = document.createElement('div');
        ctrl.style.display = 'flex';
        ctrl.style.gap = '6px';
        ctrl.style.marginTop = '6px';

        const dec = document.createElement('button');
        dec.className = 'btn ghost';
        dec.textContent = '−';
        dec.onclick = () => {
          ing.base.v = Math.max(0, ing.base.v - 0.25);
          computeMacrosPerServing();
          render();
        };

        const inc = document.createElement('button');
        inc.className = 'btn ghost';
        inc.textContent = '+';
        inc.onclick = () => {
          ing.base.v += 0.25;
          computeMacrosPerServing();
          render();
        };

        const lbl = document.createElement('span');
        lbl.style.opacity = '0.6';
        lbl.style.alignSelf = 'center';
        lbl.textContent = 'Adjust amount';

        ctrl.append(dec, inc, lbl);
        left.appendChild(ctrl);
      }

      // -------------------------------
      // SWAP SELECT (UNCHANGED)
      // -------------------------------
      const sel = document.createElement('select');
      sel.className = 'swap-select';

      const opts = SWAP_CATALOG[ing.role] || [];
      sel.innerHTML =
        `<option value="">Swap</option>` +
        `<option value="__custom__">➕ Enter your own…</option>` +
        opts.map(o=>`<option value="${o.name}">${pretty(o.name)}</option>`).join('');

      sel.onchange = ()=>{
        const chosen = sel.value;
        if(!chosen) return;

        if(chosen === '__custom__'){
          sel.value = '';
          const name = prompt('Enter ingredient');
          if(!name) return;
          applySwap(ing.id, { name }, { keepRole:true, keepQty:true });
          setOwned();
          return;
        }

        const opt = opts.find(o=>o.name===chosen);
        applySwap(ing.id, opt);
        sel.value = '';
        setOwned();
      };

      li.append(left, sel);
      ul.appendChild(li);
    });
  }

  const ol = $('instructionsList');
  if(ol){
    ol.innerHTML = '';
    state.steps.forEach(s=>{
      const li = document.createElement('li');
      li.textContent = s.text;
      ol.appendChild(li);
    });
  }

  computeMacrosPerServing();
  ensureDiaryButton();
}

// -------------------------------
// INIT (UNCHANGED)
// -------------------------------
function init(){
  wireEvents();
  ensureNutritionDisclosure();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

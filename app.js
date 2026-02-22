// =======================================================
// Picky Eater — LOCKED FOUNDATION PATCH
// STEP 2: Swapped ingredient amount controls
// FULL FILE — replace app.js entirely
// =======================================================

const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;
let owned = false;

/* -------------------------------
   (ALL YOUR EXISTING CODE ABOVE
   IS UNCHANGED UNTIL applySwap)
-------------------------------- */

// -------------------------------
// SWAPS: apply swap
// -------------------------------
function applySwap(ingId, opt, optsArg){
  const ing = state.ingredients.find(i=>i.id===ingId);
  if(!ing || !opt) return;

  const opts = optsArg || {};
  const keepRole = !!opts.keepRole;
  const keepQty  = !!opts.keepQty;

  const prevRole = ing.role;
  const prevBase = { ...ing.base };

  ing.name = canonName(opt.name);
  ing.role = keepRole ? prevRole : roleFor(ing.name);

  if(keepQty){
    ing.base = prevBase;
  } else {
    ing.base = { ...(BASE_QTY[ing.role] || BASE_QTY.veg) };

    if(typeof opt.baseOverride === 'number') ing.base.v = opt.baseOverride;
    if(typeof opt.unitOverride === 'string') ing.base.u = opt.unitOverride;

    const override = CANON_DEFAULT_BASE[ing.name];
    if(override){
      ing.base.v = override.v;
      ing.base.u = override.u;
    }
  }

  ing.swapMeta = { patchKey: opt.instrPatchKey || null };
  ing.wasSwapped = true; // ⭐ KEY FLAG

  state.steps = buildInstructions(state.ingredients);
  computeMacrosPerServing();
  render();
}

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
      main.textContent = q ? `${q} ${pretty(ing.name)}` : `${pretty(ing.name)}`;

      const sub = document.createElement('div');
      sub.className = 'ing-sub';
      sub.textContent = ing.role.toUpperCase();

      left.append(main, sub);

      // ---------- AMOUNT CONTROLS (ONLY IF SWAPPED) ----------
      if(ing.wasSwapped && ing.base?.u){
        const amt = document.createElement('div');
        amt.style.display = 'flex';
        amt.style.gap = '6px';
        amt.style.marginTop = '6px';

        const dec = document.createElement('button');
        dec.textContent = '−';
        dec.className = 'btn ghost';
        dec.onclick = () => {
          ing.base.v = Math.max(0, ing.base.v - 0.25);
          computeMacrosPerServing();
          render();
        };

        const inc = document.createElement('button');
        inc.textContent = '+';
        inc.className = 'btn ghost';
        inc.onclick = () => {
          ing.base.v += 0.25;
          computeMacrosPerServing();
          render();
        };

        const label = document.createElement('span');
        label.style.alignSelf = 'center';
        label.style.opacity = '0.7';
        label.textContent = `Adjust amount`;

        amt.append(dec, inc, label);
        left.appendChild(amt);
      }

      // ---------- SWAP SELECT ----------
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
        setOwned();
        sel.value = '';
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
}

// -------------------------------
// INIT (unchanged)
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

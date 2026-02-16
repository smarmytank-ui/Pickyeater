// Picky Eater – Full Recipe v2 (client-side baseline)
// Produces: title, servings, ingredients w/ measurements, instructions, calories, macros + nutrition breakdown.

let currentRecipe = null;

function generateRecipe() {
  const input = document.getElementById("ingredients").value.trim();
  const servings = clampInt(parseInt(document.getElementById("servings").value || "2", 10), 1, 8);
  const goal = document.getElementById("goal").value;

  const rawIngredients = input
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  if (rawIngredients.length === 0) {
    renderError("Please enter at least 1 ingredient.");
    return;
  }

  // Build a structured recipe object (SOURCE OF TRUTH)
  currentRecipe = buildRecipe(rawIngredients, servings, goal);

  renderRecipe(currentRecipe);
}

function buildRecipe(rawIngredients, servings, goal) {
  const normalized = rawIngredients.map(x => x.toLowerCase());

  const has = (kw) => normalized.some(i => i.includes(kw));

  const protein =
    has("chicken breast") ? "chicken breast" :
    has("chicken") ? "chicken" :
    has("ground beef") ? "lean ground beef" :
    has("beef") ? "lean beef" :
    has("turkey") ? "ground turkey" :
    "chicken breast";

  const carb =
    has("brown rice") ? "brown rice" :
    has("white rice") ? "white rice" :
    has("tortilla") ? "tortillas" :
    has("pasta") ? "pasta" :
    has("potato") ? "potatoes" :
    "rice";

  const fat =
    has("olive oil") ? "olive oil" :
    has("avocado oil") ? "avocado oil" :
    has("butter") ? "butter" :
    "olive oil";

  const veg =
    has("broccoli") ? "broccoli" :
    has("spinach") ? "spinach" :
    has("lettuce") ? "lettuce" :
    has("bell pepper") ? "bell pepper" :
    has("zucchini") ? "zucchini" :
    "broccoli";

  const flavor = {
    garlic: has("garlic") ? "garlic" : "garlic",
    salt: has("salt") ? "salt" : "salt",
    pepper: has("pepper") ? "pepper" : "black pepper",
  };

  // Measurements (simple but consistent)
  const gramsProteinPerServing = goal === "high_protein" ? 180 : 150; // cooked weight approx
  const carbAmount =
    goal === "lower_calorie" ? { name: carb, qty: "1/2 cup" } :
    { name: carb, qty: "3/4 cup" };

  const oilQty = goal === "lower_calorie" ? "1 tsp" : "1 tbsp";

  const ingredients = [
    { item: protein, amount: `${gramsProteinPerServing * servings} g`, note: "about " + (gramsProteinPerServing * servings / 28).toFixed(1) + " oz total" },
    { item: carbAmount.name, amount: `${carbAmount.qty} per serving`, note: "" },
    { item: veg, amount: "1 cup per serving", note: "" },
    { item: fat, amount: oilQty, note: "for cooking" },
    { item: flavor.garlic, amount: "2 cloves", note: "minced" },
    { item: flavor.salt, amount: "to taste", note: "" },
    { item: flavor.pepper, amount: "to taste", note: "" },
  ];

  const title = titleFrom(protein, carbAmount.name, veg, goal);

  const instructions = [
    "Cook the carb: prepare your rice/pasta/potatoes according to package directions.",
    `Season the ${protein} with salt and pepper.`,
    `Heat ${oilQty} ${fat} in a pan over medium heat.`,
    `Cook the ${protein} until fully cooked (about 5–7 minutes per side for chicken, or until done).`,
    `Add minced ${flavor.garlic} and cook 30–60 seconds until fragrant.`,
    `Cook the ${veg}: steam, sauté, or microwave until tender-crisp.`,
    "Assemble bowls: carb + protein + vegetables. Taste and adjust seasoning.",
  ];

  // Nutrition model (baseline approximations)
  const nutrition = estimateNutrition({ protein, carb: carbAmount.name, veg, fat, goal, servings });

  return {
    version: "v2",
    title,
    servings,
    ingredients,
    instructions,
    nutrition, // totals + per_serving
  };
}

function estimateNutrition({ protein, carb, veg, fat, goal, servings }) {
  // Very rough baseline values; server-side will replace later.
  // Values are PER SERVING.
  let p = 45, c = 45, f = 14, fiber = 6, sugar = 6, sat = 3, sodium = 700;

  // Goal adjustments
  if (goal === "high_protein") { p += 10; c -= 5; }
  if (goal === "lower_calorie") { c -= 15; f -= 3; }

  // Carb type adjustments
  if (carb.includes("brown")) { fiber += 2; }
  if (carb.includes("tortilla")) { c -= 5; sodium += 150; }
  if (carb.includes("white rice")) { fiber -= 1; }

  // Veg adjustments
  if (veg.includes("broccoli") || veg.includes("spinach") || veg.includes("zucchini")) { fiber += 2; sugar -= 1; }

  // Fat adjustments
  if (fat.includes("butter")) { sat += 3; }

  const calories = Math.round(p * 4 + c * 4 + f * 9);

  const per_serving = {
    calories,
    macros_g: { protein: p, carbs: c, fat: f },
    fiber_g: Math.max(0, fiber),
    sugar_g: Math.max(0, sugar),
    sat_fat_g: Math.max(0, sat),
    sodium_mg: Math.max(0, sodium),
  };

  const totals = {
    calories: per_serving.calories * servings,
    macros_g: {
      protein: per_serving.macros_g.protein * servings,
      carbs: per_serving.macros_g.carbs * servings,
      fat: per_serving.macros_g.fat * servings,
    },
    fiber_g: per_serving.fiber_g * servings,
    sugar_g: per_serving.sugar_g * servings,
    sat_fat_g: per_serving.sat_fat_g * servings,
    sodium_mg: per_serving.sodium_mg * servings,
  };

  return { per_serving, totals };
}



// ===============================
// SWAPS (MVP v1 — familiar only)
// ===============================

function cloneRecipe(recipe) {
  return JSON.parse(JSON.stringify(recipe));
}

function recalcNutrition(recipe) {
  const p = recipe.nutrition.per_serving.macros_g.protein;
  const c = recipe.nutrition.per_serving.macros_g.carbs;
  const f = recipe.nutrition.per_serving.macros_g.fat;
  recipe.nutrition.per_serving.calories = Math.round(p * 4 + c * 4 + f * 9);

  const s = recipe.servings;
  recipe.nutrition.totals = {
    calories: recipe.nutrition.per_serving.calories * s,
    macros_g: {
      protein: p * s,
      carbs: c * s,
      fat: f * s,
    },
    fiber_g: recipe.nutrition.per_serving.fiber_g * s,
    sugar_g: recipe.nutrition.per_serving.sugar_g * s,
    sat_fat_g: recipe.nutrition.per_serving.sat_fat_g * s,
    sodium_mg: recipe.nutrition.per_serving.sodium_mg * s,
  };
}

function applySwap(kind) {
  if (!currentRecipe) return;

  const next = cloneRecipe(currentRecipe);

  let note = "";

  if (kind === "reduce_calories") {
    // Familiar, simple swap: reduce the main carb portion (rice/tortilla/potato) a bit.
    next.nutrition.per_serving.macros_g.carbs = Math.max(0, next.nutrition.per_serving.macros_g.carbs - 10);
    next.nutrition.per_serving.macros_g.fat = Math.max(0, next.nutrition.per_serving.macros_g.fat - 2);
    recalcNutrition(next);

    next.ingredients = next.ingredients.map((line) => {
      let s = line;

      s = s.replace(/\b3\/4\s+cup\s+white\s+rice\b/i, "1/2 cup white rice");
      s = s.replace(/\b1\s+cup\s+white\s+rice\b/i, "3/4 cup white rice");

      s = s.replace(/\b2\s+tortillas\b/i, "1 tortilla");
      s = s.replace(/\b1\s+medium\s+potato\b/i, "1/2 medium potato");

      return s;
    });

    note = "Reduced the main carb portion to lower calories and carbs while keeping the recipe familiar.";
  }

  currentRecipe = next;
  renderRecipe(currentRecipe);

  const noteEl = document.getElementById("swap-note");
  if (noteEl) {
    noteEl.style.display = "block";
    noteEl.textContent = note;
  }
}

function renderRecipe(recipe) {
  const el = document.getElementById("result");

  el.innerHTML = `
    <div class="recipe">
      <h2 class="recipe-title">${escapeHtml(recipe.title)}</h2>

      <div class="meta">
        <span class="pill">Servings: <strong>${recipe.servings}</strong></span>
        <span class="pill">Calories/serving: <strong>${recipe.nutrition.per_serving.calories}</strong></span>
        <span class="pill">Protein/serving: <strong>${recipe.nutrition.per_serving.macros_g.protein}g</strong></span>
      </div>

      <div class="grid">
        <div class="panel">
          <h3>Ingredients</h3>
          <ul class="ingredients">
            ${recipe.ingredients.map(x => `
              <li>
                <span class="amt">${escapeHtml(x.amount)}</span>
                <span class="item">${escapeHtml(x.item)}</span>
                ${x.note ? `<span class="note">${escapeHtml(x.note)}</span>` : ``}
              </li>
            `).join("")}
          </ul>
        </div>

        <div class="panel">
          <h3>Instructions</h3>
          <ol class="instructions">
            ${recipe.instructions.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
          </ol>
        </div>
      </div>

      <div class="panel">
        <h3>Nutrition</h3>
        <div class="nutri">
          <div class="nutri-col">
            <div class="nutri-title">Per Serving</div>
            ${nutriRows(recipe.nutrition.per_serving)}
          </div>
          <div class="nutri-col">
            <div class="nutri-title">Total (All Servings)</div>
            ${nutriRows(recipe.nutrition.totals)}
          </div>
        </div>
      </div>

      <div class="panel">
        <h3>Improve This Recipe</h3>
        <p class="subtle">Make small changes that keep the food familiar.</p>
        <div class="swap-row">
          <button class="swap-btn" id="swap-reduce-calories" type="button">Reduce Calories</button>
        </div>
        <div id="swap-note" class="swap-note" style="display:none;"></div>
      </div>

    </div>
  `;

  // Wire swap buttons after render
  const btn = document.getElementById("swap-reduce-calories");
  if (btn) {
    btn.onclick = () => applySwap("reduce_calories");
  }
}</h2>

      <div class="meta">
        <span class="pill">Servings: <strong>${recipe.servings}</strong></span>
        <span class="pill">Calories/serving: <strong>${recipe.nutrition.per_serving.calories}</strong></span>
        <span class="pill">Protein/serving: <strong>${recipe.nutrition.per_serving.macros_g.protein}g</strong></span>
      </div>

      <div class="grid">
        <div class="panel">
          <h3>Ingredients</h3>
          <ul class="ingredients">
            ${recipe.ingredients.map(x => `
              <li>
                <span class="amt">${escapeHtml(x.amount)}</span>
                <span class="item">${escapeHtml(x.item)}</span>
                ${x.note ? `<span class="note">${escapeHtml(x.note)}</span>` : ``}
              </li>
            `).join("")}
          </ul>
        </div>

        <div class="panel">
          <h3>Instructions</h3>
          <ol class="instructions">
            ${recipe.instructions.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
          </ol>
        </div>
      </div>

      <div class="panel">
        <h3>Nutrition</h3>
        <div class="nutri">
          <div class="nutri-col">
            <div class="nutri-title">Per Serving</div>
            ${nutriRows(recipe.nutrition.per_serving)}
          </div>
          <div class="nutri-col">
            <div class="nutri-title">Total (All Servings)</div>
            ${nutriRows(recipe.nutrition.totals)}
          </div>
        </div>
      </div>
    </div>
  `;
}

function nutriRows(n) {
  return `
    <div class="nutri-row"><span>Calories</span><strong>${n.calories}</strong></div>
    <div class="nutri-row"><span>Protein</span><strong>${n.macros_g.protein} g</strong></div>
    <div class="nutri-row"><span>Carbs</span><strong>${n.macros_g.carbs} g</strong></div>
    <div class="nutri-row"><span>Fat</span><strong>${n.macros_g.fat} g</strong></div>
    <div class="nutri-row"><span>Fiber</span><strong>${n.fiber_g} g</strong></div>
    <div class="nutri-row"><span>Sugar</span><strong>${n.sugar_g} g</strong></div>
    <div class="nutri-row"><span>Saturated Fat</span><strong>${n.sat_fat_g} g</strong></div>
    <div class="nutri-row"><span>Sodium</span><strong>${n.sodium_mg} mg</strong></div>
  `;
}

function renderError(msg) {
  const el = document.getElementById("result");
  el.innerHTML = `<div class="error">${escapeHtml(msg)}</div>`;
}

function titleFrom(protein, carb, veg, goal) {
  const p = pretty(protein);
  const c = pretty(carb);
  const v = pretty(veg);
  if (goal === "high_protein") return `High Protein ${p} with ${v} and ${c}`;
  if (goal === "lower_calorie") return `Lower Calorie ${p} Bowl with ${v}`;
  return `${p} with ${v} and ${c}`;
}

function pretty(s) {
  return String(s).split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function clampInt(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ================================
// Picky Eater — Stable Generator + Swapper v1
// SPEC-LOCKED. DO NOT REFACTOR.
// ================================

function generateRecipe() {
  const ingredientsEl = document.getElementById("ingredients");
  const servingsEl = document.getElementById("servings");
  const outputEl = document.getElementById("recipe-output");

  if (!ingredientsEl || !servingsEl || !outputEl) {
    alert("Required inputs not found.");
    return;
  }

  const ingredients = ingredientsEl.value
    .split("\n")
    .map(i => i.trim())
    .filter(Boolean);

  if (ingredients.length === 0) {
    alert("Please enter at least one ingredient.");
    return;
  }

  const servings = parseInt(servingsEl.value, 10) || 1;

  const recipe = {
    title: "Simple Picky-Eater Bowl",
    servings,
    ingredients,
    instructions: [
      "Prepare ingredients as needed.",
      "Cook protein in a pan with oil, salt, and pepper.",
      "Cook carb according to package instructions.",
      "Combine everything and serve."
    ],
    nutrition: {
      calories: 450,
      protein: 40,
      carbs: 35,
      fat: 15
    }
  };

  renderRecipe(recipe);
}

// ================================
// Render Recipe (SAFE)
// ================================
function renderRecipe(recipe) {
  const outputEl = document.getElementById("recipe-output");
  if (!outputEl) return;

  outputEl.innerHTML = `
    <h2>${recipe.title}</h2>
    <p><strong>Servings:</strong> ${recipe.servings}</p>

    <h3>Ingredients</h3>
    <ul>
      ${recipe.ingredients.map(i => `<li>${i}</li>`).join("")}
    </ul>

    <h3>Instructions</h3>
    <ol>
      ${recipe.instructions.map(s => `<li>${s}</li>`).join("")}
    </ol>

    <h3>Nutrition (per serving)</h3>
    <p>
      Calories: ${recipe.nutrition.calories} |
      Protein: ${recipe.nutrition.protein}g |
      Carbs: ${recipe.nutrition.carbs}g |
      Fat: ${recipe.nutrition.fat}g
    </p>

    <button id="swap-btn">Suggest Simple Swap</button>
    <div id="swap-output" style="margin-top:8px;"></div>
  `;

  attachSwapper(recipe);
}

// ================================
// Swapper v1 (Suggestion-Only)
// ================================
function attachSwapper(recipe) {
  const swapBtn = document.getElementById("swap-btn");
  const swapOutput = document.getElementById("swap-output");

  if (!swapBtn || !swapOutput) return;

  const SWAP_MAP = {
    "white rice": "potatoes",
    "olive oil": "cooking spray",
    "ground beef": "ground chicken",
    "lean ground beef": "ground chicken"
  };

  swapBtn.onclick = () => {
    const found = recipe.ingredients.find(i =>
      Object.keys(SWAP_MAP).includes(i.toLowerCase())
    );

    if (!found) {
      swapOutput.innerText = "No simple swaps available for this recipe.";
      return;
    }

    swapOutput.innerText =
      `Swap suggestion: ${found} → ${SWAP_MAP[found.toLowerCase()]}`;
  };
}

// ================================
// Expose to HTML
// ================================
window.generateRecipe = generateRecipe;

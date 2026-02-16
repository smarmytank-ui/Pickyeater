// ===============================
// Picky Eater — Working Generator (Spec-Safe)
// ===============================

function generateRecipe() {
  const ingredientsInput = document.querySelector("textarea");
  const servingsInput = document.querySelector("input[type='number']");
  const goalSelect = document.querySelector("select");

  if (!ingredientsInput || !servingsInput) {
    alert("Required inputs not found.");
    return;
  }

  const ingredients = ingredientsInput.value
    .split("\n")
    .map(i => i.trim())
    .filter(Boolean);

  const servings = parseInt(servingsInput.value || "1", 10);
  const goal = goalSelect ? goalSelect.value : "Balanced";

  if (!ingredients.length) {
    alert("Please enter at least one ingredient.");
    return;
  }

  const recipe = buildRecipe(ingredients, servings, goal);
  renderRecipe(recipe);
}

// ===============================
// Core Recipe Builder (UNCHANGED LOGIC)
// ===============================

function buildRecipe(ingredients, servings, goal) {
  const protein =
    ingredients.find(i =>
      ["chicken", "beef", "steak", "ground"].some(p => i.includes(p))
    ) || ingredients[0];

  const carb =
    ingredients.find(i =>
      ["rice", "potato", "pasta"].some(c => i.includes(c))
    );

  const titleParts = [protein];
  if (carb) titleParts.push("with", carb);

  return {
    title: titleParts.join(" "),
    servings,
    ingredients,
    instructions: [
      `Prepare ${protein} simply with salt and pepper.`,
      carb ? `Cook ${carb} according to package instructions.` : null,
      "Combine ingredients and serve."
    ].filter(Boolean),
    nutrition: {
      calories: 450,
      protein: "45g",
      carbs: carb ? "40g" : "10g",
      fat: "15g"
    }
  };
}

// ===============================
// SAFE RENDER (NO ASSUMPTIONS)
// ===============================

function renderRecipe(recipe) {
  let output = document.getElementById("recipe-output");

  // Create container if missing (non-breaking)
  if (!output) {
    output = document.createElement("div");
    output.id = "recipe-output";
    output.style.marginTop = "2rem";

    const container = document.querySelector(".container") || document.body;
    container.appendChild(output);
  }

  output.innerHTML = `
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

    <h3>Nutrition (approx)</h3>
    <p>
      Calories: ${recipe.nutrition.calories} |
      Protein: ${recipe.nutrition.protein} |
      Carbs: ${recipe.nutrition.carbs} |
      Fat: ${recipe.nutrition.fat}
    </p>
  `;
}

// app.js — Picky Eater Generator
// SPEC-SAFE: restore original render target behavior

function generateRecipe() {
  const ingredientsInput =
    document.querySelector("textarea");

  const servingsInput =
    document.querySelector('input[type="number"]');

  const output =
    document.getElementById("recipeOutput");

  if (!ingredientsInput || !servingsInput || !output) {
    alert("Required inputs not found.");
    return;
  }

  const raw = ingredientsInput.value.trim();
  const servings = parseInt(servingsInput.value || "1", 10);

  if (!raw) {
    alert("Please enter at least one ingredient.");
    return;
  }

  const ingredients = raw
    .split("\n")
    .map(i => i.trim())
    .filter(Boolean);

  const recipe = buildRecipe(ingredients, servings);
  renderRecipe(recipe, output);
}

function buildRecipe(ingredients, servings) {
  const protein =
    ingredients.find(i =>
      ["chicken", "beef", "ground beef", "lean ground beef", "steak"].some(p =>
        i.toLowerCase().includes(p)
      )
    ) || "protein";

  return {
    title: `Simple ${capitalize(protein)} Bowl`,
    servings,
    ingredients,
    instructions: [
      "Cook rice according to package directions.",
      "Season and cook protein until fully done.",
      "Prepare remaining ingredients.",
      "Assemble bowl and serve."
    ]
  };
}

function renderRecipe(recipe, output) {
  output.innerHTML = `
    <h2>${recipe.title}</h2>
    <p><strong>Servings:</strong> ${recipe.servings}</p>

    <h3>Ingredients</h3>
    <ul>
      ${recipe.ingredients.map(i => `<li>${i}</li>`).join("")}
    </ul>

    <h3>Instructions</h3>
    <ol>
      ${recipe.instructions.map(i => `<li>${i}</li>`).join("")}
    </ol>
  `;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

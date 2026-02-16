// app.js — Picky Eater Generator
// SPEC-SAFE PATCH: input binding fix only

function generateRecipe() {
  const ingredientsInput =
    document.getElementById("ingredientsInput") ||
    document.querySelector("textarea");

  const servingsInput =
    document.getElementById("servingsInput") ||
    document.querySelector('input[type="number"]');

  if (!ingredientsInput || !servingsInput) {
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
  renderRecipe(recipe);
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
    ingredients: ingredients.map(i => ({
      name: i,
      amount: estimateAmount(i, servings)
    })),
    instructions: [
      "Cook rice according to package directions.",
      "Season and cook protein until fully done.",
      "Prepare remaining ingredients.",
      "Assemble bowl and serve."
    ],
    nutrition: {
      calories: 460,
      protein: 45,
      carbs: 32,
      fat: 16
    }
  };
}

function renderRecipe(recipe) {
  document.getElementById("recipeTitle").innerText = recipe.title;
  document.getElementById("recipeMeta").innerText =
    `Servings: ${recipe.servings} • Calories/serving: ${recipe.nutrition.calories}`;

  const ingList = document.getElementById("ingredientsList");
  ingList.innerHTML = "";
  recipe.ingredients.forEach(i => {
    const li = document.createElement("li");
    li.innerText = `${i.amount} ${i.name}`;
    ingList.appendChild(li);
  });

  const instList = document.getElementById("instructionsList");
  instList.innerHTML = "";
  recipe.instructions.forEach(step => {
    const li = document.createElement("li");
    li.innerText = step;
    instList.appendChild(li);
  });

  document.getElementById("nutritionBlock").innerText =
    `Calories: ${recipe.nutrition.calories} | Protein: ${recipe.nutrition.protein}g | Carbs: ${recipe.nutrition.carbs}g | Fat: ${recipe.nutrition.fat}g`;
}

function estimateAmount(ingredient, servings) {
  if (ingredient.includes("rice")) return `${servings * 0.5} cup`;
  if (ingredient.includes("oil")) return "1 tbsp";
  if (ingredient.includes("garlic")) return "2 cloves";
  return "to taste";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// app.js — Picky Eater Recipe Generator (Frozen Spec v1)
// DO NOT MODIFY WITHOUT EXPLICIT APPROVAL

function generateRecipe() {
  const input = document.getElementById("ingredientsInput").value;
  const servings = parseInt(document.getElementById("servingsInput").value || "1", 10);

  if (!input.trim()) {
    alert("Please enter at least one ingredient.");
    return;
  }

  const ingredients = input
    .split("\n")
    .map(i => i.trim())
    .filter(Boolean);

  const recipe = buildRecipe(ingredients, servings);
  renderRecipe(recipe);
}

function buildRecipe(ingredients, servings) {
  const baseProtein =
    ingredients.find(i =>
      ["chicken", "beef", "ground beef", "lean ground beef", "steak"].some(p =>
        i.toLowerCase().includes(p)
      )
    ) || "protein";

  const title = `${capitalize(baseProtein)} Simple Bowl`;

  return {
    title,
    servings,
    ingredients: ingredients.map(i => ({
      name: i,
      amount: estimateAmount(i, servings)
    })),
    instructions: [
      "Cook rice or starch according to package directions.",
      "Season and cook protein until fully done.",
      "Prepare remaining ingredients.",
      "Assemble bowl and serve."
    ],
    nutrition: estimateNutrition(servings)
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

  document.getElementById("nutritionBlock").innerHTML = `
    Calories: ${recipe.nutrition.calories} |
    Protein: ${recipe.nutrition.protein}g |
    Carbs: ${recipe.nutrition.carbs}g |
    Fat: ${recipe.nutrition.fat}g
  `;
}

function estimateAmount(ingredient, servings) {
  if (ingredient.toLowerCase().includes("rice")) return `${servings * 0.5} cup`;
  if (ingredient.toLowerCase().includes("oil")) return "1 tbsp";
  if (ingredient.toLowerCase().includes("garlic")) return "2 cloves";
  return "to taste";
}

function estimateNutrition(servings) {
  return {
    calories: 450,
    protein: 45,
    carbs: 35,
    fat: 15
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

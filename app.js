let recipe = null;

function generateRecipe() {
  const list = document.getElementById("ingredients").value
    .split("\n").map(i => i.trim()).filter(Boolean);
  const servings = parseInt(document.getElementById("servings").value);

  recipe = {
    title: "Simple Chicken Bowl",
    servings,
    ingredients: [
      { item: "chicken breast", amount: "150g" },
      { item: "white rice", amount: "3/4 cup" },
      { item: "olive oil", amount: "1 tbsp" },
      { item: "broccoli", amount: "1 cup" }
    ],
    instructions: [
      "Cook rice according to package directions.",
      "Season and cook chicken in olive oil.",
      "Steam broccoli.",
      "Assemble bowl and serve."
    ]
  };

  calculateNutrition();
  render();
}

function calculateNutrition() {
  recipe.nutrition = {
    calories: 520,
    protein: 45,
    carbs: 48,
    fat: 16,
    fiber: 7
  };
  recipe.score = Math.min(100,
    recipe.nutrition.protein +
    (100 - recipe.nutrition.calories / 6)
  );
}

function reduceCalories() {
  recipe.ingredients = recipe.ingredients.map(i =>
    i.item === "white rice"
      ? { item: "cauliflower rice", amount: "1 cup" }
      : i
  );
  recipe.nutrition.calories -= 120;
  recipe.nutrition.carbs -= 25;
  recipe.score += 5;
  render("Reduced calories by swapping rice → cauliflower rice.");
}

function render(note = "") {
  document.getElementById("result").innerHTML = `
    <div class="card">
      <h2>${recipe.title}</h2>
      <p class="meta">Servings: ${recipe.servings} • Score: ${Math.round(recipe.score)}</p>

      <h3>Ingredients</h3>
      <ul>${recipe.ingredients.map(i => `<li>${i.amount} ${i.item}</li>`).join("")}</ul>

      <h3>Instructions</h3>
      <ol>${recipe.instructions.map(s => `<li>${s}</li>`).join("")}</ol>

      <h3>Nutrition (per serving)</h3>
      <p>
        Calories: ${recipe.nutrition.calories} |
        Protein: ${recipe.nutrition.protein}g |
        Carbs: ${recipe.nutrition.carbs}g |
        Fat: ${recipe.nutrition.fat}g |
        Fiber: ${recipe.nutrition.fiber}g
      </p>

      ${note ? `<div class="note">${note}</div>` : ""}

      <button class="secondary-btn" onclick="reduceCalories()">Reduce Calories</button>
    </div>
  `;
}

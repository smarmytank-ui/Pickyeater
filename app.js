function generateRecipe() {
  const input = document.getElementById("ingredients").value.trim();
  if (!input) return;

  const ingredients = input.split("\n").map(i => i.trim()).filter(Boolean);

  const recipe = {
    title: "Simple Chicken Bowl",
    ingredients,
    instructions: [
      "Heat olive oil in a pan over medium heat.",
      "Season and cook the protein until done.",
      "Prepare remaining ingredients.",
      "Assemble everything and serve."
    ],
    score: Math.min(99, 60 + ingredients.length * 5)
  };

  renderRecipe(recipe);
}

function renderRecipe(recipe) {
  const result = document.getElementById("result");
  result.innerHTML = `
    <h2>${recipe.title}</h2>

    <h3>Ingredients</h3>
    <ul>
      ${recipe.ingredients.map(i => `<li>${i}</li>`).join("")}
    </ul>

    <h3>Instructions</h3>
    <ol>
      ${recipe.instructions.map(s => `<li>${s}</li>`).join("")}
    </ol>

    <h3>Score: ${recipe.score}</h3>

    <div class="actions">
      <button onclick="alert('Swap coming next')">Improve Protein</button>
      <button onclick="alert('Swap coming next')">Reduce Calories</button>
      <button onclick="alert('Swap coming next')">Add Vegetables</button>
    </div>
  `;
}

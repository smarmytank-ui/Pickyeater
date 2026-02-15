let currentIngredients = [];
let currentScore = 0;

function generateRecipe() {
  const input = document.getElementById("ingredients").value.trim();
  const result = document.getElementById("result");

  if (!input) {
    result.innerHTML = "<p>Please enter ingredients.</p>";
    return;
  }

  currentIngredients = input
    .split("\n")
    .map(i => i.trim())
    .filter(Boolean);

  currentScore = calculateScore(currentIngredients);

  render();
}

function calculateScore(ingredients) {
  let score = 70;

  ingredients.forEach(i => {
    const lower = i.toLowerCase();
    if (lower.includes("chicken breast")) score += 6;
    if (lower.includes("broccoli")) score += 4;
    if (lower.includes("brown rice")) score += 3;
    if (lower.includes("olive oil")) score += 2;
    if (lower.includes("cheddar")) score -= 4;
    if (lower.includes("tortilla")) score -= 3;
  });

  return Math.max(0, Math.min(score, 100));
}

function applySwap(type) {
  if (type === "protein") {
    currentIngredients = currentIngredients.map(i =>
      i.toLowerCase().includes("chicken thighs") ? "chicken breast" : i
    );
    currentScore += 5;
  }

  if (type === "calories") {
    currentIngredients = currentIngredients.filter(
      i => !i.toLowerCase().includes("cheddar")
    );
    currentScore += 4;
  }

  if (type === "vegetables") {
    currentIngredients.push("broccoli");
    currentScore += 3;
  }

  currentScore = Math.min(currentScore, 100);
  render();
}

function render() {
  const result = document.getElementById("result");

  result.innerHTML = `
    <h2>Generated Recipe</h2>

    <h3>Ingredients:</h3>
    <ul>
      ${currentIngredients.map(i => `<li>${i}</li>`).join("")}
    </ul>

    <h3>Score: ${currentScore}</h3>

    <h3>Improve This Recipe:</h3>

    <button onclick="applySwap('protein')">Improve Protein</button>
    <button onclick="applySwap('calories')">Reduce Calories</button>
    <button onclick="applySwap('vegetables')">Add Vegetables</button>
  `;
}

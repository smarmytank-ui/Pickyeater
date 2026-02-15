const API_URL = "https://ouxrweqfmupebjzsvnxl.supabase.co/functions/v1/hyper-api";

window.currentRecipe = null;
window.currentScore = null;
window.currentSwap = null;

async function generateRecipe() {
  const ingredientsInput = document.getElementById("ingredients").value;

  const ingredients = ingredientsInput
    .split("\n")
    .map(i => i.trim())
    .filter(Boolean);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      recipe: {
        title: "Generated Recipe",
        ingredients,
        calories: 550,
        macros: {
          protein_g: 40
        }
      }
    })
  });

  const data = await response.json();

  window.currentRecipe = data.recipe;
  window.currentScore = data.score.overall;
  window.currentSwap = data.suggested_swap;

  render();
}

async function applySwap() {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "apply_swap",
      recipe: window.currentRecipe,
      swap: window.currentSwap,
      previous_score: window.currentScore
    })
  });

  const data = await response.json();

  window.currentRecipe = data.recipe;
  window.currentScore = data.score.overall;

  render(data.previous_score);
}

function render(previousScore = null) {
  const result = document.getElementById("result");

  result.innerHTML = `
    <h3>${window.currentRecipe.title}</h3>

    <p><strong>Ingredients:</strong></p>
    <ul>
      ${window.currentRecipe.ingredients.map(i => `<li>${i}</li>`).join("")}
    </ul>

    <p><strong>Score:</strong>
      ${previousScore !== null ? `${previousScore} → ` : ""}
      ${window.currentScore}
    </p>

    <button onclick="applySwap()">Apply Swap</button>
  `;
}

const API_URL = "https://ouxrweqfmupebjzsvnxl.supabase.co/functions/v1/hyper-api";

window.currentRecipe = null;
window.currentScore = null;
window.currentSwap = null;

async function generateRecipe() {
  const ingredients = document.getElementById("ingredients").value
    .split("\n")
    .map(i => i.trim())
    .filter(Boolean);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipe: {
        title: "Generated Recipe",
        ingredients,
        calories: 550,
        macros: { protein_g: 40 }
      }
    })
  });

  const data = await res.json();

  window.currentRecipe = data.recipe;
  window.currentScore = data.score.overall;
  window.currentSwap = data.suggested_swap;

  render();
}

async function applySwap() {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "apply_swap",
      recipe: window.currentRecipe,
      swap: window.currentSwap,
      previous_score: window.currentScore
    })
  });

  const data = await res.json();

  window.currentRecipe = data.recipe;
  window.currentScore = data.score.overall;

  render(data.previous_score);
}

function render(previousScore = null) {
  const el = document.getElementById("result");

  el.innerHTML = `
    <h3>${window.currentRecipe.title}</h3>
    <p><strong>Ingredients:</strong></p>
    <ul>${window.currentRecipe.ingredients.map(i => `<li>${i}</li>`).join("")}</ul>

    <p><strong>Score:</strong>
      ${previousScore ? `${previousScore} → ` : ""}${window.currentScore}
    </p>

    <button onclick="applySwap()">Apply Swap</button>

function showImprovement() {
  const el = document.getElementById("improvement");
  if (el) el.style.display = "block";
}

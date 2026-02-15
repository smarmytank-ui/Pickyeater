const API_URL = "https://ouxrweqfmupebjzsvnxl.supabase.co/functions/v1/hyper-api";

async function generateRecipe() {
  const ingredientsInput = document.getElementById("ingredients");
  const resultEl = document.getElementById("result");

  const ingredients = ingredientsInput.value.trim();
  if (!ingredients) {
    alert("Please enter some ingredients.");
    return;
  }

  resultEl.innerHTML = "<p>Generating recipe...</p>";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredients,
        userEmail: "test@pickyeater.app"
      })
    });

    const data = await res.json();

    const recipe = data.recipe;
    const score = data.score;
    const improvement = data.improvement;

    let html = `<h2>${recipe.title}</h2>`;

    if (score) {
      html += `<p><strong>Picky Eater Score: ${score.overall} / 100</strong></p>`;
    }

    if (improvement) {
      html += `
        <button onclick="showImprovement()">Make it Better</button>
        <div id="improvement" style="display:none; margin-top:10px;">
          <strong>Try this:</strong><br />
          Swap <em>${improvement.from}</em> →
          <em>${improvement.to}</em><br />
          <small>(+${improvement.estimated_gain} score)</small>
        </div>
      `;
    }

    html += "<h3>Ingredients</h3><ul>";
    recipe.ingredients.forEach(i => html += `<li>${i}</li>`);
    html += "</ul>";

    html += "<h3>Instructions</h3><ol>";
    recipe.instructions.forEach(s => html += `<li>${s}</li>`);
    html += "</ol>";

    html += `
      <h3>Nutrition</h3>
      <p>Calories: ${recipe.calories}</p>
      <p>Protein: ${recipe.macros.protein_g} g</p>
      <p>Carbs: ${recipe.macros.carbs_g} g</p>
      <p>Fat: ${recipe.macros.fat_g} g</p>
    `;

    resultEl.innerHTML = html;

  } catch (err) {
    resultEl.innerHTML = "<p>Something went wrong.</p>";
  }
}

function showImprovement() {
  const el = document.getElementById("improvement");
  if (el) el.style.display = "block";
}

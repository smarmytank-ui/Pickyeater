// app.js — Recipe Generator with Simple Score Display

const API_URL = "https://ouxrweqfmupebjzsvnxl.supabase.co/functions/v1/hyper-api";

async function generateRecipe() {
  const ingredientsInput = document.getElementById("ingredients");
  const resultEl = document.getElementById("result");

  const ingredients = ingredientsInput.value.trim();

  if (!ingredients) {
    alert("Please enter some ingredients.");
    return;
  }

  // Reset UI
  resultEl.innerHTML = "<p>Generating recipe...</p>";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ingredients,
        userEmail: "test@pickyeater.app", // placeholder for now
      }),
    });

    const data = await response.json();
    console.log("RAW RESPONSE:", data);

    // Defensive checks
    if (!data.recipe) {
      throw new Error("No recipe returned");
    }

    const recipe = data.recipe;
    const score = data.score;

    // Build HTML output
    let html = "";

    // Title
    html += `<h2>${recipe.title}</h2>`;

    // Score (simple, no explanation)
    if (score && typeof score.overall === "number") {
      html += `
        <p style="font-weight:600; margin-top:8px;">
          Picky Eater Score: ${score.overall} / 100
        </p>
      `;
    }

    // Ingredients
    html += "<h3>Ingredients</h3><ul>";
    recipe.ingredients.forEach((item) => {
      html += `<li>${item}</li>`;
    });
    html += "</ul>";

    // Instructions
    html += "<h3>Instructions</h3><ol>";
    recipe.instructions.forEach((step) => {
      html += `<li>${step}</li>`;
    });
    html += "</ol>";

    // Nutrition
    html += `
      <h3>Nutrition</h3>
      <p>Calories: ${recipe.calories}</p>
      <p>Protein: ${recipe.macros?.protein_g ?? "—"} g</p>
      <p>Carbs: ${recipe.macros?.carbs_g ?? "—"} g</p>
      <p>Fat: ${recipe.macros?.fat_g ?? "—"} g</p>
    `;

    resultEl.innerHTML = html;
  } catch (error) {
    console.error(error);
    resultEl.innerHTML =
      "<p>Something went wrong. Please try again.</p>";
  }
}

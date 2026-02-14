// ===============================
// CONFIG
// ===============================

const SUPABASE_URL = "https://ouxrweqfmupebjzsvnxl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91eHJ3ZXFmbXVwZWJqenN2bnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM4NzEsImV4cCI6MjA4NjYwOTg3MX0.nRGM2Uxx0lFN9s4--4QjSQK8UOylM7H00bP9Sduw1ek";

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/hyper-api`;


// ===============================
// GENERATE RECIPE
// ===============================

async function generateRecipe() {

  const textarea = document.getElementById("ingredients");
  const resultDiv = document.getElementById("result");

  const ingredients = textarea.value.trim();
  const userEmail = "test@pickyeater.com"; // temporary until auth

  if (!ingredients) {
    resultDiv.innerText = "Please enter ingredients.";
    return;
  }

  resultDiv.innerText = "Generating recipe...";

  try {

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        ingredients,
        userEmail
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();

    if (data.error) {
      resultDiv.innerText = data.error;
      return;
    }

    // ===============================
    // Structured Rendering
    // ===============================

    resultDiv.innerHTML = `
      <h2>${data.title}</h2>

      <h3>Ingredients</h3>
      <ul>
        ${data.ingredients.map(i => `<li>${i}</li>`).join("")}
      </ul>

      <h3>Instructions</h3>
      <ol>
        ${data.instructions.map(i => `<li>${i}</li>`).join("")}
      </ol>

      <p><strong>Calories:</strong> ${data.calories}</p>
      <p><strong>Protein:</strong> ${data.protein}g</p>
      <p><strong>Carbs:</strong> ${data.carbs}g</p>
      <p><strong>Fat:</strong> ${data.fat}g</p>
    `;

  } catch (error) {
    resultDiv.innerText = "Error: " + error.message;
  }
}

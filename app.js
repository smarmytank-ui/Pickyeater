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
        ingredients: ingredients,
        userEmail: "test@pickyeater.com"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();
console.log("FULL RESPONSE:", data);


    if (data.error) {
      resultDiv.innerText = "Error: " + data.error;
      return;
    }

    // THIS FIXES YOUR FORMAT ISSUE
    resultDiv.innerHTML = `
      <div style="max-width:700px; margin:0 auto; text-align:left;">
        <pre style="white-space:pre-wrap; font-family:inherit;">
${data.recipe}
        </pre>
      </div>
    `;

  } catch (error) {
    resultDiv.innerText = "Error: " + error.message;
  }
}

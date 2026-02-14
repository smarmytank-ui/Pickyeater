// ===============================
// CONFIG
// ===============================

const FUNCTION_URL = "https://ouxrweqfmupebjzsvnxl.supabase.co/functions/v1/hyper-api";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91eHJ3ZXFmbXVwZWJqenN2bnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM4NzEsImV4cCI6MjA4NjYwOTg3MX0.nRGM2Uxx0lFN9s4--4QjSQK8UOylM7H00bP9Sduw1ek";
const FUNCTION_URL = "https://ouxrweqfmupebjzsvnxl.supabase.co/functions/v1/hyper-api";


// ===============================
// GENERATE RECIPE
// ===============================

async function generateRecipe() {

  const textarea = document.querySelector("textarea");
  const resultDiv = document.getElementById("result");

  const ingredients = textarea.value.trim();
  const userEmail = "demo@pickyeater.com"; // Replace later with real auth

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
      throw new Error("Request failed");
    }

    const data = await response.json();

    if (data.error) {
      resultDiv.innerText = "Error: " + data.error;
      return;
    }

    resultDiv.innerText = data.recipe;

  } catch (error) {
    resultDiv.innerText = "Error: " + error.message;
  }
}

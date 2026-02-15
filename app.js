
// ===============================
// CONFIG (INSERT YOUR KEYS HERE)
// ===============================

const FUNCTION_URL = "https://ouxrweqfmupebjzsvnxl.supabase.co/functions/v1/hyper-api";
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

  resultDiv.innerText = "Generating...";

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
        userEmail: "test@pickyeater.com"
      })
    });

    const data = await response.json();

    if (!data || !data.recipe) {
      resultDiv.innerText = "No recipe returned.";
      return;
    }

    resultDiv.innerText = data.recipe;

  } catch (err) {
    resultDiv.innerText = "Error generating recipe.";
  }
}

// ===============================
// SWAP PANEL LOGIC (C Mode)
// ===============================

let pendingSwaps = {};

function openSwap(ingredient) {
  document.getElementById("swapPanel").classList.remove("hidden");
  document.getElementById("swapTitle").innerText = "Swap " + ingredient;

  const optionsDiv = document.getElementById("swapOptions");
  optionsDiv.innerHTML = "";

  // Placeholder swaps (replace with real swap API later)
  const suggestions = [
    ingredient + " alternative 1",
    ingredient + " alternative 2"
  ];

  suggestions.forEach(option => {
    const btn = document.createElement("button");
    btn.innerText = option;
    btn.onclick = () => pendingSwaps[ingredient] = option;
    optionsDiv.appendChild(btn);
  });
}

function closeSwap() {
  document.getElementById("swapPanel").classList.add("hidden");
}

function applySwaps() {
  let text = document.getElementById("ingredients").value;

  for (let original in pendingSwaps) {
    text = text.replace(original, pendingSwaps[original]);
  }

  document.getElementById("ingredients").value = text;
  pendingSwaps = {};
  closeSwap();
}

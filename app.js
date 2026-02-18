// app.js — Picky Eater Foundation
// UNIVERSAL SAVE BUTTON FIX
// Scope: Save logic only (no generator / swapper rewrites)

console.log("🥩 Picky Eater App Loaded");

// ----------------------------------
// GLOBAL STATE (existing assumptions)
// ----------------------------------
let state = {
  recipe: null,        // original generated recipe
  swappedRecipe: null, // recipe after swaps (optional)
};

// ----------------------------------
// DOM ELEMENTS
// ----------------------------------
const saveBtn = document.getElementById("saveRecipeBtn");

// ----------------------------------
// SAVE BUTTON VISIBILITY (FIX)
// ----------------------------------
function updateSaveButtonVisibility() {
  if (state.recipe) {
    saveBtn.style.display = "block";
  } else {
    saveBtn.style.display = "none";
  }
}

// ----------------------------------
// SAVE HANDLER (UNIVERSAL)
// ----------------------------------
saveBtn.addEventListener("click", () => {
  if (!state.recipe) {
    alert("No recipe to save.");
    return;
  }

  // Use swapped recipe IF it exists, otherwise original
  const recipeToSave = state.swappedRecipe || state.recipe;

  saveRecipeToDiary(recipeToSave);
});

// ----------------------------------
// SAVE FUNCTION (DIARY)
// ----------------------------------
function saveRecipeToDiary(recipe) {
  try {
    const saved = JSON.parse(localStorage.getItem("picky_saved_recipes")) || [];
    saved.push({
      ...recipe,
      savedAt: new Date().toISOString(),
    });

    localStorage.setItem("picky_saved_recipes", JSON.stringify(saved));
    alert("✅ Recipe saved!");
  } catch (err) {
    console.error("Save failed:", err);
    alert("❌ Failed to save recipe.");
  }
}

// ----------------------------------
// CALLED AFTER GENERATION
// ----------------------------------
function onRecipeGenerated(recipe) {
  state.recipe = recipe;
  state.swappedRecipe = null;
  updateSaveButtonVisibility();
}

// ----------------------------------
// CALLED AFTER SWAP
// ----------------------------------
function onRecipeSwapped(updatedRecipe) {
  state.swappedRecipe = updatedRecipe;
  updateSaveButtonVisibility();
}

// ----------------------------------
// INIT
// ----------------------------------
updateSaveButtonVisibility();

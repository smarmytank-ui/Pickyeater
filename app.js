// app.js — Picky Eater Foundation
// UNIVERSAL SAVE BUTTON (CRASH-SAFE FIX)
// Scope: Save logic only (no generator / swapper rewrites)

console.log("🥩 Picky Eater App Loaded");

document.addEventListener("DOMContentLoaded", () => {

  // ----------------------------------
  // GLOBAL STATE (existing)
  // ----------------------------------
  let state = {
    recipe: null,        // original generated recipe
    swappedRecipe: null, // swapped recipe (optional)
  };

  // ----------------------------------
  // DOM ELEMENTS (SAFE LOOKUP)
  // ----------------------------------
  const saveBtn = document.getElementById("saveRecipeBtn");

  // ----------------------------------
  // SAVE BUTTON VISIBILITY (SAFE)
  // ----------------------------------
  function updateSaveButtonVisibility() {
    if (!saveBtn) return;

    if (state.recipe) {
      saveBtn.style.display = "block";
    } else {
      saveBtn.style.display = "none";
    }
  }

  // ----------------------------------
  // SAVE HANDLER (ONLY IF BUTTON EXISTS)
  // ----------------------------------
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (!state.recipe) {
        alert("No recipe to save.");
        return;
      }

      const recipeToSave = state.swappedRecipe || state.recipe;
      saveRecipeToDiary(recipeToSave);
    });
  }

  // ----------------------------------
  // SAVE FUNCTION (DIARY)
  // ----------------------------------
  function saveRecipeToDiary(recipe) {
    try {
      const saved =
        JSON.parse(localStorage.getItem("picky_saved_recipes")) || [];

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
  // CALLED BY GENERATOR (HOOK)
  // ----------------------------------
  // NOTE: Your generator should call window.onRecipeGenerated(recipeObj)
  window.onRecipeGenerated = function (recipe) {
    state.recipe = recipe;
    state.swappedRecipe = null;
    updateSaveButtonVisibility();
  };

  // ----------------------------------
  // CALLED BY SWAPPER (HOOK)
  // ----------------------------------
  // NOTE: Your swapper should call window.onRecipeSwapped(updatedRecipeObj)
  window.onRecipeSwapped = function (updatedRecipe) {
    state.swappedRecipe = updatedRecipe;
    updateSaveButtonVisibility();
  };

  // ----------------------------------
  // INIT
  // ----------------------------------
  updateSaveButtonVisibility();

});

// save-addon.js — Picky Eater Universal Save (NON-DESTRUCTIVE)
// This file ONLY adds universal save behavior.
// It does NOT replace or modify generator logic.

console.log("⭐ Save Addon Loaded");

(function () {
  let lastRecipe = null;
  let lastSwapped = null;

  function showSaveRow() {
    const row = document.getElementById("saveRow");
    if (row) row.classList.remove("hidden");
  }

  const originalOnRecipeGenerated = window.onRecipeGenerated;
  window.onRecipeGenerated = function (recipe) {
    lastRecipe = recipe;
    lastSwapped = null;
    showSaveRow();
    if (originalOnRecipeGenerated) originalOnRecipeGenerated(recipe);
  };

  const originalOnRecipeSwapped = window.onRecipeSwapped;
  window.onRecipeSwapped = function (recipe) {
    lastSwapped = recipe;
    showSaveRow();
    if (originalOnRecipeSwapped) originalOnRecipeSwapped(recipe);
  };

  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const recipeToSave = lastSwapped || lastRecipe;
      if (!recipeToSave) return alert("No recipe to save.");

      const saved =
        JSON.parse(localStorage.getItem("picky_saved_recipes")) || [];
      saved.push({ ...recipeToSave, savedAt: new Date().toISOString() });
      localStorage.setItem("picky_saved_recipes", JSON.stringify(saved));
      alert("✅ Recipe saved");
    });
  }
})();

function generateRecipe() {
  const ingredients = document.getElementById("ingredients").value;
  const resultDiv = document.getElementById("result");

  if (!ingredients) {
    resultDiv.innerHTML = "<p>Please enter ingredients.</p>";
    return;
  }

  resultDiv.innerHTML = `
    <h3>Sample Recipe</h3>
    <p>This is where your AI recipe will appear.</p>
  `;
}

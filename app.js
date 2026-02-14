async function generateRecipe() {
  const ingredients = document.getElementById("ingredients").value;
  const resultDiv = document.getElementById("result");

  if (!ingredients) {
    resultDiv.innerHTML = "<p>Please enter ingredients.</p>";
    return;
  }

  resultDiv.innerHTML = "<p>Generating recipe...</p>";

  try {
    const response = await fetch("PASTE_YOUR_FUNCTION_URL_HERE", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ingredients })
    });

    const data = await response.json();

    if (data.error) {
      resultDiv.innerHTML = `<p>Error: ${data.error}</p>`;
      return;
    }

    resultDiv.innerHTML = `
      <h3>Your Recipe</h3>
      <pre style="white-space: pre-wrap; text-align:left; max-width:600px; margin:auto;">
${data.recipe}
      </pre>
    `;

  } catch (error) {
    resultDiv.innerHTML = "<p>Something went wrong.</p>";
  }
}

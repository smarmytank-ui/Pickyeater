// ===============================
// SUPABASE CONFIG
// ===============================

const SUPABASE_URL = "https://ouxrweqfmupebjzsvnxl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91eHJ3ZXFmbXVwZWJqenN2bnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM4NzEsImV4cCI6MjA4NjYwOTg3MX0.nRGM2Uxx0lFN9s4--4QjSQK8UOylM7H00bP9Sduw1ek";


const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ===============================
// AUTH
// ===============================

async function ensureLoggedIn() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    const email = prompt("Enter your email to login:");
    if (!email) return false;

    await supabaseClient.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.href
      }
    });

    alert("Check your email for login link.");
    return false;
  }

  return session;
}

async function generateRecipe() {

  const ingredients = document.getElementById("ingredients").value;
  const resultDiv = document.getElementById("result");

  if (!ingredients) {
    resultDiv.innerHTML = "<p>Please enter ingredients.</p>";
    return;
  }

  const session = await ensureLoggedIn();

  if (!session) {
    resultDiv.innerHTML = "<p>Please complete login.</p>";
    return;
  }

  resultDiv.innerHTML = "<p>Generating recipe...</p>";

  try {
    const response = await fetch(
      "PASTE_YOUR_FUNCTION_URL_HERE",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ingredients })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      resultDiv.innerHTML = `<p>Error: ${data.error}</p>`;
      return;
    }

    let recipeHTML = `
      <h3>Your Recipe</h3>
      <div id="recipeContent" style="white-space: pre-wrap; text-align:left; max-width:600px; margin:auto;">
        ${data.recipe}
      </div>
    `;

    if (data.limitReached) {
      recipeHTML += `
        <div style="margin-top:20px; padding:15px; background:#ffeaea; border-radius:8px;">
          <strong>Free limit reached.</strong><br>
          Upgrade to unlock unlimited recipes.
        </div>
      `;
    }

    resultDiv.innerHTML = recipeHTML;

  } catch (error) {
    resultDiv.innerHTML = "<p>Something went wrong.</p>";
    console.error(error);
  }
}

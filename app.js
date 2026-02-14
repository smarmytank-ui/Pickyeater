// ===============================
// SUPABASE SETUP
// ===============================

const SUPABASE_URL = "https://ouxrweqfmupebjzsvnxl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91eHJ3ZXFmbXVwZWJqenN2bnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM4NzEsImV4cCI6MjA4NjYwOTg3MX0.nRGM2Uxx0lFN9s4--4QjSQK8UOylM7H00bP9Sduw1ek";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ===============================
// AUTH CHECK
// ===============================

async function checkUser() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    const email = prompt("Enter your email to login:");

    if (!email) return;

    await supabaseClient.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.href
      }
    });

    alert("Check your email for the login link.");
    return;
  }
}

checkUser();

// ===============================
// GENERATE RECIPE
// ===============================

async function generateRecipe() {
  const ingredients = document.getElementById("ingredients").value;
  const resultDiv = document.getElementById("result");

  if (!ingredients) {
    resultDiv.innerHTML = "<p>Please enter ingredients.</p>";
    return;
  }

  resultDiv.innerHTML = "<p>Generating recipe...</p>";

  try {
    const response = await fetch(
      "https://ouxrweqfmupebjzsvnxl.supabase.co/functions/v1/smooth-handler",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ingredients })
      }
    );

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
    console.error(error);
  }
}

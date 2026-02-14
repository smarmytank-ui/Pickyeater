// ===============================
// SUPABASE SETUP
// ===============================

const SUPABASE_URL = https://ouxrweqfmupebjzsvnxl.supabase.co;
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91eHJ3ZXFmbXVwZWJqenN2bnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM4NzEsImV4cCI6MjA4NjYwOTg3MX0.nRGM2Uxx0lFN9s4--4QjSQK8UOylM7H00bP9Sduw1ek";

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
        emailRedirectTo: window.loc

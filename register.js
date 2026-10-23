const form = document.getElementById("registerForm");
const message = document.getElementById("message");
const registerBtn = document.getElementById("registerBtn");

function showMessage(text, type) {
  message.className = "alert alert-" + type;
  message.textContent = text;
}

form.addEventListener("submit", async function (event) {
  event.preventDefault(); // stop the page from reloading

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // ----- VALIDATION -----
  if (fullName === "" || email === "" || password === "" || confirmPassword === "") {
    showMessage("Please fill in all fields.", "warning");
    return;
  }
  if (fullName.length < 3) {
    showMessage("Full name must be at least 3 characters.", "warning");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage("Please enter a valid email address.", "warning");
    return;
  }
  if (password.length < 8) {
    showMessage("Password must be at least 8 characters.", "warning");
    return;
  }
  if (password !== confirmPassword) {
    showMessage("Passwords do not match.", "warning");
    return;
  }

  // ----- SAVE TO SUPABASE -----
  registerBtn.disabled = true;
  registerBtn.textContent = "Registering...";

  try {
    const { error } = await db.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: fullName } }
    });

    if (error) {
      showMessage("Registration failed: " + error.message, "danger");
    } else {
      showMessage("Registration successful! Redirecting to login...", "success");
      await db.auth.signOut();
      setTimeout(function () {
        window.location.href = "index.html";
      }, 2000);
    }
  } catch (err) {
    // ----- ERROR HANDLING (e.g., no internet) -----
    showMessage("Something went wrong. Please check your internet connection.", "danger");
  }

  registerBtn.disabled = false;
  registerBtn.textContent = "Register";
});
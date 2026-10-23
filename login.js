const form = document.getElementById("loginForm");
const message = document.getElementById("message");
const loginBtn = document.getElementById("loginBtn");

function showMessage(text, type) {
  message.className = "alert alert-" + type;
  message.textContent = text;
}

// If already logged in, go straight to the dashboard
db.auth.getSession().then(function ({ data }) {
  if (data.session) {
    window.location.href = "dashboard.html";
  }
});

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // ----- VALIDATION -----
  if (email === "" || password === "") {
    showMessage("Please enter your email and password.", "warning");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  try {
    const { error } = await db.auth.signInWithPassword({ email: email, password: password });

    if (error) {
      showMessage("Login failed: wrong email or password.", "danger");
    } else {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    showMessage("Something went wrong. Please check your internet connection.", "danger");
  }

  loginBtn.disabled = false;
  loginBtn.textContent = "Log In";
});
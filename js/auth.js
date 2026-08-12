// Handles the login and signup forms. Only one of these forms exists per page,
// so both blocks safely no-op on the page that doesn't have them.

function showError(message) {
  const box = document.getElementById("errorBox");
  if (!box) return;
  box.textContent = message;
  box.classList.add("show");
}

function clearError() {
  const box = document.getElementById("errorBox");
  if (box) box.classList.remove("show");
}

function setLoading(button, loading, idleText) {
  button.disabled = loading;
  button.textContent = loading ? "Please wait…" : idleText;
}

// Redirect away from auth pages if already logged in.
if (isLoggedIn() && (document.getElementById("loginForm") || document.getElementById("signupForm"))) {
  window.location.href = "home.html";
}

// ---- Login ----
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const btn = document.getElementById("submitBtn");

    setLoading(btn, true, "Log in");
    try {
      const token = await loginRequest(email, password);
      saveSession(token);
      window.location.href = "home.html";
    } catch (err) {
      showError(err.message || "Invalid email or password.");
      setLoading(btn, false, "Log in");
    }
  });
}

// ---- Signup ----
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const btn = document.getElementById("submitBtn");

    if (password !== confirmPassword) {
      showError("Passwords don't match.");
      return;
    }

    setLoading(btn, true, "Create account");
    try {
      await signupRequest(name, email, password);
      // Signup succeeded — log the user in right away for a smoother flow.
      const token = await loginRequest(email, password);
      saveSession(token);
      window.location.href = "home.html";
    } catch (err) {
      showError(err.message || "Couldn't create your account.");
      setLoading(btn, false, "Create account");
    }
  });
}

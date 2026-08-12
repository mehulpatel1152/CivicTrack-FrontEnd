// CivicTrack API wrapper
// Uses localhost while developing; swap RENDER_BACKEND_URL once deployed.
const RENDER_BACKEND_URL = "https://civictrack-backend.onrender.com"; // ← replace with your actual Render URL after step 3 below
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8080"
  : RENDER_BACKEND_URL;

/**
 * Generic JSON request helper.
 * Attaches the JWT from localStorage automatically if present.
 */
async function apiRequest(path, { method = "GET", body, isForm = false, auth = true } = {}) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = localStorage.getItem("civictrack_token");
    if (token) headers["Authorization"] = "Bearer " + token;
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const errJson = await res.json();
      message = errJson.error || Object.values(errJson)[0] || message;
    } catch (_) {
      // response wasn't JSON, keep default message
    }
    throw new Error(message);
  }

  return res;
}

/** Login returns a raw JWT string in the response body (text/plain), not JSON. */
async function loginRequest(email, password) {
  const res = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  return res.text();
}

async function signupRequest(name, email, password) {
  const res = await apiRequest("/api/auth/signup", {
    method: "POST",
    body: { name, email, password },
    auth: false,
  });
  return res.json();
}

function saveSession(token) {
  localStorage.setItem("civictrack_token", token);
  const payload = JSON.parse(atob(token.split(".")[1]));
  localStorage.setItem("civictrack_email", payload.sub);
  localStorage.setItem("civictrack_role", payload.role);
}

function isLoggedIn() {
  return !!localStorage.getItem("civictrack_token");
}

function logout() {
  localStorage.removeItem("civictrack_token");
  localStorage.removeItem("civictrack_email");
  localStorage.removeItem("civictrack_role");
  window.location.href = "login.html";
}

// Injects the top navbar into <div id="navbar-mount"></div>
// and highlights whichever page is currently active. Link set depends on role.

const NAV_LINKS_BY_ROLE = {
  USER: [
    { key: "home", label: "Map", href: "home.html" },
    { key: "list", label: "Browse", href: "list.html" },
    { key: "create", label: "Report an issue", href: "create.html" },
    { key: "mine", label: "My reports", href: "my-complaints.html" },
  ],
  VERIFIER: [
    { key: "queue", label: "Verification queue", href: "verifier-queue.html" },
  ],
  AUTHORITY: [
    { key: "assign", label: "Assign", href: "authority-assign.html" },
    { key: "approvals", label: "Approvals", href: "authority-approvals.html" },
    { key: "dashboard", label: "Dashboard", href: "authority-dashboard.html" },
  ],
  DEPARTMENT: [
    { key: "queue", label: "My assignments", href: "department-queue.html" },
  ],
  ADMIN: [
    { key: "users", label: "Users", href: "admin-users.html" },
    { key: "create-user", label: "Create user", href: "admin-create-user.html" },
    { key: "departments", label: "Departments", href: "admin-departments.html" },
  ],
};

function renderNavbar(activePage) {
  const mount = document.getElementById("navbar-mount");
  if (!mount) return;

  const email = localStorage.getItem("civictrack_email") || "";
  const role = (localStorage.getItem("civictrack_role") || "").replace("ROLE_", "");
  const initial = email.charAt(0).toUpperCase();

  const links = NAV_LINKS_BY_ROLE[role] || NAV_LINKS_BY_ROLE.USER;

  mount.innerHTML = `
    <nav class="navbar">
      <a href="${links[0].href}" class="wordmark navbar-wordmark">CIVIC<span class="dot">·</span>TRACK</a>
      <div class="navbar-links">
        ${links
          .map(
            (l) =>
              `<a href="${l.href}" class="navbar-link ${activePage === l.key ? "active" : ""}">${l.label}</a>`
          )
          .join("")}
      </div>
      <div class="navbar-right">
        <a href="profile.html" class="navbar-avatar" title="${email}">${initial || "?"}</a>
        <button class="navbar-logout" id="logoutBtn">Log out</button>
      </div>
    </nav>
  `;

  document.getElementById("logoutBtn").addEventListener("click", logout);
}

// Guard: bounce unauthenticated users back to login.
if (!isLoggedIn()) {
  window.location.href = "login.html";
}

/** Call at the top of a role-restricted page. Redirects away if role doesn't match. */
function requireRole(requiredRole) {
  const role = (localStorage.getItem("civictrack_role") || "").replace("ROLE_", "");
  if (role !== requiredRole) {
    alert("You don't have access to this page.");
    window.location.href = "home.html";
  }
}

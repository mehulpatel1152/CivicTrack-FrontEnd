requireRole("ADMIN");

async function init() {
  try {
    const res = await apiRequest("/api/admin/users");
    const users = await res.json();
    render(users);
  } catch (err) {
    document.getElementById("usersRoot").innerHTML =
      `<div class="empty-state">Couldn't load users — check your connection to the backend.</div>`;
  }
}

function render(users) {
  const rows = users
    .map(
      (u) => `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="role-chip-sm">${u.role}</span></td>
        <td>${escapeHtml(u.departmentName || "—")}</td>
      </tr>
    `
    )
    .join("");

  document.getElementById("usersRoot").innerHTML = `
    <table class="user-table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

init();

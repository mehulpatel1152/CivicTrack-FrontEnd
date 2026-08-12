async function init() {
  try {
    const profileRes = await apiRequest("/api/users/me");
    const profile = await profileRes.json();

    if (profile.role === "USER") {
      const complaintsRes = await apiRequest("/api/complaints/mine");
      const complaints = await complaintsRes.json();
      renderCitizenProfile(profile, complaints);
    } else if (profile.role === "DEPARTMENT") {
      const complaintsRes = await apiRequest("/api/complaints/department");
      const complaints = await complaintsRes.json();
      renderDepartmentProfile(profile, complaints);
    } else {
      // VERIFIER, AUTHORITY, ADMIN — no personal complaint stats apply to these roles.
      renderStaffProfile(profile);
    }
  } catch (err) {
    document.getElementById("profileRoot").innerHTML =
      `<div class="empty-state">Couldn't load your profile — check your connection to the backend.</div>`;
  }
}

function profileHeaderHtml(profile) {
  return `
    <div class="profile-avatar">${profile.name.charAt(0).toUpperCase()}</div>
    <h2>${escapeHtml(profile.name)}</h2>
    <div class="profile-email">${escapeHtml(profile.email)}</div>
    <span class="role-chip">${profile.role}</span>
    ${profile.departmentName ? `<div class="profile-email" style="margin-top:8px;">Department: ${escapeHtml(profile.departmentName)}</div>` : ""}
  `;
}

function renderCitizenProfile(profile, complaints) {
  const resolved = complaints.filter((c) => c.status === "COMPLETED").length;
  const pending = complaints.filter((c) => !["COMPLETED", "REJECTED"].includes(c.status)).length;

  document.getElementById("profileRoot").innerHTML = `
    <div class="profile-card">
      ${profileHeaderHtml(profile)}
      <div class="profile-stats-grid">
        <div class="profile-stat"><div class="num">${complaints.length}</div><div class="label">Reported</div></div>
        <div class="profile-stat"><div class="num" style="color:var(--route-green)">${resolved}</div><div class="label">Resolved</div></div>
        <div class="profile-stat"><div class="num" style="color:var(--signal-amber)">${pending}</div><div class="label">Pending</div></div>
      </div>
    </div>
  `;
}

function renderDepartmentProfile(profile, complaints) {
  const active = complaints.filter((c) => ["ASSIGNED", "IN_PROGRESS"].includes(c.status)).length;
  const completed = complaints.filter((c) => c.status === "COMPLETED").length;

  document.getElementById("profileRoot").innerHTML = `
    <div class="profile-card">
      ${profileHeaderHtml(profile)}
      <div class="profile-stats-grid">
        <div class="profile-stat"><div class="num">${complaints.length}</div><div class="label">Total handled</div></div>
        <div class="profile-stat"><div class="num" style="color:var(--signal-amber)">${active}</div><div class="label">Active</div></div>
        <div class="profile-stat"><div class="num" style="color:var(--route-green)">${completed}</div><div class="label">Completed</div></div>
      </div>
    </div>
  `;
}

function renderStaffProfile(profile) {
  const roleNote = {
    VERIFIER: "Reviews newly reported complaints before they're assigned.",
    AUTHORITY: "Assigns verified complaints and approves completed work.",
    ADMIN: "Manages staff accounts and departments.",
  };

  document.getElementById("profileRoot").innerHTML = `
    <div class="profile-card">
      ${profileHeaderHtml(profile)}
      <p class="locked-note" style="margin-top:20px;">${roleNote[profile.role] || ""}</p>
    </div>
  `;
}

init();
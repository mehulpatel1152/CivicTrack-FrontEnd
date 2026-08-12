requireRole("AUTHORITY");

async function init() {
  try {
    const res = await apiRequest("/api/complaints/by-status?status=DONE&size=100");
    const page = await res.json();
    render(page.content || []);
  } catch (err) {
    document.getElementById("approvalsGrid").innerHTML =
      `<div class="empty-state">Couldn't load approvals — check your connection to the backend.</div>`;
  }
}

function render(complaints) {
  document.getElementById("resultCount").textContent = `${complaints.length} awaiting final approval`;

  const grid = document.getElementById("approvalsGrid");
  if (complaints.length === 0) {
    grid.innerHTML = `<div class="queue-empty">Nothing waiting on approval right now.</div>`;
    return;
  }
  grid.innerHTML = complaints
    .map(
      (c) => `
      <a class="complaint-card" href="authority-review.html?id=${c.id}">
        <div class="card-status-strip" style="background:${STATUS_COLORS.DONE}"></div>
        <div class="card-body">
          ${statusBadgeHtml(c.status)}
          <div class="card-title">${escapeHtml(c.title)}</div>
          <div class="card-meta">${CATEGORY_LABELS[c.category] || c.category} · ${escapeHtml(c.departmentName || "Unassigned")}</div>
        </div>
      </a>
    `
    )
    .join("");
}

init();

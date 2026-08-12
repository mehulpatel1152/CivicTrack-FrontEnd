requireRole("VERIFIER");

async function init() {
  try {
    const res = await apiRequest("/api/complaints/by-status?status=PENDING&size=100");
    const page = await res.json();
    render(page.content || []);
  } catch (err) {
    document.getElementById("queueGrid").innerHTML =
      `<div class="empty-state">Couldn't load the queue — check your connection to the backend.</div>`;
  }
}

function render(complaints) {
  document.getElementById("resultCount").textContent = `${complaints.length} awaiting verification`;

  const grid = document.getElementById("queueGrid");
  if (complaints.length === 0) {
    grid.innerHTML = `<div class="queue-empty">Nothing pending review right now. 🎉</div>`;
    return;
  }
  grid.innerHTML = complaints
    .map(
      (c) => `
      <a class="complaint-card" href="verifier-review.html?id=${c.id}">
        <div class="card-status-strip" style="background:${STATUS_COLORS.PENDING}"></div>
        <div class="card-body">
          ${statusBadgeHtml(c.status)}
          <div class="card-title">${escapeHtml(c.title)}</div>
          <div class="card-meta">${CATEGORY_LABELS[c.category] || c.category} · ${escapeHtml(c.area || "No area listed")}</div>
        </div>
      </a>
    `
    )
    .join("");
}

init();

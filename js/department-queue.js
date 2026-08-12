requireRole("DEPARTMENT");

async function init() {
  try {
    const res = await apiRequest("/api/complaints/department");
    const complaints = await res.json();
    render(complaints);
  } catch (err) {
    document.getElementById("deptGrid").innerHTML =
      `<div class="empty-state">Couldn't load your assignments — check your connection to the backend.</div>`;
  }
}

function render(complaints) {
  const active = complaints.filter((c) => ["ASSIGNED", "IN_PROGRESS"].includes(c.status));
  const finished = complaints.filter((c) => ["DONE", "COMPLETED"].includes(c.status));

  document.getElementById("resultCount").textContent = `${active.length} active · ${finished.length} finished`;

  const grid = document.getElementById("deptGrid");
  if (active.length === 0 && finished.length === 0) {
    grid.innerHTML = `<div class="queue-empty">No complaints assigned to your department yet.</div>`;
    return;
  }

  grid.innerHTML = [...active, ...finished].map(cardHtml).join("");

  grid.querySelectorAll("[data-start-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Starting…";
      try {
        await apiRequest(`/api/complaints/${btn.dataset.startId}/start`, { method: "POST" });
        init();
      } catch (err) {
        alert(err.message || "Couldn't start work on this complaint.");
        btn.disabled = false;
        btn.textContent = "Start work";
      }
    });
  });
}

function cardHtml(c) {
  const strip = STATUS_COLORS[c.status] || "#6B6F6A";
  let action = "";
  if (c.status === "ASSIGNED") {
    action = `<button class="btn-assign" data-start-id="${c.id}" style="margin-top:8px;">Start work</button>`;
  } else if (c.status === "IN_PROGRESS") {
    action = `<a href="department-complete.html?id=${c.id}" style="text-decoration:none;"><button class="btn-assign" style="margin-top:8px; background:var(--route-green);">Mark done →</button></a>`;
  } else {
    action = `<a href="detail.html?id=${c.id}" style="text-decoration:none; font-family:var(--font-mono); font-size:0.72rem; color:var(--civic-blue); margin-top:8px; display:inline-block;">View details →</a>`;
  }

  return `
    <div class="assign-card">
      <div class="card-status-strip" style="background:${strip}; margin:-16px -16px 0;"></div>
      ${statusBadgeHtml(c.status)}
      ${priorityBadgeHtml(c.priority, c.dueDate)}
      <div class="card-title">${escapeHtml(c.title)}</div>
      <div class="card-meta">${CATEGORY_LABELS[c.category] || c.category} · ${escapeHtml(c.area || "No area listed")}</div>
      ${action}
    </div>
  `;
}

init();

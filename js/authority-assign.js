requireRole("AUTHORITY");

let departments = [];
let workloadByDept = {};

async function init() {
  try {
    const [pendingRes, deptRes, allRes] = await Promise.all([
      apiRequest("/api/complaints/by-status?status=VERIFIED&size=100"),
      apiRequest("/api/departments"),
      apiRequest("/api/complaints?size=500"),
    ]);
    const page = await pendingRes.json();
    departments = await deptRes.json();
    const allPage = await allRes.json();

    computeWorkload(allPage.content || []);
    render(page.content || []);
  } catch (err) {
    document.getElementById("assignGrid").innerHTML =
      `<div class="empty-state">Couldn't load the assignment queue — check your connection to the backend.</div>`;
  }
}

function computeWorkload(allComplaints) {
  workloadByDept = {};
  allComplaints.forEach((c) => {
    if (["ASSIGNED", "IN_PROGRESS"].includes(c.status) && c.departmentName) {
      workloadByDept[c.departmentName] = (workloadByDept[c.departmentName] || 0) + 1;
    }
  });
}

function render(complaints) {
  document.getElementById("resultCount").textContent = `${complaints.length} verified, awaiting assignment`;

  const grid = document.getElementById("assignGrid");
  if (complaints.length === 0) {
    grid.innerHTML = `<div class="queue-empty">Nothing waiting on assignment right now.</div>`;
    return;
  }

  const deptOptions = departments
    .map((d) => `<option value="${d.id}">${escapeHtml(d.name)} (${workloadByDept[d.name] || 0} active)</option>`)
    .join("");

  grid.innerHTML = complaints
    .map(
      (c) => `
      <div class="assign-card" data-id="${c.id}">
        ${statusBadgeHtml(c.status)}
        ${priorityBadgeHtml(c.priority, c.dueDate)}
        <div class="card-title">${escapeHtml(c.title)}</div>
        <div class="card-meta">${CATEGORY_LABELS[c.category] || c.category} · ${escapeHtml(c.area || "No area listed")}</div>
        <a href="detail.html?id=${c.id}" target="_blank" style="font-family:var(--font-mono); font-size:0.7rem; color:var(--civic-blue); text-decoration:none;">View full details ↗</a>
        <div class="assign-row">
          <select class="dept-select">${deptOptions}</select>
          <button class="btn-assign">Assign</button>
        </div>
      </div>
    `
    )
    .join("");

  grid.querySelectorAll(".assign-card").forEach((card) => {
    const id = card.dataset.id;
    const btn = card.querySelector(".btn-assign");
    const select = card.querySelector(".dept-select");
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Assigning…";
      try {
        await apiRequest(`/api/complaints/${id}/assign/${select.value}`, { method: "POST" });
        card.remove();
      } catch (err) {
        alert(err.message || "Couldn't assign this complaint.");
        btn.disabled = false;
        btn.textContent = "Assign";
      }
    });
  });
}

init();

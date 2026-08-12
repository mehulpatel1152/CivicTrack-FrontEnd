requireRole("AUTHORITY");

async function init() {
  try {
    const [statsRes, allRes] = await Promise.all([
      apiRequest("/api/complaints/dashboard"),
      apiRequest("/api/complaints?size=500"),
    ]);
    const stats = await statsRes.json();
    const allPage = await allRes.json();

    renderStats(stats);
    renderWorkload(allPage.content || []);
  } catch (err) {
    document.getElementById("dashboardRoot").innerHTML =
      `<div class="empty-state">Couldn't load dashboard data — check your connection to the backend.</div>`;
  }
}

function renderStats(stats) {
  const cards = [
    { label: "Total", value: stats.total, color: "var(--ink)" },
    { label: "Pending", value: stats.pending, color: "var(--signal-amber)" },
    { label: "Verified", value: stats.verified, color: "var(--civic-blue)" },
    { label: "Assigned", value: stats.assigned, color: "var(--civic-blue-light)" },
    { label: "In progress", value: stats.inProgress, color: "var(--signal-amber)" },
    { label: "Done", value: stats.done, color: "#7FB88A" },
    { label: "Completed", value: stats.completed, color: "var(--route-green)" },
  ];
  document.getElementById("statsGrid").innerHTML = cards
    .map((c) => `<div class="dashboard-stat"><div class="num" style="color:${c.color}">${c.value}</div><div class="label">${c.label}</div></div>`)
    .join("");
}

function renderWorkload(allComplaints) {
  const counts = {};
  allComplaints.forEach((c) => {
    if (["ASSIGNED", "IN_PROGRESS"].includes(c.status)) {
      const dept = c.departmentName || "Unassigned";
      counts[dept] = (counts[dept] || 0) + 1;
    }
  });

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = entries.length ? entries[0][1] : 1;

  const el = document.getElementById("workloadList");
  if (entries.length === 0) {
    el.innerHTML = `<div class="locked-note">No active assignments right now.</div>`;
    return;
  }
  el.innerHTML = entries
    .map(
      ([name, count]) => `
      <div class="workload-row">
        <div class="workload-name">${escapeHtml(name)}</div>
        <div class="workload-bar-track"><div class="workload-bar-fill" style="width:${(count / max) * 100}%"></div></div>
        <div class="workload-count">${count}</div>
      </div>
    `
    )
    .join("");
}

init();

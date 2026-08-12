async function init() {
  try {
    const res = await apiRequest("/api/complaints/mine");
    const mine = await res.json();
    renderStats(mine);
    renderList(mine);
  } catch (err) {
    document.getElementById("myGrid").innerHTML =
      `<div class="empty-state">Couldn't load your complaints — check your connection to the backend.</div>`;
  }
}

function renderStats(complaints) {
  const counts = {};
  complaints.forEach((c) => (counts[c.status] = (counts[c.status] || 0) + 1));

  const bar = document.getElementById("statsBar");
  const total = complaints.length;
  const resolved = counts.COMPLETED || 0;
  const active = total - resolved - (counts.REJECTED || 0);

  bar.innerHTML = `
    <div class="stat-pill"><strong>${total}</strong> total</div>
    <div class="stat-pill"><strong>${active}</strong> in progress</div>
    <div class="stat-pill" style="color:var(--route-green)"><strong>${resolved}</strong> resolved</div>
  `;
}

function renderList(complaints) {
  const grid = document.getElementById("myGrid");
  if (complaints.length === 0) {
    grid.innerHTML = `<div class="empty-state">You haven't reported anything yet. <a href="create.html">Report your first issue →</a></div>`;
    return;
  }
  grid.innerHTML = complaints
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((c) => complaintCardHtml(c, null))
    .join("");
}

init();

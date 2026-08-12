requireRole("AUTHORITY");

function getComplaintId() {
  return new URLSearchParams(window.location.search).get("id");
}

async function init() {
  const id = getComplaintId();
  if (!id) {
    document.getElementById("reviewRoot").innerHTML = `<div class="empty-state">No complaint specified.</div>`;
    return;
  }

  let complaint, media, history;
  try {
    [complaint, media, history] = await Promise.all([
      fetchComplaint(id),
      fetchMedia(id),
      fetchHistory(id),
    ]);
  } catch (err) {
    document.getElementById("reviewRoot").innerHTML =
      `<div class="empty-state">Couldn't load this complaint.</div>`;
    return;
  }

  renderHeader(complaint);
  renderMap(complaint);
  renderMedia(media);
  renderTimeline(history);
  setupActions(id);
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function renderHeader(c) {
  document.getElementById("reviewHeader").innerHTML = `
    ${statusBadgeHtml(c.status)}${priorityBadgeHtml(c.priority, c.dueDate)}
    <h1 style="font-size:1.5rem; margin:10px 0 6px;">${escapeHtml(c.title)}</h1>
    <div class="detail-meta-row">
      <span>${CATEGORY_LABELS[c.category] || c.category}</span>
      <span>·</span>
      <span>${escapeHtml(c.departmentName || "Unassigned")}</span>
      <span>·</span>
      <span>Reported ${formatDate(c.createdAt)}</span>
    </div>
    <p class="detail-desc">${escapeHtml(c.description)}</p>
  `;
}

function renderMap(c) {
  if (c.latitude == null || c.longitude == null) return;
  const map = L.map("reviewMap", { zoomControl: true, dragging: true, scrollWheelZoom: false }).setView([c.latitude, c.longitude], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
  L.circleMarker([c.latitude, c.longitude], { radius: 9, color: STATUS_COLORS.DONE, fillColor: STATUS_COLORS.DONE, fillOpacity: 0.9, weight: 2 }).addTo(map);
}

function renderMedia(media) {
  const el = document.getElementById("reviewMedia");
  const before = media.filter((m) => m.type === "BEFORE");
  const after = media.filter((m) => m.type === "AFTER");

  let html = `<div class="media-subhead">Before</div>`;
  html += before.length
    ? `<div class="media-gallery">${before.map((m) => `<img src="${m.filePath}" alt="Before"/>`).join("")}</div>`
    : `<div class="locked-note">No before-photos submitted.</div>`;

  html += `<div class="media-subhead">After</div>`;
  html += after.length
    ? `<div class="media-gallery">${after.map((m) => `<img src="${m.filePath}" alt="After"/>`).join("")}</div>`
    : `<div class="locked-note">No after-photos submitted — consider sending this back.</div>`;

  el.innerHTML = html;
}

function actionLabel(action) {
  const labels = {
    CREATED: "Complaint created",
    VERIFIED: "Verified by inspector",
    ASSIGNED: "Assigned to department",
    IN_PROGRESS: "Work started",
    MARKED_DONE_BY_DEPARTMENT: "Marked done by department",
  };
  if (action.startsWith("REJECTED_AFTER_DONE")) {
    return "Sent back for rework — " + action.split(":").slice(1).join(":").trim();
  }
  return labels[action] || action;
}

function renderTimeline(history) {
  const el = document.getElementById("timeline");
  if (!history || history.length === 0) {
    el.innerHTML = `<div class="locked-note">No activity logged yet.</div>`;
    return;
  }
  el.innerHTML = history
    .map(
      (h) => `
      <div class="timeline-item">
        <div class="timeline-dot" style="background:${STATUS_COLORS[h.action] || "#1B4B6B"}"></div>
        <div class="timeline-action">${escapeHtml(actionLabel(h.action))}</div>
        <div class="timeline-time">${formatDate(h.createdAt)}</div>
      </div>
    `
    )
    .join("");
}

function setupActions(id) {
  document.getElementById("approveBtn").addEventListener("click", async () => {
    if (!confirm("Approve this completion? The complaint will be marked Completed.")) return;
    await runAction(() => apiRequest(`/api/complaints/${id}/approve`, { method: "POST" }));
  });

  document.getElementById("sendBackBtn").addEventListener("click", async () => {
    const reason = document.getElementById("sendBackReason").value.trim();
    if (!reason) {
      alert("Add a reason before sending this back.");
      return;
    }
    await runAction(() =>
      apiRequest(`/api/complaints/${id}/reject-after-done?reason=${encodeURIComponent(reason)}`, { method: "POST" })
    );
  });
}

async function runAction(fn) {
  const approveBtn = document.getElementById("approveBtn");
  const sendBackBtn = document.getElementById("sendBackBtn");
  approveBtn.disabled = true;
  sendBackBtn.disabled = true;
  try {
    await fn();
    window.location.href = "authority-approvals.html";
  } catch (err) {
    alert(err.message || "Action failed.");
    approveBtn.disabled = false;
    sendBackBtn.disabled = false;
  }
}

init();

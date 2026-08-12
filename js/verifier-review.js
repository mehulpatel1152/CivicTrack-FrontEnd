requireRole("VERIFIER");

function getComplaintId() {
  return new URLSearchParams(window.location.search).get("id");
}

let currentComplaint = null;

async function init() {
  const id = getComplaintId();
  if (!id) {
    document.getElementById("reviewRoot").innerHTML = `<div class="empty-state">No complaint specified.</div>`;
    return;
  }

  let complaint, media, similar;
  try {
    [complaint, media, similar] = await Promise.all([
      fetchComplaint(id),
      fetchMedia(id),
      apiRequest(`/api/complaints/${id}/similar`).then((r) => r.json()),
    ]);
  } catch (err) {
    document.getElementById("reviewRoot").innerHTML =
      `<div class="empty-state">Couldn't load this complaint. It may already be handled, or the backend isn't reachable.</div>`;
    return;
  }

  currentComplaint = complaint;
  renderHeader(complaint);
  renderMap(complaint);
  renderMedia(media);
  renderDuplicates(complaint, similar);
  setupActions(id);
}

function renderHeader(c) {
  document.getElementById("reviewHeader").innerHTML = `
    ${statusBadgeHtml(c.status)}
    <h1 style="font-size:1.5rem; margin:10px 0 6px;">${escapeHtml(c.title)}</h1>
    <div class="detail-meta-row">
      <span>${CATEGORY_LABELS[c.category] || c.category}</span>
      <span>·</span>
      <span>Reported by ${escapeHtml(c.userEmail)}</span>
      <span>·</span>
      <span>${formatDate(c.createdAt)}</span>
    </div>
    <p class="detail-desc">${escapeHtml(c.description)}</p>
    <p class="location-hint">${escapeHtml(c.area || "")} ${escapeHtml(c.road || "")} ${escapeHtml(c.pincode || "")}</p>
  `;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function renderMap(c) {
  if (c.latitude == null || c.longitude == null) return;
  const map = L.map("reviewMap", { zoomControl: true, dragging: true, scrollWheelZoom: false }).setView([c.latitude, c.longitude], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
  L.circleMarker([c.latitude, c.longitude], { radius: 9, color: STATUS_COLORS.PENDING, fillColor: STATUS_COLORS.PENDING, fillOpacity: 0.9, weight: 2 }).addTo(map);
}

function renderMedia(media) {
  const el = document.getElementById("reviewMedia");
  if (!media || media.length === 0) {
    el.innerHTML = `<div class="locked-note">No photos were submitted with this report.</div>`;
    return;
  }
  el.innerHTML = `<div class="media-gallery">${media.map((m) => `<img src="${m.filePath}" alt="Submitted photo"/>`).join("")}</div>`;
}

function renderDuplicates(complaint, similar) {
  const el = document.getElementById("duplicateList");
  if (!similar || similar.length === 0) {
    el.innerHTML = `<div class="locked-note">No similar complaints found nearby. Likely not a duplicate.</div>`;
    return;
  }
  el.innerHTML = `<div class="duplicate-list">${similar
    .map((c) => {
      const dist = distanceKm(complaint.latitude, complaint.longitude, c.latitude, c.longitude);
      return `
        <a class="duplicate-item" href="verifier-review.html?id=${c.id}" style="text-decoration:none; color:var(--ink);">
          <span>${escapeHtml(c.title)} — ${STATUS_LABELS[c.status]}</span>
          <span class="dist">${dist.toFixed(2)} km away</span>
        </a>
      `;
    })
    .join("")}</div>`;
}

function setupActions(id) {
  document.getElementById("verifyBtn").addEventListener("click", async () => {
    if (!confirm("Verify this complaint? It will move to the assignment stage.")) return;
    await runAction(() => apiRequest(`/api/complaints/${id}/verify`, { method: "POST" }));
  });

  document.getElementById("rejectBtn").addEventListener("click", async () => {
    const reason = document.getElementById("rejectReason").value.trim();
    if (!reason) {
      alert("Add a rejection reason first.");
      return;
    }
    await runAction(() =>
      apiRequest(`/api/complaints/${id}/reject?reason=${encodeURIComponent(reason)}`, { method: "POST" })
    );
  });
}

async function runAction(fn) {
  const verifyBtn = document.getElementById("verifyBtn");
  const rejectBtn = document.getElementById("rejectBtn");
  verifyBtn.disabled = true;
  rejectBtn.disabled = true;
  try {
    await fn();
    window.location.href = "verifier-queue.html";
  } catch (err) {
    alert(err.message || "Action failed.");
    verifyBtn.disabled = false;
    rejectBtn.disabled = false;
  }
}

init();

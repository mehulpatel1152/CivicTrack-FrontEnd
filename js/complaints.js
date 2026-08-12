// Shared across home.html, list.html, my-complaints.html, detail pages.

const STATUS_COLORS = {
  PENDING: "#E8A23D",
  VERIFIED: "#1B4B6B",
  ASSIGNED: "#2E6E97",
  IN_PROGRESS: "#E8A23D",
  DONE: "#7FB88A",
  COMPLETED: "#3E8E5A",
  REJECTED: "#C1462F",
};

const STATUS_LABELS = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

const CATEGORY_LABELS = {
  ROAD: "Road",
  GARBAGE: "Garbage",
  WATER: "Water",
  ELECTRICITY: "Electricity",
  OTHER: "Other",
};

/** Fetch a large page of complaints. Filtering/sorting happens client-side
 *  since the backend doesn't yet expose combined category+status query params. */
async function fetchAllComplaints() {
  const res = await apiRequest("/api/complaints?size=200&page=0");
  const page = await res.json();
  return page.content || [];
}

async function fetchNearbyComplaints(lat, lng, radiusKm) {
  const res = await apiRequest(`/api/complaints/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`);
  return res.json();
}

async function searchComplaints(keyword) {
  const res = await apiRequest(`/api/complaints/search?keyword=${encodeURIComponent(keyword)}&size=200`);
  const page = await res.json();
  return page.content || [];
}

async function fetchUpvoteCount(complaintId) {
  try {
    const res = await apiRequest(`/api/upvotes/${complaintId}`);
    return res.json();
  } catch (_) {
    return 0;
  }
}

/** Haversine distance in km between two points, computed client-side for display. */
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function statusBadgeHtml(status) {
  return `<span class="card-badge" style="background:${STATUS_COLORS[status] || "#6B6F6A"}">${STATUS_LABELS[status] || status}</span>`;
}

const PRIORITY_COLORS = { HIGH: "#C1462F", MEDIUM: "#E8A23D", LOW: "#3E8E5A" };

/** Only complaints that have been verified have a priority — safely returns nothing before that. */
function priorityBadgeHtml(priority, dueDate) {
  if (!priority) return "";
  const overdue = dueDate && new Date(dueDate) < new Date();
  const label = overdue ? "OVERDUE" : priority;
  const color = overdue ? "#C1462F" : PRIORITY_COLORS[priority] || "#6B6F6A";
  return `<span class="card-badge" style="background:${color}; margin-left:6px;">${label}</span>`;
}

/** Overdue complaints that have been flagged by the escalation job. */
function escalatedBadgeHtml(escalated) {
  if (!escalated) return "";
  return `<span class="card-badge" style="background:#8B1E1E; margin-left:6px;">⚠ ESCALATED</span>`;
}

/** Renders one complaint as a card. `distance` is optional (km, number or null). */
function complaintCardHtml(c, distance) {
  const distanceText = distance != null ? `${distance.toFixed(1)} km away` : (c.area || "Location on file");
  return `
    <a class="complaint-card" href="detail.html?id=${c.id}">
      <div class="card-status-strip" style="background:${STATUS_COLORS[c.status] || "#6B6F6A"}"></div>
      <div class="card-body">
        ${statusBadgeHtml(c.status)}${priorityBadgeHtml(c.priority, c.dueDate)}${escalatedBadgeHtml(c.escalated)}
        <div class="card-title">${escapeHtml(c.title)}</div>
        <div class="card-meta">${CATEGORY_LABELS[c.category] || c.category} · ${distanceText}</div>
      </div>
    </a>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

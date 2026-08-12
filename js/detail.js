const ACTION_LABELS = {
  CREATED: "Complaint created",
  VERIFIED: "Verified by inspector",
  REJECTED: "Rejected",
  ASSIGNED: "Assigned to department",
  IN_PROGRESS: "Work started",
  MARKED_DONE_BY_DEPARTMENT: "Marked done by department",
  APPROVED_BY_AUTHORITY: "Approved — issue resolved",
  COMPLETED: "Completed",
};

function actionLabel(action) {
  if (action.startsWith("REJECTED_AFTER_DONE")) {
    return "Sent back for rework — " + action.split(":").slice(1).join(":").trim();
  }
  return ACTION_LABELS[action] || action;
}

function actionColor(action) {
  if (action.includes("REJECT")) return STATUS_COLORS.REJECTED;
  if (action === "CREATED") return STATUS_COLORS.PENDING;
  if (action === "VERIFIED") return STATUS_COLORS.VERIFIED;
  if (action === "ASSIGNED") return STATUS_COLORS.ASSIGNED;
  if (action === "IN_PROGRESS") return STATUS_COLORS.IN_PROGRESS;
  if (action === "COMPLETED" || action === "APPROVED_BY_AUTHORITY") return STATUS_COLORS.COMPLETED;
  if (action === "MARKED_DONE_BY_DEPARTMENT") return STATUS_COLORS.DONE;
  return "#6B6F6A";
}

function getComplaintId() {
  return new URLSearchParams(window.location.search).get("id");
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadDetail() {
  const id = getComplaintId();
  if (!id) {
    document.getElementById("detailRoot").innerHTML = `<div class="empty-state">No complaint specified.</div>`;
    return;
  }

  let complaint, history, media, comments;
  try {
    [complaint, history, media, comments] = await Promise.all([
      fetchComplaint(id),
      fetchHistory(id),
      fetchMedia(id),
      fetchComments(id),
    ]);
  } catch (err) {
    document.getElementById("detailRoot").innerHTML = `<div class="empty-state">Couldn't load this complaint. It may not exist, or the backend isn't reachable.</div>`;
    return;
  }

  renderHeader(complaint);
  renderMap(complaint);
  renderTimeline(history);
  renderMedia(media, complaint.status);
  renderComments(comments);
  setupUpvote(complaint);
  setupCommentForm(id);
}

function renderHeader(c) {
  document.title = c.title + " · CivicTrack";
  document.getElementById("detailHeader").innerHTML = `
    ${statusBadgeHtml(c.status)}${priorityBadgeHtml(c.priority, c.dueDate)}
    <h1>${escapeHtml(c.title)}</h1>
    <div class="detail-meta-row">
      <span>${CATEGORY_LABELS[c.category] || c.category}</span>
      <span>·</span>
      <span>Reported ${formatDate(c.createdAt)}</span>
      <span>·</span>
      <span>${c.departmentName ? "Handled by " + escapeHtml(c.departmentName) : "Not yet assigned"}</span>
    </div>
    <p class="detail-desc">${escapeHtml(c.description)}</p>
  `;
}

function renderMap(c) {
  if (c.latitude == null || c.longitude == null) return;
  const map = L.map("detailMap", { zoomControl: false, dragging: false, scrollWheelZoom: false }).setView(
    [c.latitude, c.longitude],
    15
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  L.circleMarker([c.latitude, c.longitude], {
    radius: 9,
    color: STATUS_COLORS[c.status] || "#1B4B6B",
    fillColor: STATUS_COLORS[c.status] || "#1B4B6B",
    fillOpacity: 0.9,
    weight: 2,
  }).addTo(map);
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
        <div class="timeline-dot" style="background:${actionColor(h.action)}"></div>
        <div class="timeline-action">${escapeHtml(actionLabel(h.action))}</div>
        <div class="timeline-time">${formatDate(h.createdAt)}</div>
      </div>
    `
    )
    .join("");
}

function renderMedia(media, status) {
  const el = document.getElementById("mediaGallery");
  const before = media.filter((m) => m.type === "BEFORE");
  const after = media.filter((m) => m.type === "AFTER");

  let html = "";

  html += `<div class="media-subhead">Before</div>`;
  html += before.length
    ? `<div class="media-gallery">${before.map((m) => `<img src="${m.filePath}" alt="Before photo"/>`).join("")}</div>`
    : `<div class="locked-note">No photos submitted.</div>`;

  html += `<div class="media-subhead">After</div>`;
  if (status !== "COMPLETED") {
    html += `<div class="locked-note">After-photos unlock once this complaint is marked Completed.</div>`;
  } else if (after.length) {
    html += `<div class="media-gallery">${after.map((m) => `<img src="${m.filePath}" alt="After photo"/>`).join("")}</div>`;
  } else {
    html += `<div class="locked-note">No after-photos were uploaded.</div>`;
  }

  el.innerHTML = html;
}

function renderComments(comments) {
  const el = document.getElementById("commentList");
  if (!comments || comments.length === 0) {
    el.innerHTML = `<div class="locked-note">No comments yet. Be the first to add context.</div>`;
    return;
  }
  el.innerHTML = comments
    .map(
      (c) => `
      <div class="comment-item">
        <span class="comment-author">${escapeHtml(c.user ? c.user.name : "Resident")}</span>
        <span class="comment-time">${formatDate(c.createdAt)}</span>
        <div class="comment-content">${escapeHtml(c.content)}</div>
      </div>
    `
    )
    .join("");
}

function setupUpvote(complaint) {
  const btn = document.getElementById("upvoteBtn");
  const countEl = document.getElementById("upvoteCount");
  countEl.textContent = complaint.upvoteCount ?? 0;

  const upvoted = JSON.parse(localStorage.getItem("civictrack_upvoted") || "[]");
  if (upvoted.includes(complaint.id)) {
    btn.classList.add("upvoted");
    btn.disabled = true;
    btn.querySelector(".upvote-label").textContent = "Upvoted";
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await upvoteComplaint(complaint.id);
      countEl.textContent = (parseInt(countEl.textContent, 10) || 0) + 1;
      btn.classList.add("upvoted");
      btn.querySelector(".upvote-label").textContent = "Upvoted";
      const list = JSON.parse(localStorage.getItem("civictrack_upvoted") || "[]");
      list.push(complaint.id);
      localStorage.setItem("civictrack_upvoted", JSON.stringify(list));
    } catch (err) {
      btn.disabled = false;
      alert(err.message || "Couldn't upvote this complaint.");
    }
  });
}

function setupCommentForm(complaintId) {
  const form = document.getElementById("commentForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("commentInput");
    const content = input.value.trim();
    if (!content) return;

    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      await postComment(complaintId, content);
      input.value = "";
      const comments = await fetchComments(complaintId);
      renderComments(comments);
    } catch (err) {
      alert(err.message || "Couldn't post your comment.");
    } finally {
      btn.disabled = false;
    }
  });
}

loadDetail();

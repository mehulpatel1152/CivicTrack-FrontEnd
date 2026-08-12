requireRole("DEPARTMENT");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
let selectedFiles = [];

function getComplaintId() {
  return new URLSearchParams(window.location.search).get("id");
}

async function init() {
  const id = getComplaintId();
  if (!id) {
    document.getElementById("completeRoot").innerHTML = `<div class="empty-state">No complaint specified.</div>`;
    return;
  }

  let complaint, media;
  try {
    [complaint, media] = await Promise.all([fetchComplaint(id), fetchMedia(id)]);
  } catch (err) {
    document.getElementById("completeRoot").innerHTML = `<div class="empty-state">Couldn't load this complaint.</div>`;
    return;
  }

  renderHeader(complaint);
  renderBeforeMedia(media);
  setupDropzone();
  setupSubmit(id);
}

function renderHeader(c) {
  document.getElementById("completeHeader").innerHTML = `
    ${statusBadgeHtml(c.status)}
    <h1 style="font-size:1.5rem; margin:10px 0 6px;">${escapeHtml(c.title)}</h1>
    <p class="detail-desc">${escapeHtml(c.description)}</p>
    <p class="location-hint">${escapeHtml(c.area || "")} ${escapeHtml(c.road || "")} ${escapeHtml(c.pincode || "")}</p>
  `;
}

function renderBeforeMedia(media) {
  const before = media.filter((m) => m.type === "BEFORE");
  const el = document.getElementById("beforeMedia");
  el.innerHTML = before.length
    ? `<div class="media-gallery">${before.map((m) => `<img src="${m.filePath}" alt="Before"/>`).join("")}</div>`
    : `<div class="locked-note">No before-photos were submitted.</div>`;
}

function setupDropzone() {
  const dropzone = document.getElementById("dropzone");
  const input = document.getElementById("fileInput");

  dropzone.addEventListener("click", () => input.click());
  input.addEventListener("change", (e) => handleFiles(e.target.files));

  ["dragover", "dragenter"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); })
  );
  dropzone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
}

function handleFiles(fileList) {
  const errorBox = document.getElementById("photoError");
  errorBox.classList.remove("show");

  for (const file of fileList) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      errorBox.textContent = `${file.name}: unsupported file type.`;
      errorBox.classList.add("show");
      continue;
    }
    if (file.size > MAX_SIZE) {
      errorBox.textContent = `${file.name}: larger than 5MB.`;
      errorBox.classList.add("show");
      continue;
    }
    selectedFiles.push(file);
  }
  renderPreviews();
}

function renderPreviews() {
  const grid = document.getElementById("previewGrid");
  grid.innerHTML = selectedFiles
    .map((file, i) => `
      <div class="photo-preview-item">
        <img src="${URL.createObjectURL(file)}" alt="Preview"/>
        <button type="button" class="photo-remove" data-index="${i}">×</button>
      </div>
    `)
    .join("");

  grid.querySelectorAll(".photo-remove").forEach((btn) =>
    btn.addEventListener("click", () => {
      selectedFiles.splice(parseInt(btn.dataset.index, 10), 1);
      renderPreviews();
    })
  );
}

function setupSubmit(id) {
  document.getElementById("markDoneBtn").addEventListener("click", async () => {
    if (!confirm("Mark this complaint as done? It will be sent to the authority for final approval.")) return;

    const btn = document.getElementById("markDoneBtn");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      await apiRequest(`/api/complaints/${id}/done`, { method: "POST", body: formData, isForm: true });
      window.location.href = "department-queue.html";
    } catch (err) {
      alert(err.message || "Couldn't mark this complaint as done.");
      btn.disabled = false;
      btn.textContent = "Mark done";
    }
  });
}

init();

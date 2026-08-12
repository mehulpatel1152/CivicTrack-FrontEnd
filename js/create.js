const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB, mirrors backend limit

let pickerMap;
let pickerMarker;
let selectedFiles = [];

function initMap() {
  pickerMap = L.map("pickerMap").setView([22.9734, 78.6569], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(pickerMap);

  pickerMap.on("click", (e) => setLocation(e.latlng.lat, e.latlng.lng));
}

function setLocation(lat, lng) {
  document.getElementById("latitude").value = lat;
  document.getElementById("longitude").value = lng;

  const display = document.getElementById("coordDisplay");
  display.textContent = `Location set: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  display.classList.add("set");

  if (pickerMarker) {
    pickerMarker.setLatLng([lat, lng]);
  } else {
    pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(pickerMap);
    pickerMarker.on("dragend", () => {
      const pos = pickerMarker.getLatLng();
      setLocation(pos.lat, pos.lng);
    });
  }
  pickerMap.setView([lat, lng], 15);
  checkDuplicates();
}

function useMyLocationForCreate() {
  const btn = document.getElementById("detectBtn");
  if (!navigator.geolocation) {
    alert("Your browser doesn't support location detection.");
    return;
  }
  btn.textContent = "Locating…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setLocation(pos.coords.latitude, pos.coords.longitude);
      btn.textContent = "Location detected ✓";
    },
    () => {
      alert("Couldn't get your location. You can still click the map to set it manually.");
      btn.textContent = "Use my current location";
    }
  );
}

let duplicateCheckTimer = null;

function scheduleDuplicateCheck() {
  clearTimeout(duplicateCheckTimer);
  duplicateCheckTimer = setTimeout(checkDuplicates, 500);
}

async function checkDuplicates() {
  const title = document.getElementById("title").value.trim();
  const lat = document.getElementById("latitude").value;
  const lng = document.getElementById("longitude").value;
  const box = document.getElementById("duplicateCheck");

  if (!title || title.length < 4 || !lat || !lng) {
    box.style.display = "none";
    return;
  }

  try {
    const res = await apiRequest(
      `/api/complaints/check-duplicates?title=${encodeURIComponent(title)}&lat=${lat}&lng=${lng}`
    );
    const matches = await res.json();
    renderDuplicates(matches);
  } catch (err) {
    console.error("Duplicate check failed:", err.message);
    box.style.display = "none";
  }
}

function renderDuplicates(matches) {
  const box = document.getElementById("duplicateCheck");
  if (!matches || matches.length === 0) {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";
  const lat = parseFloat(document.getElementById("latitude").value);
  const lng = parseFloat(document.getElementById("longitude").value);

  box.innerHTML = `
    <p style="font-weight:600; font-size:0.88rem; margin-bottom:10px;">
      ⚠ Found ${matches.length} similar report${matches.length === 1 ? "" : "s"} nearby — is one of these the same issue?
    </p>
    <div class="duplicate-list">
      ${matches
        .map((m) => {
          const dist = distanceKm(lat, lng, m.latitude, m.longitude);
          return `
        <div class="duplicate-item" style="flex-direction:column; align-items:stretch; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
            <div>
              <div style="font-weight:600;">${escapeHtml(m.title)}</div>
              <div class="dist" style="margin-top:2px;">
                ${statusBadgeHtml(m.status)} · ${CATEGORY_LABELS[m.category] || m.category} · ${dist.toFixed(2)} km away · ${m.upvoteCount || 0} upvote${m.upvoteCount === 1 ? "" : "s"}
              </div>
            </div>
            <a href="detail.html?id=${m.id}" target="_blank" style="font-family:var(--font-mono); font-size:0.7rem; color:var(--civic-blue); white-space:nowrap;">View details ↗</a>
          </div>
          ${m.description ? `<div style="font-size:0.82rem; color:var(--ink-soft);">${escapeHtml(m.description)}</div>` : ""}
          <button type="button" class="btn-assign" data-upvote-id="${m.id}" style="align-self:flex-start; padding:6px 14px;">Upvote instead</button>
        </div>
      `;
        })
        .join("")}
    </div>
    <p style="font-size:0.75rem; color:var(--ink-soft); margin-top:10px;">Not the same issue? Just continue filling out the form below.</p>
  `;

  box.querySelectorAll("[data-upvote-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.upvoteId;
      btn.disabled = true;
      btn.textContent = "Upvoting…";
      try {
        await apiRequest(`/api/complaints/${id}/upvote`, { method: "POST" });
        window.location.href = `detail.html?id=${id}`;
      } catch (err) {
        alert(err.message || "Couldn't upvote this complaint.");
        btn.disabled = false;
        btn.textContent = "Upvote instead";
      }
    });
  });
}

function setupDropzone() {
  const dropzone = document.getElementById("dropzone");
  const input = document.getElementById("fileInput");

  dropzone.addEventListener("click", () => input.click());
  input.addEventListener("change", (e) => handleFiles(e.target.files));

  ["dragover", "dragenter"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
}

function handleFiles(fileList) {
  const errorBox = document.getElementById("photoError");
  errorBox.classList.remove("show");

  for (const file of fileList) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      errorBox.textContent = `${file.name}: unsupported file type. Use JPG, PNG, or WebP.`;
      errorBox.classList.add("show");
      continue;
    }
    if (file.size > MAX_SIZE) {
      errorBox.textContent = `${file.name}: file is larger than 5MB.`;
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
    .map(
      (file, i) => `
      <div class="photo-preview-item">
        <img src="${URL.createObjectURL(file)}" alt="Preview"/>
        <button type="button" class="photo-remove" data-index="${i}">×</button>
      </div>
    `
    )
    .join("");

  grid.querySelectorAll(".photo-remove").forEach((btn) =>
    btn.addEventListener("click", () => {
      selectedFiles.splice(parseInt(btn.dataset.index, 10), 1);
      renderPreviews();
    })
  );
}

function setupForm() {
  const form = document.getElementById("createForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("formError");
    errorBox.classList.remove("show");

    const lat = document.getElementById("latitude").value;
    const lng = document.getElementById("longitude").value;
    if (!lat || !lng) {
      errorBox.textContent = "Set a location on the map before submitting.";
      errorBox.classList.add("show");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    const formData = new FormData();
    formData.append("title", document.getElementById("title").value.trim());
    formData.append("description", document.getElementById("description").value.trim());
    formData.append("category", document.getElementById("category").value);
    formData.append("latitude", lat);
    formData.append("longitude", lng);
    formData.append("area", document.getElementById("area").value.trim());
    formData.append("road", document.getElementById("road").value.trim());
    formData.append("pincode", document.getElementById("pincode").value.trim());
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      const res = await apiRequest("/api/complaints", { method: "POST", body: formData, isForm: true });
      const created = await res.json();
      window.location.href = `detail.html?id=${created.id}`;
    } catch (err) {
      errorBox.textContent = err.message || "Couldn't submit your report. Please try again.";
      errorBox.classList.add("show");
      btn.disabled = false;
      btn.textContent = "Submit report";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

initMap();
setupDropzone();
setupForm();
document.getElementById("detectBtn").addEventListener("click", useMyLocationForCreate);
document.getElementById("title").addEventListener("input", scheduleDuplicateCheck);

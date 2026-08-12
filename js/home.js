let map;
let markerLayer;
let allComplaints = [];
let userLocation = null; // { lat, lng }
let upvoteCache = {};

const DEFAULT_CENTER = [22.9734, 78.6569]; // India centroid
const DEFAULT_ZOOM = 5;

async function init() {
  map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  markerLayer = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
  });
  map.addLayer(markerLayer);

  renderLegend();

  try {
    allComplaints = await fetchAllComplaints();
  } catch (err) {
    document.getElementById("resultCount").textContent = "Couldn't load complaints — check your connection to the backend.";
    return;
  }

  applyFilters();

  document.getElementById("categoryFilter").addEventListener("change", applyFilters);
  document.getElementById("statusFilter").addEventListener("change", applyFilters);
  document.getElementById("sortFilter").addEventListener("change", applyFilters);
  document.getElementById("radiusFilter").addEventListener("input", (e) => {
    document.getElementById("radiusValue").textContent = e.target.value + " km";
    applyFilters();
  });
  document.getElementById("locateBtn").addEventListener("click", useMyLocation);
}

function useMyLocation() {
  const btn = document.getElementById("locateBtn");
  if (!navigator.geolocation) {
    alert("Your browser doesn't support location detection.");
    return;
  }
  btn.textContent = "Locating…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.setView([userLocation.lat, userLocation.lng], 13);
      document.getElementById("radiusGroup").style.display = "block";
      btn.textContent = "Location set ✓";
      applyFilters();
    },
    () => {
      alert("Couldn't get your location. Check browser permissions.");
      btn.textContent = "Use my location";
    }
  );
}

function applyFilters() {
  const category = document.getElementById("categoryFilter").value;
  const status = document.getElementById("statusFilter").value;
  const sort = document.getElementById("sortFilter").value;
  const radius = parseFloat(document.getElementById("radiusFilter").value);

  let results = allComplaints.filter((c) => {
    if (category && c.category !== category) return false;
    if (status && c.status !== status) return false;
    return true;
  });

  results = results.map((c) => {
    const dist = userLocation ? distanceKm(userLocation.lat, userLocation.lng, c.latitude, c.longitude) : null;
    return { ...c, _distance: dist };
  });

  if (userLocation && radius) {
    results = results.filter((c) => c._distance != null && c._distance <= radius);
  }

  if (sort === "nearest" && userLocation) {
    results.sort((a, b) => a._distance - b._distance);
  } else if (sort === "title") {
    results.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === "upvotes") {
    results.sort((a, b) => (upvoteCache[b.id] || 0) - (upvoteCache[a.id] || 0));
  }

  renderResults(results);

  // Fetch upvote counts for the visible slice, then re-sort if needed.
  if (sort === "upvotes") {
    loadUpvotesFor(results.slice(0, 30)).then(() => renderResults(
      [...results].sort((a, b) => (upvoteCache[b.id] || 0) - (upvoteCache[a.id] || 0))
    ));
  }
}

async function loadUpvotesFor(complaints) {
  const missing = complaints.filter((c) => upvoteCache[c.id] === undefined);
  await Promise.all(
    missing.map(async (c) => {
      upvoteCache[c.id] = await fetchUpvoteCount(c.id);
    })
  );
}

function renderResults(results) {
  document.getElementById("resultCount").textContent = `${results.length} complaint${results.length === 1 ? "" : "s"} found`;

  markerLayer.clearLayers();
  results.forEach((c) => {
    if (c.latitude == null || c.longitude == null) return;
    const marker = L.marker([c.latitude, c.longitude], { icon: statusDivIcon(c.status) });
    marker.bindPopup(
      `<strong>${escapeHtml(c.title)}</strong><br/>${STATUS_LABELS[c.status]}<br/><a href="detail.html?id=${c.id}">View details →</a>`
    );
    marker.addTo(markerLayer);
  });

  const drawer = document.getElementById("cardDrawer");
  if (results.length === 0) {
    drawer.innerHTML = `<div class="empty-state">No complaints match your filters yet. Try widening the radius or clearing a filter.</div>`;
    return;
  }
  drawer.innerHTML = results.slice(0, 30).map((c) => complaintCardHtml(c, c._distance)).join("");
}

function statusDivIcon(status) {
  const color = STATUS_COLORS[status] || "#6B6F6A";
  return L.divIcon({
    className: "",
    html: `<div style="width:16px; height:16px; border-radius:50%; background:${color}; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function renderLegend() {
  const items = Object.entries(STATUS_LABELS)
    .map(
      ([status, label]) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${STATUS_COLORS[status]}"></span>${label}
      </div>
    `
    )
    .join("");
  document.getElementById("mapLegend").innerHTML = `<div class="legend-title">Status</div>${items}`;
}

init();

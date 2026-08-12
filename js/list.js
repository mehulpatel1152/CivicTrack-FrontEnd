let allComplaints = [];
let userLocation = null;
let upvoteCache = {};
let searchTimer = null;

async function init() {
  await loadDefault();

  document.getElementById("categoryFilter").addEventListener("change", applyFilters);
  document.getElementById("statusFilter").addEventListener("change", applyFilters);
  document.getElementById("sortFilter").addEventListener("change", applyFilters);
  document.getElementById("radiusFilter").addEventListener("input", (e) => {
    document.getElementById("radiusValue").textContent = e.target.value + " km";
    applyFilters();
  });
  document.getElementById("locateBtn").addEventListener("click", useMyLocation);

  document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const keyword = e.target.value.trim();
    searchTimer = setTimeout(async () => {
      if (keyword) {
        allComplaints = await searchComplaints(keyword);
      } else {
        await loadDefault();
        return;
      }
      applyFilters();
    }, 350);
  });
}

async function loadDefault() {
  try {
    allComplaints = await fetchAllComplaints();
    applyFilters();
  } catch (err) {
    document.getElementById("resultCount").textContent = "Couldn't load complaints — check your connection to the backend.";
  }
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

  if (sort === "upvotes") {
    loadUpvotesFor(results).then(() =>
      renderResults([...results].sort((a, b) => (upvoteCache[b.id] || 0) - (upvoteCache[a.id] || 0)))
    );
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

  const grid = document.getElementById("cardGrid");
  if (results.length === 0) {
    grid.innerHTML = `<div class="empty-state">No complaints match your filters yet.</div>`;
    return;
  }
  grid.innerHTML = results.map((c) => complaintCardHtml(c, c._distance)).join("");
}

init();

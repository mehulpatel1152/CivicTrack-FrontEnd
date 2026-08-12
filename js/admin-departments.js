requireRole("ADMIN");

async function init() {
  await loadDepartments();
  document.getElementById("deptForm").addEventListener("submit", onCreate);
}

async function loadDepartments() {
  try {
    const res = await apiRequest("/api/departments");
    const departments = await res.json();
    render(departments);
  } catch (err) {
    document.getElementById("deptListRoot").innerHTML =
      `<div class="empty-state">Couldn't load departments — check your connection to the backend.</div>`;
  }
}

function render(departments) {
  const el = document.getElementById("deptListRoot");
  if (departments.length === 0) {
    el.innerHTML = `<div class="locked-note">No departments yet. Create one below.</div>`;
    return;
  }
  el.innerHTML = `<div class="dept-list">${departments
    .map((d) => `<div class="dept-item"><span>${escapeHtml(d.name)}</span></div>`)
    .join("")}</div>`;
}

async function onCreate(e) {
  e.preventDefault();
  const input = document.getElementById("deptName");
  const name = input.value.trim();
  if (!name) return;

  const btn = document.getElementById("deptSubmit");
  btn.disabled = true;
  try {
    await apiRequest("/api/departments", { method: "POST", body: { name } });
    input.value = "";
    await loadDepartments();
  } catch (err) {
    alert(err.message || "Couldn't create this department.");
  } finally {
    btn.disabled = false;
  }
}

init();

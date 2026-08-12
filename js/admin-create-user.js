requireRole("ADMIN");

let hasDepartments = false;

async function init() {
  try {
    const res = await apiRequest("/api/departments");
    const departments = await res.json();
    const select = document.getElementById("department");

    if (departments.length === 0) {
      select.innerHTML = `<option value="">No departments yet</option>`;
      hasDepartments = false;
    } else {
      select.innerHTML = departments.map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");
      hasDepartments = true;
    }
  } catch (err) {
    document.getElementById("department").innerHTML = `<option value="">Couldn't load departments</option>`;
    hasDepartments = false;
  }

  document.getElementById("role").addEventListener("change", (e) => {
    const isDept = e.target.value === "DEPARTMENT";
    document.getElementById("departmentField").style.display = isDept ? "block" : "none";
    document.getElementById("noDeptWarning").style.display = isDept && !hasDepartments ? "block" : "none";
  });

  document.getElementById("createUserForm").addEventListener("submit", onSubmit);
}

async function onSubmit(e) {
  e.preventDefault();
  const errorBox = document.getElementById("formError");
  const successBox = document.getElementById("formSuccess");
  errorBox.classList.remove("show");
  successBox.style.display = "none";

  const role = document.getElementById("role").value;

  if (role === "DEPARTMENT" && !hasDepartments) {
    errorBox.textContent = "No departments exist yet. Create one on the Departments page first, then come back.";
    errorBox.classList.add("show");
    return;
  }

  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    role,
  };
  if (role === "DEPARTMENT") {
    payload.departmentId = document.getElementById("department").value;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Creating…";

  try {
    await apiRequest("/api/admin/create-user", { method: "POST", body: payload });
    successBox.textContent = `${payload.name} was created as ${role}.`;
    successBox.style.display = "block";
    document.getElementById("createUserForm").reset();
    document.getElementById("departmentField").style.display = "none";
  } catch (err) {
    errorBox.textContent = err.message || "Couldn't create this user.";
    errorBox.classList.add("show");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create user";
  }
}

init();

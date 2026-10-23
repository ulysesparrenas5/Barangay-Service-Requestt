let myRequests = [];
const message = document.getElementById("message");
const editMessage = document.getElementById("editMessage");
const editModal = new bootstrap.Modal(document.getElementById("editModal"));

// ---------- HELPERS ----------
function showMessage(element, text, type) {
  element.className = "alert alert-" + type;
  element.textContent = text;
}

function clearMessage(element) {
  element.className = "";
  element.textContent = "";
}

// Security: turns user text into safe text so no one can inject HTML/scripts
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function statusBadge(status) {
  const colors = { "Pending": "warning", "In Progress": "info", "Resolved": "success" };
  return '<span class="badge text-bg-' + (colors[status] || "secondary") + '">' + escapeHtml(status) + "</span>";
}

// Validation used for both submit and edit
function validateRequest(title, description) {
  if (title === "" || description === "") return "Please fill in the title and description.";
  if (title.length < 5 || title.length > 100) return "Title must be 5 to 100 characters.";
  if (description.length < 10 || description.length > 1000) return "Description must be 10 to 1000 characters.";
  return null;
}

// ---------- LOAD DASHBOARD ----------
async function loadDashboard() {
  const { data: sessionData } = await db.auth.getSession();
  if (!sessionData.session) {
    window.location.href = "index.html";
    return;
  }

  const user = sessionData.session.user;
  const { data: profile, error } = await db
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (error) {
    showMessage(message, "Could not load your profile. Please refresh the page.", "danger");
    return;
  }

  document.getElementById("userName").textContent = profile.full_name;
  document.getElementById("userRole").textContent = profile.role;

    if (profile.role === "admin") {
    document.getElementById("adminView").classList.remove("d-none");
    loadAdmin();
  } else {
    document.getElementById("residentView").classList.remove("d-none");
    loadRequests();
  }
}

// ---------- READ: show my requests ----------
async function loadRequests() {
  const tbody = document.getElementById("requestsTable");

  const { data, error } = await db
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Could not load requests. Please refresh the page.</td></tr>';
    return;
  }

  myRequests = data;

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">No requests yet. Submit your first one!</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(function (r) {
    const date = new Date(r.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

    const actions = r.status === "Pending"
      ? '<button class="btn btn-sm btn-outline-primary me-1 mb-1" data-action="edit" data-id="' + r.id + '">Edit</button>' +
        '<button class="btn btn-sm btn-outline-danger mb-1" data-action="cancel" data-id="' + r.id + '">Cancel</button>'
      : '<span class="text-secondary small">Locked</span>';

    return "<tr>" +
      "<td><strong>" + escapeHtml(r.title) + "</strong><br><small class='text-secondary'>" + escapeHtml(r.description) + "</small></td>" +
      "<td>" + escapeHtml(r.category) + "</td>" +
      "<td>" + statusBadge(r.status) + "</td>" +
      "<td>" + date + "</td>" +
      "<td>" + actions + "</td>" +
      "</tr>";
  }).join("");
}

// ---------- CREATE: submit a request ----------
document.getElementById("requestForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();

  const problem = validateRequest(title, description);
  if (problem) {
    showMessage(message, problem, "warning");
    return;
  }

  // AI-assisted sorting (keyword level)
  const category = classifyRequest(title + " " + description);

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const { error } = await db.from("requests").insert({ title: title, description: description, category: category });

    if (error) {
      showMessage(message, "Request not saved: " + error.message, "danger");
    } else {
      showMessage(message, "Request submitted! Detected category: " + category, "success");
      event.target.reset();
      loadRequests();
    }
  } catch (err) {
    showMessage(message, "Something went wrong. Please check your internet connection.", "danger");
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Submit Request";
});

// ---------- EDIT and CANCEL buttons in the table ----------
document.getElementById("requestsTable").addEventListener("click", async function (event) {
  const button = event.target.closest("button");
  if (!button) return;

  const id = Number(button.dataset.id);
  const request = myRequests.find(function (r) { return r.id === id; });
  if (!request) return;

  // Open the edit pop-up
  if (button.dataset.action === "edit") {
    document.getElementById("editId").value = request.id;
    document.getElementById("editTitle").value = request.title;
    document.getElementById("editDescription").value = request.description;
    clearMessage(editMessage);
    editModal.show();
  }

  // DELETE: cancel the request
  if (button.dataset.action === "cancel") {
    if (!confirm("Cancel this request? This cannot be undone.")) return;

    try {
      const { data, error } = await db.from("requests").delete().eq("id", id).select();

      if (error || data.length === 0) {
        showMessage(message, "Could not cancel. Only Pending requests can be cancelled.", "danger");
      } else {
        showMessage(message, "Request cancelled.", "success");
        loadRequests();
      }
    } catch (err) {
      showMessage(message, "Something went wrong. Please check your internet connection.", "danger");
    }
  }
});

// ---------- UPDATE: save the edited request ----------
document.getElementById("saveEditBtn").addEventListener("click", async function () {
  const id = Number(document.getElementById("editId").value);
  const title = document.getElementById("editTitle").value.trim();
  const description = document.getElementById("editDescription").value.trim();

  const problem = validateRequest(title, description);
  if (problem) {
    showMessage(editMessage, problem, "warning");
    return;
  }

  const category = classifyRequest(title + " " + description);

  try {
    const { data, error } = await db
      .from("requests")
      .update({ title: title, description: description, category: category })
      .eq("id", id)
      .select();

    if (error || data.length === 0) {
      showMessage(editMessage, "Could not save. Only Pending requests can be edited.", "danger");
    } else {
      editModal.hide();
      showMessage(message, "Request updated! Category: " + category, "success");
      loadRequests();
    }
  } catch (err) {
    showMessage(editMessage, "Something went wrong. Please check your internet connection.", "danger");
  }
});

// ---------- LOGOUT ----------
document.getElementById("logoutBtn").addEventListener("click", async function () {
  await db.auth.signOut();
  window.location.href = "index.html";
});

loadDashboard();
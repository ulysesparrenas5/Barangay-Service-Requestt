let allRequests = [];

// ---------- LOAD ALL REQUESTS (admin only) ----------
async function loadAdmin() {
  try {
    const { data, error } = await db
      .from("requests")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false });

    if (error) {
      showMessage(message, "Could not load requests: " + error.message, "danger");
      return;
    }

    allRequests = data;
    fillCategoryFilter();
    updateSummary();
    renderAdminTable();
  } catch (err) {
    showMessage(message, "Something went wrong. Please check your internet connection.", "danger");
  }
}

// ---------- CATEGORY DROPDOWN ----------
function fillCategoryFilter() {
  const select = document.getElementById("categoryFilter");
  if (select.options.length > 1) return; // already filled

  const categories = Object.keys(CATEGORY_KEYWORDS).concat("Others");
  categories.forEach(function (category) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
}

// ---------- SUMMARY CARDS + AI INSIGHTS ----------
function updateSummary() {
  const total = allRequests.length;
  const countByStatus = function (status) {
    return allRequests.filter(function (r) { return r.status === status; }).length;
  };

  document.getElementById("countTotal").textContent = total;
  document.getElementById("countPending").textContent = countByStatus("Pending");
  document.getElementById("countProgress").textContent = countByStatus("In Progress");
  document.getElementById("countResolved").textContent = countByStatus("Resolved");

  const aiSummary = document.getElementById("aiSummary");
  const categoryBars = document.getElementById("categoryBars");

  if (total === 0) {
    aiSummary.textContent = "No requests yet.";
    categoryBars.innerHTML = "";
    return;
  }

  // Count requests per category
  const counts = {};
  allRequests.forEach(function (r) {
    counts[r.category] = (counts[r.category] || 0) + 1;
  });

  // Sort categories from most to least reported
  const sorted = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; });

  const topCategory = sorted[0][0];
  const topCount = sorted[0][1];
  const percent = Math.round((topCount / total) * 100);
  const stillOpen = allRequests.filter(function (r) {
    return r.category === topCategory && r.status !== "Resolved";
  }).length;

  aiSummary.textContent =
    "Most reported concern: " + topCategory + " (" + topCount + " of " + total + " requests, " + percent + "%). " +
    stillOpen + (stillOpen === 1 ? " of these still needs" : " of these still need") + " action. Consider prioritizing this area.";

  categoryBars.innerHTML = sorted.map(function (item) {
    const width = Math.round((item[1] / total) * 100);
    return '<div class="mb-2">' +
      '<div class="d-flex justify-content-between small"><span>' + escapeHtml(item[0]) + "</span><span>" + item[1] + "</span></div>" +
      '<div class="progress"><div class="progress-bar" style="width: ' + width + '%"></div></div>' +
      "</div>";
  }).join("");
}

// ---------- TABLE WITH SEARCH + FILTERS ----------
function renderAdminTable() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const status = document.getElementById("statusFilter").value;
  const tbody = document.getElementById("adminTable");

  const filtered = allRequests.filter(function (r) {
    const name = r.profiles ? r.profiles.full_name : "";
    const text = (name + " " + r.title + " " + r.description).toLowerCase();
    return text.includes(search) &&
      (category === "" || r.category === category) &&
      (status === "" || r.status === status);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">No matching requests.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function (r) {
    const name = r.profiles ? r.profiles.full_name : "Unknown";
    const date = new Date(r.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

    const statusOptions = ["Pending", "In Progress", "Resolved"].map(function (s) {
      return "<option" + (s === r.status ? " selected" : "") + ">" + s + "</option>";
    }).join("");

    return "<tr>" +
      "<td>" + escapeHtml(name) + "</td>" +
      "<td><strong>" + escapeHtml(r.title) + "</strong><br><small class='text-secondary'>" + escapeHtml(r.description) + "</small></td>" +
      "<td>" + escapeHtml(r.category) + "</td>" +
      '<td><select class="form-select form-select-sm status-select" data-id="' + r.id + '">' + statusOptions + "</select></td>" +
      "<td>" + date + "</td>" +
      '<td><button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="' + r.id + '">Delete</button></td>' +
      "</tr>";
  }).join("");
}

// Search and filters update the table instantly
document.getElementById("searchInput").addEventListener("input", renderAdminTable);
document.getElementById("categoryFilter").addEventListener("change", renderAdminTable);
document.getElementById("statusFilter").addEventListener("change", renderAdminTable);

// ---------- UPDATE STATUS ----------
document.getElementById("adminTable").addEventListener("change", async function (event) {
  if (!event.target.classList.contains("status-select")) return;

  const id = Number(event.target.dataset.id);
  const newStatus = event.target.value;

  try {
    const { data, error } = await db
      .from("requests")
      .update({ status: newStatus })
      .eq("id", id)
      .select();

    if (error || data.length === 0) {
      showMessage(message, "Could not update the status. Please try again.", "danger");
      renderAdminTable(); // put the old value back
      return;
    }

    const request = allRequests.find(function (r) { return r.id === id; });
    request.status = newStatus;
    updateSummary();
    showMessage(message, "Status updated to " + newStatus + ".", "success");
  } catch (err) {
    showMessage(message, "Something went wrong. Please check your internet connection.", "danger");
    renderAdminTable();
  }
});

// ---------- DELETE REQUEST ----------
document.getElementById("adminTable").addEventListener("click", async function (event) {
  const button = event.target.closest("button[data-action='delete']");
  if (!button) return;

  if (!confirm("Delete this request permanently?")) return;

  const id = Number(button.dataset.id);

  try {
    const { data, error } = await db.from("requests").delete().eq("id", id).select();

    if (error || data.length === 0) {
      showMessage(message, "Could not delete the request. Please try again.", "danger");
      return;
    }

    allRequests = allRequests.filter(function (r) { return r.id !== id; });
    updateSummary();
    renderAdminTable();
    showMessage(message, "Request deleted.", "success");
  } catch (err) {
    showMessage(message, "Something went wrong. Please check your internet connection.", "danger");
  }
});
/* Talks to the Cloudflare Worker (admin-worker/) that actually reads and
   writes data/projects.json, data/pricing.json and portfolio screenshots
   in the GitHub repo. This file only handles the admin.html UI — all the
   real logic (auth, GitHub commits, email) lives in the Worker. */

/* Set this to your deployed Worker's URL after `wrangler deploy`
   (e.g. "https://eks-admin.<your-subdomain>.workers.dev"). */
const API_BASE = "https://eks-admin.YOUR-SUBDOMAIN.workers.dev";

var state = { projects: null, pricing: null };

document.addEventListener("DOMContentLoaded", function () {
  wireLoginUi();
  wirePanelUi();
  checkSession();
});

function api(path, options) {
  return fetch(API_BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  }).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    });
  });
}

function showStatus(el, message, isError) {
  el.textContent = message;
  el.className = "admin-status " + (isError ? "is-error" : "is-ok");
}

/* ---------------- Login screen ---------------- */

function wireLoginUi() {
  var requestBtn = document.getElementById("admin-request-code");
  var requestStatus = document.getElementById("admin-request-status");
  var loginForm = document.getElementById("admin-login-form");
  var loginStatus = document.getElementById("admin-login-status");

  requestBtn.addEventListener("click", function () {
    requestBtn.disabled = true;
    api("/api/request-code", { method: "POST" })
      .then(function () {
        showStatus(requestStatus, "Code emailed to you — check your inbox.", false);
      })
      .catch(function (err) {
        showStatus(requestStatus, err.message, true);
      })
      .finally(function () {
        requestBtn.disabled = false;
      });
  });

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var username = document.getElementById("admin-username").value.trim();
    var password = document.getElementById("admin-password").value.trim();
    api("/api/login", { method: "POST", body: JSON.stringify({ username, password }) })
      .then(function () {
        showStatus(loginStatus, "Logged in.", false);
        enterPanel();
      })
      .catch(function (err) {
        showStatus(loginStatus, err.message, true);
      });
  });
}

function checkSession() {
  api("/api/session", { method: "GET" })
    .then(function (data) {
      if (data.ok) enterPanel();
    })
    .catch(function () { /* not logged in — stay on the login screen */ });
}

function enterPanel() {
  document.getElementById("admin-login").hidden = true;
  document.getElementById("admin-panel").hidden = false;
  loadData();
}

/* ---------------- Panel ---------------- */

function wirePanelUi() {
  document.getElementById("admin-logout").addEventListener("click", function () {
    api("/api/logout", { method: "POST" }).finally(function () {
      document.getElementById("admin-panel").hidden = true;
      document.getElementById("admin-login").hidden = false;
    });
  });

  document.getElementById("save-pricing").addEventListener("click", savePricing);
  document.getElementById("add-project-form").addEventListener("submit", addExtraProject);
}

function loadData() {
  api("/api/data", { method: "GET" }).then(function (data) {
    state.projects = data.projects || { items: {}, extra: [] };
    state.pricing = data.pricing || {};
    renderPricing();
    renderProjects();
  });
}

/* ---------------- Pricing ---------------- */

var PLAN_KEYS = ["plan1", "plan2", "plan3", "plan4"];

function renderPricing() {
  var container = document.getElementById("pricing-editor");
  container.innerHTML = "";
  PLAN_KEYS.forEach(function (key) {
    var plan = state.pricing[key] || { name: "", price: "" };
    var div = document.createElement("div");
    div.className = "admin-pricing-plan";
    div.innerHTML =
      "<label>" + key + " name<input type=\"text\" data-plan-key=\"" + key + "\" data-field=\"name\" value=\"" +
      escapeAttr(plan.name) + "\" /></label>" +
      "<label>Price<input type=\"text\" data-plan-key=\"" + key + "\" data-field=\"price\" value=\"" +
      escapeAttr(plan.price) + "\" /></label>";
    container.appendChild(div);
  });
}

function savePricing() {
  var inputs = document.querySelectorAll("#pricing-editor input");
  var next = {};
  inputs.forEach(function (input) {
    var key = input.getAttribute("data-plan-key");
    var field = input.getAttribute("data-field");
    next[key] = next[key] || {};
    next[key][field] = input.value;
  });
  state.pricing = next;

  var status = document.getElementById("pricing-status");
  api("/api/pricing", { method: "POST", body: JSON.stringify(next) })
    .then(function () { showStatus(status, "Saved — live on the site shortly.", false); })
    .catch(function (err) { showStatus(status, err.message, true); });
}

/* ---------------- Existing tiles (01-05) ---------------- */

function renderProjects() {
  var container = document.getElementById("projects-editor");
  container.innerHTML = "";
  Object.keys(state.projects.items || {}).forEach(function (key) {
    container.appendChild(buildProjectRow(key, state.projects.items[key], false));
  });

  var extraContainer = document.getElementById("extra-projects-editor");
  extraContainer.innerHTML = "";
  (state.projects.extra || []).forEach(function (project) {
    extraContainer.appendChild(buildProjectRow(project.key, project, true));
  });
}

function buildProjectRow(key, project, isExtra) {
  var row = document.createElement("div");
  row.className = "admin-project-row";

  var title = isExtra ? project.title + " (" + key + ")" : "Tile " + key;
  var thumbs = (project.images || [])
    .map(function (src, i) {
      return (
        '<div class="admin-thumb"><img src="' + escapeAttr(src) + '" />' +
        '<button type="button" data-remove-image="' + i + '">&times;</button></div>'
      );
    })
    .join("");

  row.innerHTML =
    "<h3>" + escapeHtml(title) + "</h3>" +
    '<div class="admin-thumb-list">' + thumbs + "</div>" +
    '<div class="admin-upload-row">' +
    '<input type="file" accept="image/*" data-upload-input />' +
    '<button type="button" class="btn btn-ghost" data-upload-btn>Upload screenshot</button>' +
    "</div>" +
    (isExtra ? '<button type="button" class="btn btn-ghost" data-remove-project style="margin-top:8px">Remove this tile</button>' : "");

  row.querySelectorAll("[data-remove-image]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var index = Number(btn.getAttribute("data-remove-image"));
      project.images.splice(index, 1);
      persistProjects();
    });
  });

  var fileInput = row.querySelector("[data-upload-input]");
  row.querySelector("[data-upload-btn]").addEventListener("click", function () {
    var file = fileInput.files[0];
    if (!file) return;
    fileToBase64(file).then(function (base64) {
      return api("/api/upload", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, contentBase64: base64 }),
      });
    }).then(function (result) {
      project.images = project.images || [];
      project.images.push(result.path);
      persistProjects();
    }).catch(function (err) {
      alert(err.message);
    });
  });

  if (isExtra) {
    row.querySelector("[data-remove-project]").addEventListener("click", function () {
      state.projects.extra = state.projects.extra.filter(function (p) { return p.key !== key; });
      persistProjects();
    });
  }

  return row;
}

function addExtraProject(e) {
  e.preventDefault();
  var project = {
    key: "custom-" + Date.now(),
    category: document.getElementById("new-category").value.trim(),
    title: document.getElementById("new-title").value.trim(),
    goal: document.getElementById("new-goal").value.trim(),
    tags: document.getElementById("new-tags").value.split(",").map(function (t) { return t.trim(); }).filter(Boolean),
    budget: document.getElementById("new-budget").value.trim(),
    images: [],
  };
  state.projects.extra = state.projects.extra || [];
  state.projects.extra.push(project);
  persistProjects();
  e.target.reset();
}

function persistProjects() {
  renderProjects();
  api("/api/projects", { method: "POST", body: JSON.stringify(state.projects) }).catch(function (err) {
    alert("Failed to save: " + err.message);
  });
}

/* ---------------- Small helpers ---------------- */

function fileToBase64(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      resolve(String(reader.result).split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

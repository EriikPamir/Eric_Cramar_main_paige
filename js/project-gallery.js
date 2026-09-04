/* Powers the "View Project" lightbox (fed by data/projects.json) and
   appends any admin-added portfolio tiles to the Work section. The JSON
   file is edited by the admin panel (js/admin.js) through the Cloudflare
   Worker, which commits it back into this repo — this script just reads
   whatever is currently published. */
document.addEventListener("DOMContentLoaded", function () {
  var modal = document.querySelector("[data-gallery-modal]");
  if (!modal) return;

  var imageEl = modal.querySelector("[data-gallery-image]");
  var emptyEl = modal.querySelector("[data-gallery-empty]");
  var counterEl = modal.querySelector("[data-gallery-counter]");
  var prevBtn = modal.querySelector("[data-gallery-prev]");
  var nextBtn = modal.querySelector("[data-gallery-next]");

  var currentImages = [];
  var currentIndex = 0;
  var projectsDataPromise = null;

  function render() {
    var hasImages = currentImages.length > 0;
    imageEl.hidden = !hasImages;
    emptyEl.hidden = hasImages;
    var hasMultiple = hasImages && currentImages.length > 1;
    prevBtn.hidden = !hasMultiple;
    nextBtn.hidden = !hasMultiple;
    counterEl.hidden = !hasMultiple;
    if (hasImages) {
      imageEl.src = currentImages[currentIndex];
      counterEl.textContent = (currentIndex + 1) + " / " + currentImages.length;
    }
  }

  function open(images) {
    currentImages = images || [];
    currentIndex = 0;
    render();
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function close() {
    modal.hidden = true;
    document.body.style.overflow = "";
    imageEl.src = "";
  }

  function step(delta) {
    if (!currentImages.length) return;
    currentIndex = (currentIndex + delta + currentImages.length) % currentImages.length;
    render();
  }

  modal.querySelectorAll("[data-gallery-close]").forEach(function (el) {
    el.addEventListener("click", close);
  });
  prevBtn.addEventListener("click", function () { step(-1); });
  nextBtn.addEventListener("click", function () { step(1); });

  document.addEventListener("keydown", function (e) {
    if (modal.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  function loadProjectsData() {
    if (!projectsDataPromise) {
      projectsDataPromise = fetch("data/projects.json", { cache: "no-store" })
        .then(function (res) { return res.ok ? res.json() : { items: {}, extra: [] }; })
        .catch(function () { return { items: {}, extra: [] }; });
    }
    return projectsDataPromise;
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-project-key]");
    if (!btn) return;
    e.preventDefault();
    var key = btn.getAttribute("data-project-key");
    loadProjectsData().then(function (data) {
      var entry = (data.items && data.items[key]) ||
        (data.extra || []).filter(function (p) { return p.key === key; })[0];
      open(entry && entry.images ? entry.images : []);
    });
  });

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function buildTile(project, position) {
    var article = document.createElement("article");
    article.className = "work-tile" + (position % 2 === 0 ? " section-alt" : "");
    var indexLabel = position < 10 ? "0" + position : String(position);
    var firstImage = project.images && project.images[0];
    var tags = (project.tags || [])
      .map(function (t) { return '<span class="chip">' + escapeHtml(t) + "</span>"; })
      .join("");

    article.innerHTML =
      '<div class="container work-tile__grid">' +
        '<div class="work-tile__visual" style="background:var(--color-bg-alt)">' +
          (firstImage
            ? '<img src="' + escapeHtml(firstImage) + '" alt="" style="width:100%;height:100%;object-fit:cover" />'
            : "") +
        "</div>" +
        '<div class="work-tile__body">' +
          '<span class="work-tile__index">' + indexLabel + "</span>" +
          '<span class="work-tile__category">' + escapeHtml(project.category) + "</span>" +
          "<h3>" + escapeHtml(project.title) + "</h3>" +
          '<p class="lead">' + escapeHtml(project.goal) + "</p>" +
          '<div class="work-tile__tags">' + tags + "</div>" +
          '<div class="work-tile__budget">' + escapeHtml(project.budget) + "</div>" +
          '<button class="btn btn-ghost" data-project-key="' + escapeHtml(project.key) + '">View Project</button>' +
        "</div>" +
      "</div>";

    return article;
  }

  var workSection = document.querySelector("#work");
  if (workSection) {
    loadProjectsData().then(function (data) {
      var extra = data.extra || [];
      extra.forEach(function (project, i) {
        workSection.appendChild(buildTile(project, 6 + i));
      });
    });
  }
});

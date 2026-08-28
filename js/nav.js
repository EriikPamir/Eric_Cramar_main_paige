/* Sticky nav border-on-scroll, mobile menu toggle, and active-link
   highlighting as the visitor scrolls past each section. */
document.addEventListener("DOMContentLoaded", function () {
  var nav = document.querySelector("[data-nav]");
  if (!nav) return;

  var burger = nav.querySelector("[data-nav-burger]");
  var links = Array.prototype.slice.call(nav.querySelectorAll(".nav__links a[href^='#']"));

  window.addEventListener(
    "scroll",
    function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 8);
    },
    { passive: true }
  );

  if (burger) {
    burger.addEventListener("click", function () {
      nav.classList.toggle("is-open");
    });

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
      });
    });
  }

  var sections = links
    .map(function (link) {
      var id = link.getAttribute("href").slice(1);
      return document.getElementById(id);
    })
    .filter(Boolean);

  if (!sections.length || !("IntersectionObserver" in window)) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
});

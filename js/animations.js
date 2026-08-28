/* Scroll-driven reveals + the hero's scroll-scrubbed mark transform.
   Everything here degrades to "just visible, no motion" if the browser
   lacks IntersectionObserver or the visitor prefers reduced motion. */
document.addEventListener("DOMContentLoaded", function () {
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Fade/rise reveals ---- */
  var revealEls = document.querySelectorAll("[data-reveal], [data-reveal-child]");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });

    /* Stagger groups: children get an increasing --delay */
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      var children = group.querySelectorAll("[data-reveal-child]");
      children.forEach(function (child, i) {
        child.style.setProperty("--delay", i * 80 + "ms");
      });
    });
  }

  /* ---- Hero scroll-scrub: object transforms as the hero scrolls past ---- */
  var stage = document.querySelector("[data-hero-stage]");
  if (stage && !prefersReducedMotion) {
    var ticking = false;

    function updateProgress() {
      var rect = stage.getBoundingClientRect();
      var viewportH = window.innerHeight;
      /* progress 0 -> hero top at viewport top, 1 -> hero scrolled fully past */
      var progress = 1 - Math.min(Math.max(rect.top / viewportH, 0), 1);
      stage.style.setProperty("--scroll-progress", progress.toFixed(3));
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(updateProgress);
          ticking = true;
        }
      },
      { passive: true }
    );

    updateProgress();
  }

  /* ---- Process stepper: fill the connecting line as it scrolls into view ---- */
  var track = document.querySelector("[data-process-track]");
  if (track) {
    var fill = track.querySelector(".process-track__fill");
    var steps = Array.prototype.slice.call(track.querySelectorAll(".process-step"));

    if (fill && steps.length && "IntersectionObserver" in window) {
      var stepObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var index = steps.indexOf(entry.target);
            entry.target.classList.add("is-active");
            var pct = (index / (steps.length - 1)) * 100;
            fill.style.width = pct + "%";
          });
        },
        { threshold: 0.6 }
      );
      steps.forEach(function (step) {
        stepObserver.observe(step);
      });
    }
  }
});

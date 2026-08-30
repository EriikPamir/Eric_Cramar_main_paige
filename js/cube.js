/* Cursor-tracking 3D cube (Luxury / 3D Product work tile). Pure CSS 3D
   transforms — no model, image or video asset. The cube tilts toward
   the pointer anywhere on the page, on top of a fixed 3/4 resting
   angle, and eases back to that resting pose when the pointer is far
   away or absent (e.g. touch devices). */
var CUBE_MAX_TILT = 22; /* degrees added on top of the resting angle */
var CUBE_SENSITIVITY = 0.035; /* how much cursor distance affects tilt */
var CUBE_EASE = 0.08; /* how quickly the cube catches up each frame */
var CUBE_REST_X = -18;
var CUBE_REST_Y = 28;

document.addEventListener("DOMContentLoaded", function () {
  var stage = document.querySelector("[data-cursor-cube]");
  if (!stage) return;

  var cube = stage.querySelector(".cube");
  if (!cube) return;

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return; /* keep the static resting pose from CSS */

  var targetX = CUBE_REST_X;
  var targetY = CUBE_REST_Y;
  var currentX = CUBE_REST_X;
  var currentY = CUBE_REST_Y;
  var visible = false;
  var rafId = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateTarget(clientX, clientY) {
    var rect = cube.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = clientX - cx;
    var dy = clientY - cy;
    targetY = CUBE_REST_Y + clamp(dx * CUBE_SENSITIVITY, -CUBE_MAX_TILT, CUBE_MAX_TILT);
    targetX = CUBE_REST_X + clamp(-dy * CUBE_SENSITIVITY, -CUBE_MAX_TILT, CUBE_MAX_TILT);
  }

  /* The loop's lifetime is tied purely to on-screen visibility (via the
     IntersectionObserver below) so it never runs forever in the
     background — pointermove only ever updates the target angle. */
  function tick() {
    if (!visible) {
      rafId = null;
      return;
    }
    currentX += (targetX - currentX) * CUBE_EASE;
    currentY += (targetY - currentY) * CUBE_EASE;
    cube.style.transform = "rotateX(" + currentX.toFixed(2) + "deg) rotateY(" + currentY.toFixed(2) + "deg)";
    rafId = window.requestAnimationFrame(tick);
  }

  window.addEventListener(
    "pointermove",
    function (e) {
      updateTarget(e.clientX, e.clientY);
    },
    { passive: true }
  );

  window.addEventListener("pointerleave", function () {
    targetX = CUBE_REST_X;
    targetY = CUBE_REST_Y;
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible = entry.isIntersecting;
          if (visible && !rafId) rafId = window.requestAnimationFrame(tick);
        });
      },
      { threshold: 0.1 }
    ).observe(stage);
  } else {
    visible = true;
    rafId = window.requestAnimationFrame(tick);
  }
});

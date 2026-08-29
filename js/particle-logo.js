/* Studio logo rendered as an interactive particle field — a vanilla-JS/
   Canvas take on the "Particle Text" effect (react-bits), built from
   the studio mark instead of literal text. Particles assemble into the
   logo's shape and scatter away from the cursor, then ease back into
   place. Works on every [data-particle-logo] element on the page.

   Tune the feel here: */
var PARTICLE_GRID = 100; /* sampling resolution — higher = crisper shape, more particles */
var PARTICLE_STEP = 2; /* keep 1 in every N sampled points — higher = sparser */
var PARTICLE_EASE = 0.06; /* how eagerly particles return to their target position */
var PARTICLE_REPEL_STRENGTH = 3.2;

/* Shimmer: particles cycle between these two colors in a traveling wave
   rather than a flat fill. Edit the hex values to change the palette. */
var SHIMMER_FROM = [10, 124, 255]; /* blue */
var SHIMMER_TO = [255, 59, 48]; /* red */
var SHIMMER_SPEED = 0.02; /* how fast the wave animates */
var SHIMMER_WAVE_SCALE = 0.012; /* how much the wave shifts across the shape (smaller = broader bands) */

var SHIMMER_STEPS = 64;
var SHIMMER_PALETTE = (function () {
  var palette = [];
  for (var i = 0; i < SHIMMER_STEPS; i++) {
    var t = i / (SHIMMER_STEPS - 1);
    var r = Math.round(SHIMMER_FROM[0] + (SHIMMER_TO[0] - SHIMMER_FROM[0]) * t);
    var g = Math.round(SHIMMER_FROM[1] + (SHIMMER_TO[1] - SHIMMER_FROM[1]) * t);
    var b = Math.round(SHIMMER_FROM[2] + (SHIMMER_TO[2] - SHIMMER_FROM[2]) * t);
    palette.push("rgb(" + r + "," + g + "," + b + ")");
  }
  return palette;
})();

document.addEventListener("DOMContentLoaded", function () {
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !window.requestAnimationFrame) return; /* plain <img>s stay visible */

  document.querySelectorAll("[data-particle-logo]").forEach(setUpParticleLogo);
});

function setUpParticleLogo(wrap) {
  var img = wrap.querySelector("[data-particle-source]");
  var canvas = wrap.querySelector("[data-particle-canvas]");
  if (!img || !canvas) return;

  var ctx = canvas.getContext("2d");
  var particles = [];
  var mouse = { x: -9999, y: -9999, active: false };
  var running = false;
  var rafId = null;

  function sampleParticles(width, height) {
    var off = document.createElement("canvas");
    off.width = PARTICLE_GRID;
    off.height = PARTICLE_GRID;
    var octx = off.getContext("2d");

    var iw = img.naturalWidth || 1;
    var ih = img.naturalHeight || 1;
    var scale = Math.min(PARTICLE_GRID / iw, PARTICLE_GRID / ih);
    var dw = iw * scale;
    var dh = ih * scale;
    octx.drawImage(img, (PARTICLE_GRID - dw) / 2, (PARTICLE_GRID - dh) / 2, dw, dh);

    var data;
    try {
      data = octx.getImageData(0, 0, PARTICLE_GRID, PARTICLE_GRID).data;
    } catch (e) {
      return false; /* e.g. opened straight from disk — canvas pixel reads got blocked */
    }

    var next = [];
    for (var y = 0; y < PARTICLE_GRID; y += PARTICLE_STEP) {
      for (var x = 0; x < PARTICLE_GRID; x += PARTICLE_STEP) {
        var alpha = data[(y * PARTICLE_GRID + x) * 4 + 3];
        if (alpha <= 90) continue;

        var tx = (x / PARTICLE_GRID) * width;
        var ty = (y / PARTICLE_GRID) * height;
        var existing = particles[next.length];
        next.push({
          tx: tx,
          ty: ty,
          x: existing ? existing.x : width / 2 + (Math.random() - 0.5) * width * 1.6,
          y: existing ? existing.y : height / 2 + (Math.random() - 0.5) * height * 1.6,
          vx: existing ? existing.vx : 0,
          vy: existing ? existing.vy : 0,
          r: existing ? existing.r : Math.random() * 1.1 + 0.5,
        });
      }
    }

    particles = next;
    return particles.length > 0;
  }

  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = wrap.clientWidth;
    var height = wrap.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: width, height: height };
  }

  var shimmerFrame = 0;

  function tick() {
    if (!running) return;
    var width = wrap.clientWidth;
    var height = wrap.clientHeight;
    ctx.clearRect(0, 0, width, height);

    shimmerFrame++;
    var wave = shimmerFrame * SHIMMER_SPEED;
    var repelRadius = Math.max(width, height) * 0.22;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.vx += (p.tx - p.x) * PARTICLE_EASE;
      p.vy += (p.ty - p.y) * PARTICLE_EASE;

      var isNearCursor = false;
      if (mouse.active) {
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < repelRadius) {
          isNearCursor = true;
          var force = (repelRadius - dist) / repelRadius;
          p.vx += (dx / (dist || 1)) * force * PARTICLE_REPEL_STRENGTH;
          p.vy += (dy / (dist || 1)) * force * PARTICLE_REPEL_STRENGTH;
        }
      }

      p.vx *= 0.86;
      p.vy *= 0.86;
      p.x += p.vx;
      p.y += p.vy;

      /* Blue<->red traveling shimmer: a sine wave over each particle's
         target position, so color flows across the shape rather than
         blinking in unison. Particles near the cursor flash white. */
      var t = (Math.sin((p.tx + p.ty) * SHIMMER_WAVE_SCALE + wave) + 1) / 2;
      var paletteIndex = Math.round(t * (SHIMMER_PALETTE.length - 1));

      ctx.beginPath();
      ctx.arc(p.x, p.y, isNearCursor ? p.r * 1.6 : p.r, 0, Math.PI * 2);
      ctx.fillStyle = isNearCursor ? "#ffffff" : SHIMMER_PALETTE[paletteIndex];
      ctx.fill();
    }

    rafId = window.requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = window.requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (rafId) window.cancelAnimationFrame(rafId);
  }

  function init() {
    var size = resizeCanvas();
    if (!sampleParticles(size.width, size.height)) return; /* keep the static <img> on failure */
    img.style.visibility = "hidden";
    canvas.style.display = "block";
    start();
  }

  if (img.complete && img.naturalWidth) {
    init();
  } else {
    img.addEventListener("load", init);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    if (canvas.style.display !== "block") return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var size = resizeCanvas();
      sampleParticles(size.width, size.height);
    }, 150);
  });

  wrap.addEventListener("pointermove", function (e) {
    var rect = wrap.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });
  wrap.addEventListener("pointerleave", function () {
    mouse.active = false;
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start();
          else stop();
        });
      },
      { threshold: 0.05 }
    ).observe(wrap);
  }
}

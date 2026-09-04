/* Studio logo rendered as an interactive, glowing particle field —
   circles of varied color and size, softly glowing, sampled from the
   logo image. Works on every [data-particle-logo] element (hero +
   about). Behavior:
     - At rest: each particle wanders gently around its home position
       (a small orbit, not a straight line), staying inside the logo's
       own silhouette since the wander distance is kept smaller than
       the gap between neighboring particles.
     - Cursor nearby: particles are pushed outward, scattering well
       past the logo's edge.
     - Scrolling the element past the viewport: an additional outward
       force scales up with how far it's scrolled, so the mark blows
       apart as you scroll through it.
     - Cursor leaves and scroll returns to 0: both forces drop away and
       the constant spring back to the home position reassembles the
       shape smoothly.

   Tune the feel here: */
var PARTICLE_GRID = 100; /* sampling resolution — higher = crisper shape, more particles */
var PARTICLE_STEP = 3; /* keep 1 in every N sampled points — higher = fewer, chunkier particles */
var PARTICLE_EASE = 0.06; /* how eagerly a particle springs back toward its (wandering) home */
var PARTICLE_DAMPING = 0.86; /* velocity decay per frame — higher = floatier */

var PARTICLE_IDLE_AMPLITUDE = 4; /* px of random wander at rest — keep well under the particle spacing */
var PARTICLE_IDLE_SPEED = 0.6;

var PARTICLE_REPEL_RADIUS_RATIO = 1.15; /* fraction of max(width,height) the cursor affects — large so hovering anywhere near the mark reaches every particle */
var PARTICLE_REPEL_STRENGTH = 17; /* how hard the cursor scatters nearby particles */

var PARTICLE_SCROLL_STRENGTH = 30; /* how hard scrolling the mark out of view blows it apart */

/* Each particle picks one of these at random. Edit to change the palette. */
var PARTICLE_COLORS = ["#0a7cff", "#22d3ee", "#8b5cf6", "#f472b6", "#ffffff"];

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
  var scrollFactor = 0;
  var running = false;
  var rafId = null;

  function randomColor() {
    return PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
  }

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
          r: existing ? existing.r : Math.random() * 2.6 + 1.1,
          color: existing ? existing.color : randomColor(),
          phase: existing ? existing.phase : Math.random() * Math.PI * 2,
          idleAmp: existing ? existing.idleAmp : PARTICLE_IDLE_AMPLITUDE * (0.5 + Math.random() * 0.9),
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

  /* 0 while the mark sits at its normal resting spot in the viewport,
     rising to 1 as it scrolls up and out of view — same idea as the
     hero's --scroll-progress, computed independently per instance so
     the About-page mark doesn't inherit the hero's scroll state. */
  function updateScrollFactor() {
    var rect = wrap.getBoundingClientRect();
    var next = -rect.top / (rect.height || 1);
    scrollFactor = Math.min(Math.max(next, 0), 1);
  }

  function tick(now) {
    if (!running) return;
    var width = wrap.clientWidth;
    var height = wrap.clientHeight;
    ctx.clearRect(0, 0, width, height);

    var t = now * 0.001;
    var repelRadius = Math.max(width, height) * PARTICLE_REPEL_RADIUS_RATIO;
    var cx = width / 2;
    var cy = height / 2;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      /* Home position wanders in a small orbit instead of sitting dead
         still, but the orbit radius (idleAmp) is kept smaller than the
         gap between sampled points, so it never visibly leaves the shape. */
      var homeX = p.tx + Math.sin(t * PARTICLE_IDLE_SPEED + p.phase) * p.idleAmp;
      var homeY = p.ty + Math.cos(t * PARTICLE_IDLE_SPEED * 0.85 + p.phase) * p.idleAmp;
      p.vx += (homeX - p.x) * PARTICLE_EASE;
      p.vy += (homeY - p.y) * PARTICLE_EASE;

      if (mouse.active) {
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < repelRadius) {
          var force = (repelRadius - dist) / repelRadius;
          p.vx += (dx / (dist || 1)) * force * PARTICLE_REPEL_STRENGTH;
          p.vy += (dy / (dist || 1)) * force * PARTICLE_REPEL_STRENGTH;
        }
      }

      if (scrollFactor > 0) {
        var sdx = p.tx - cx;
        var sdy = p.ty - cy;
        var sdist = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
        p.vx += (sdx / sdist) * scrollFactor * PARTICLE_SCROLL_STRENGTH;
        p.vy += (sdy / sdist) * scrollFactor * PARTICLE_SCROLL_STRENGTH;
      }

      p.vx *= PARTICLE_DAMPING;
      p.vy *= PARTICLE_DAMPING;
      p.x += p.vx;
      p.y += p.vy;

      ctx.save();
      ctx.shadowBlur = 5 + p.r * 3;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
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
    updateScrollFactor();
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

  window.addEventListener("scroll", updateScrollFactor, { passive: true });

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

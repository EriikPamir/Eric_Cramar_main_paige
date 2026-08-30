/* Animated node network for the AI / Technology work tile — nodes
   drift gently and shimmer between two colors in a traveling wave,
   with the connecting lines gradient-blended between whatever colors
   their two endpoints currently are. Pure canvas, no external asset.
   Replaces the earlier static SVG. */
var NODE_COLOR_FROM = [10, 124, 255]; /* blue */
var NODE_COLOR_TO = [34, 211, 238]; /* cyan */
var NODE_SHIMMER_SPEED = 0.6; /* how fast the color wave travels */
var NODE_SHIMMER_SCALE = 0.01; /* how much position affects the wave (smaller = broader bands) */
var NODE_DRIFT_SPEED = 0.4; /* how fast nodes drift */
var NODE_DRIFT_AMPLITUDE = 14; /* px */

var NODE_COLOR_STEPS = 48;
var NODE_COLOR_PALETTE = (function () {
  var palette = [];
  for (var i = 0; i < NODE_COLOR_STEPS; i++) {
    var t = i / (NODE_COLOR_STEPS - 1);
    palette.push([
      Math.round(NODE_COLOR_FROM[0] + (NODE_COLOR_TO[0] - NODE_COLOR_FROM[0]) * t),
      Math.round(NODE_COLOR_FROM[1] + (NODE_COLOR_TO[1] - NODE_COLOR_FROM[1]) * t),
      Math.round(NODE_COLOR_FROM[2] + (NODE_COLOR_TO[2] - NODE_COLOR_FROM[2]) * t),
    ]);
  }
  return palette;
})();

function nodeNetworkColor(t, alpha) {
  var index = Math.round(Math.max(0, Math.min(1, t)) * (NODE_COLOR_PALETTE.length - 1));
  var c = NODE_COLOR_PALETTE[index];
  return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")";
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-node-network]").forEach(setUpNodeNetwork);
});

function setUpNodeNetwork(canvas) {
  var ctx = canvas.getContext("2d");
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Layout in normalized 0-1 space (matches the original 400x300 SVG)
     so it scales cleanly to any container size. */
  var edges = [
    [0, 2],
    [2, 1],
    [2, 3],
    [2, 4],
    [0, 3],
  ];
  var nodes = [
    { bx: 90 / 400, by: 90 / 300, phase: 0, radius: 4.5 },
    { bx: 310 / 400, by: 90 / 300, phase: 1.7, radius: 4.5 },
    { bx: 200 / 400, by: 150 / 300, phase: 3.4, radius: 6 },
    { bx: 140 / 400, by: 230 / 300, phase: 5.1, radius: 4.5 },
    { bx: 260 / 400, by: 230 / 300, phase: 6.8, radius: 4.5 },
  ];

  var visible = false;
  var rafId = null;
  var width = 0;
  var height = 0;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function computePositions(t) {
    return nodes.map(function (n) {
      var driftX = prefersReducedMotion ? 0 : Math.sin(t * NODE_DRIFT_SPEED + n.phase) * NODE_DRIFT_AMPLITUDE;
      var driftY = prefersReducedMotion ? 0 : Math.cos(t * NODE_DRIFT_SPEED * 0.8 + n.phase) * NODE_DRIFT_AMPLITUDE;
      var x = n.bx * width + driftX;
      var y = n.by * height + driftY;
      var colorT = (Math.sin((x + y) * NODE_SHIMMER_SCALE + t * NODE_SHIMMER_SPEED) + 1) / 2;
      return { x: x, y: y, colorT: colorT, radius: n.radius };
    });
  }

  function drawFrame(now) {
    var t = now * 0.001;
    ctx.clearRect(0, 0, width, height);

    var positions = computePositions(t);

    edges.forEach(function (edge) {
      var a = positions[edge[0]];
      var b = positions[edge[1]];
      var gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      gradient.addColorStop(0, nodeNetworkColor(a.colorT, 0.55));
      gradient.addColorStop(1, nodeNetworkColor(b.colorT, 0.55));
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    positions.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = nodeNetworkColor(p.colorT, 1);
      ctx.fill();
    });

    if (visible && !prefersReducedMotion) {
      rafId = window.requestAnimationFrame(drawFrame);
    } else {
      rafId = null;
    }
  }

  resize();
  drawFrame(0);

  window.addEventListener("resize", function () {
    resize();
    drawFrame(performance.now());
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible = entry.isIntersecting;
          if (visible && !rafId && !prefersReducedMotion) {
            rafId = window.requestAnimationFrame(drawFrame);
          }
        });
      },
      { threshold: 0.1 }
    ).observe(canvas);
  } else if (!prefersReducedMotion) {
    visible = true;
    rafId = window.requestAnimationFrame(drawFrame);
  }
}

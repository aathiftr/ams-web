import createGlobe from "./vendor/cobe/index.esm.js";

(function () {
  "use strict";

  var section = document.getElementById("destinations");
  var layer = section && section.querySelector(".de-globe");
  var canvas = layer && layer.querySelector("canvas");
  var labelsHost = layer && layer.querySelector(".de-globe-labels");
  if (!section || !layer || !canvas || !labelsHost || typeof createGlobe !== "function") return;

  var INITIAL_PHI = 3.35;
  var THETA = 0.22;
  var GLOBE_RADIUS = 0.8;
  var ELEVATION = 0.02;
  var ROTATION_PER_MS = 0.000074;
  var MAX_FRAME_DELTA = 64;
  var SVG_NS = "http://www.w3.org/2000/svg";

  // Approximate city-centre WGS84 reference points; decorative only.
  var MARKERS = {
    domestic: [
      { name: "Chennai", location: [13.0827, 80.2707], size: 0.035 },
      { name: "Rameswaram", location: [9.2876, 79.3129], size: 0.035 },
      { name: "Mumbai", location: [19.0760, 72.8777], size: 0.035 },
      { name: "Delhi", location: [28.6139, 77.2090], size: 0.035 },
      { name: "Bengaluru", location: [12.9716, 77.5946], size: 0.035 },
      { name: "Kolkata", location: [22.5726, 88.3639], size: 0.035 }
    ],
    international: [
      { name: "Dubai", location: [25.2048, 55.2708], size: 0.035 },
      { name: "Singapore", location: [1.3521, 103.8198], size: 0.035 },
      { name: "Kuala Lumpur", location: [3.1390, 101.6869], size: 0.035 },
      { name: "London", location: [51.5074, -0.1278], size: 0.035 },
      { name: "Tokyo", location: [35.6762, 139.6503], size: 0.035 },
      { name: "Sydney", location: [-33.8688, 151.2093], size: 0.035 }
    ]
  };

  // Decorative connections between real coordinates; no route or timing claim.
  var ARCS = {
    domestic: [
      { id: "delhi-mumbai", from: [28.6139, 77.2090], to: [19.0760, 72.8777] },
      { id: "chennai-rameswaram", from: [13.0827, 80.2707], to: [9.2876, 79.3129] }
    ],
    international: [
      { id: "london-dubai", from: [51.5074, -0.1278], to: [25.2048, 55.2708] },
      { id: "dubai-singapore", from: [25.2048, 55.2708], to: [1.3521, 103.8198] },
      { id: "singapore-sydney", from: [1.3521, 103.8198], to: [-33.8688, 151.2093] }
    ]
  };

  var mode = "domestic";
  var phi = INITIAL_PHI;
  var globe = null;
  var rafId = 0;
  var staticRenderTimer = 0;
  var lastTime = 0;
  var inView = true;
  var pageVisible = !document.hidden;
  var failed = false;
  var contextLost = false;
  var destroyed = false;
  var labelNodes = [];
  var resizeObserver = null;
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var reduced = !!motionQuery && motionQuery.matches;

  function size() {
    var rect = layer.getBoundingClientRect();
    return {
      width: Math.max(1, Math.round(rect.width || layer.clientWidth || 1)),
      height: Math.max(1, Math.round(rect.height || layer.clientHeight || 1))
    };
  }

  function isDark() {
    return document.documentElement.classList.contains("dark");
  }

  function appearance() {
    var dark = isDark();
    return {
      dark: dark ? 1 : 0,
      diffuse: 1.35,
      mapSamples: 14000,
      mapBrightness: dark ? 3.6 : 4.2,
      mapBaseBrightness: 0.05,
      baseColor: dark ? [0.20, 0.31, 0.37] : [0.36, 0.56, 0.66],
      markerColor: [0.40, 0.78, 0.95],
      glowColor: dark ? [0.20, 0.43, 0.58] : [0.73, 0.88, 0.96],
      opacity: 0.94,
      arcColor: [0.40, 0.72, 0.90],
      arcWidth: 0.38,
      arcHeight: 0.22,
      markerElevation: ELEVATION,
      scale: 1,
      offset: [0, 0]
    };
  }

  function globeOptions() {
    var dims = size();
    var options = appearance();
    options.width = dims.width;
    options.height = dims.height;
    options.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    options.phi = phi;
    options.theta = THETA;
    options.markers = MARKERS[mode].map(function (marker) {
      return { location: marker.location, size: marker.size };
    });
    options.arcs = ARCS[mode].map(function (arc) {
      return { from: arc.from, to: arc.to };
    });
    return options;
  }

  function project(location) {
    var lat = location[0] * Math.PI / 180;
    var lon = location[1] * Math.PI / 180 - Math.PI;
    var cosLat = Math.cos(lat);
    var radius = GLOBE_RADIUS + ELEVATION;
    var x0 = -cosLat * Math.cos(lon) * radius;
    var y0 = Math.sin(lat) * radius;
    var z0 = cosLat * Math.sin(lon) * radius;

    var cx = Math.cos(THETA), sx = Math.sin(THETA);
    var cy = Math.cos(phi), sy = Math.sin(phi);
    var rx = cy * x0 + sy * z0;
    var ry = sy * sx * x0 + cx * y0 - cy * sx * z0;
    var rz = -sy * cx * x0 + sx * y0 + cy * cx * z0;

    var cw = canvas.width || size().width;
    var ch = canvas.height || size().height;
    var aspect = cw / ch;
    return {
      x: ((rx / aspect + 1) / 2) * 100,
      y: ((-ry + 1) / 2) * 100,
      z: rz,
      visible: rz >= 0
    };
  }

  function updateLabels() {
    labelNodes.forEach(function (entry) {
      var point = project(entry.location);
      var x = point.x.toFixed(3) + "%";
      var y = point.y.toFixed(3) + "%";
      var opacity = point.visible ? Math.min(1, 0.55 + point.z).toFixed(3) : "0";
      entry.node.setAttribute("data-x", x);
      entry.node.setAttribute("data-y", y);
      entry.node.setAttribute("data-opacity", opacity);
      entry.node.setAttribute("opacity", opacity);
      entry.dot.setAttribute("cx", x);
      entry.dot.setAttribute("cy", y);
      entry.text.setAttribute("x", x);
      entry.text.setAttribute("y", y);
    });
  }

  function rebuildLabels() {
    labelsHost.textContent = "";
    labelNodes = MARKERS[mode].map(function (marker, index) {
      var group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", "de-globe-label");
      group.setAttribute("data-name", marker.name);
      group.setAttribute("data-lat", String(marker.location[0]));
      group.setAttribute("data-lng", String(marker.location[1]));
      group.setAttribute("data-rank", String(index + 1));

      var dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("r", "3");
      var text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("dx", "8");
      text.setAttribute("text-anchor", "start");
      text.setAttribute("dominant-baseline", "middle");
      text.textContent = marker.name;
      group.appendChild(dot);
      group.appendChild(text);
      labelsHost.appendChild(group);
      return { node: group, dot: dot, text: text, location: marker.location };
    });
    updateLabels();
  }

  function renderFrame(extra) {
    if (!globe || failed || contextLost) return;
    var state = { phi: phi };
    if (extra) Object.keys(extra).forEach(function (key) { state[key] = extra[key]; });
    globe.update(state);
    updateLabels();
  }

  function shouldAnimate() {
    return !!globe && !failed && !contextLost && !destroyed && !reduced && inView && pageVisible;
  }

  function tick(now) {
    rafId = 0;
    if (!shouldAnimate()) return;
    var delta = Math.min(Math.max(now - lastTime, 0), MAX_FRAME_DELTA);
    lastTime = now;
    phi = (phi + delta * ROTATION_PER_MS) % (Math.PI * 2);
    renderFrame();
    rafId = window.requestAnimationFrame(tick);
  }

  function syncLoop() {
    if (shouldAnimate() && !rafId) {
      lastTime = performance.now();
      rafId = window.requestAnimationFrame(tick);
    } else if (!shouldAnimate() && rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function unwrapCanvas() {
    var parent = canvas.parentElement;
    if (!parent || parent === layer || parent.tagName !== "DIV") return;
    if (parent.classList.contains("de-globe-static") || parent.classList.contains("de-globe-labels")) return;
    while (parent.firstChild) layer.insertBefore(parent.firstChild, parent);
    parent.remove();
  }

  function setFallback() {
    layer.dataset.state = "fallback";
    layer.dataset.motion = "static";
    syncLoop();
  }

  function scheduleStaticRefinement() {
    if (!reduced || !globe || failed || contextLost || destroyed) return;
    if (staticRenderTimer) window.clearTimeout(staticRenderTimer);
    staticRenderTimer = window.setTimeout(function () {
      staticRenderTimer = 0;
      renderFrame();
    }, 250);
  }

  function initGlobe() {
    if (globe || failed || destroyed) return;
    try {
      unwrapCanvas();
      globe = createGlobe(canvas, globeOptions());
      var context = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!context || !globe || typeof globe.update !== "function") throw new Error("WebGL unavailable");
    } catch (error) {
      globe = null;
      failed = true;
      setFallback();
      return;
    }
    layer.dataset.state = "ready";
    layer.dataset.motion = reduced ? "static" : "animated";
    renderFrame();
    syncLoop();
    scheduleStaticRefinement();
  }

  function applyMode() {
    layer.dataset.mode = mode;
    layer.dataset.arcs = ARCS[mode].map(function (arc) { return arc.id; }).join(",");
    rebuildLabels();
    if (globe && !failed && !contextLost) {
      renderFrame({
        markers: MARKERS[mode].map(function (marker) { return { location: marker.location, size: marker.size }; }),
        arcs: ARCS[mode].map(function (arc) { return { from: arc.from, to: arc.to }; })
      });
    }
  }

  function destroyGlobe() {
    if (destroyed) return;
    destroyed = true;
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
    if (staticRenderTimer) window.clearTimeout(staticRenderTimer);
    staticRenderTimer = 0;
    if (resizeObserver) resizeObserver.disconnect();
    if (globe) {
      try { globe.destroy(); } catch (error) {}
      globe = null;
    }
    unwrapCanvas();
  }

  Array.prototype.forEach.call(section.querySelectorAll('input[name="deMode"]'), function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      var nextMode = input.value === "international" ? "international" : "domestic";
      if (nextMode === mode) return;
      mode = nextMode;
      applyMode();
    });
  });

  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
    contextLost = true;
    setFallback();
  });
  canvas.addEventListener("webglcontextrestored", function () {
    if (destroyed || failed) return;
    try { if (globe) globe.destroy(); } catch (error) {}
    globe = null;
    contextLost = false;
    unwrapCanvas();
    initGlobe();
    applyMode();
  });

  document.addEventListener("visibilitychange", function () {
    pageVisible = !document.hidden;
    syncLoop();
  });

  if ("MutationObserver" in window) {
    var themeObserver = new MutationObserver(function () {
      if (!globe || failed || contextLost) return;
      renderFrame(appearance());
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }

  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(function () {
      if (!globe || failed || contextLost) return;
      var dims = size();
      renderFrame({ width: dims.width, height: dims.height });
    });
    resizeObserver.observe(layer);
  } else {
    window.addEventListener("resize", function () {
      if (!globe || failed || contextLost) return;
      var dims = size();
      renderFrame({ width: dims.width, height: dims.height });
    });
  }

  if (motionQuery) {
    var onMotionChange = function () {
      reduced = motionQuery.matches;
      layer.dataset.motion = reduced ? "static" : "animated";
      if (reduced && rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      renderFrame();
      syncLoop();
      scheduleStaticRefinement();
    };
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotionChange);
    else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      inView = !!entries[entries.length - 1].isIntersecting;
      syncLoop();
    }, { threshold: 0.01 });
    observer.observe(section);
  }

  window.addEventListener("pagehide", function (event) {
    if (event && event.persisted) {
      pageVisible = false;
      syncLoop();
      return;
    }
    destroyGlobe();
  });
  window.addEventListener("pageshow", function (event) {
    if (!event || !event.persisted || destroyed) return;
    pageVisible = !document.hidden;
    syncLoop();
    scheduleStaticRefinement();
  });

  layer.dataset.motion = reduced ? "static" : "animated";
  applyMode();
  initGlobe();
})();

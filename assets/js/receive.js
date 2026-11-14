/* receive.js (2026-11-14): an episode's page receives its record. The first frame stands where it always has; as the
   reader scrolls on, it holds its place and the record's other frames come in over it one after another, each
   arriving coarse and resolving block by block, the way a picture sent across the delay is received. A line under
   it keeps count: which frame, and how far into the sending's delay (its DAS, read from the page's own record).
   The link on the picture opens whichever frame is showing.
   Without this script, where motion is reduced, or where a canvas cannot be had, the page is exactly as written:
   the first frame, and the frames in their own section below. */
(function () {
  "use strict";
  if (!("IntersectionObserver" in window) || !document.querySelector) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var fig = document.querySelector(".nsl .sx__frame");
  var link = fig && fig.querySelector("a.view--hero");
  var hero = link && link.querySelector("img");
  if (!hero) return;
  var probe = document.createElement("canvas");
  if (!probe.getContext || !probe.getContext("2d")) return;

  /* the record's frames, as the page lists them: the first in the hero, the rest in the Frames section */
  var frames = [{ img: hero, href: link.getAttribute("href") }];
  Array.prototype.forEach.call(document.querySelectorAll(".frames__item img"), function (img) {
    var a = img.closest("a");
    frames.push({ img: img, href: a ? a.getAttribute("href") : null });
  });
  if (frames.length < 2) return;
  var N = frames.length;

  /* what the page says of itself (as it reads aloud: a heading arrive.js has split keeps its words once) */
  function said(el) {
    if (!el) return "";
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll("[aria-hidden]"), function (h) { h.remove(); });
    return c.textContent.trim();
  }
  var code = said(document.querySelector(".sx__h"));
  var das = NaN;
  Array.prototype.forEach.call(document.querySelectorAll(".glance__i"), function (i) {
    var dt = i.querySelector("dt");
    if (dt && dt.textContent.trim() === "DAS") das = parseFloat(said(i.querySelector(".glance__big")));
  });

  /* each frame's file at the size the reader's screen wants: the 1440 cut on wide screens, the 960 one on narrow
     ones or when data is to be saved */
  var small = window.matchMedia("(max-width: 700px)").matches || (navigator.connection && navigator.connection.saveData);
  function srcOf(img) {
    var s = img.getAttribute("src") || "";
    return small ? s : s.replace(/-960\.webp$/, "-1440.webp");
  }

  /* the stage: the figure, held in place while the record's frames come in */
  var rx = document.createElement("div"); rx.className = "rx";
  var stage = document.createElement("div"); stage.className = "rx__stage";
  fig.parentNode.insertBefore(rx, fig);
  rx.appendChild(stage); stage.appendChild(fig);
  var canvas = document.createElement("canvas"); canvas.className = "rx__c"; canvas.setAttribute("aria-hidden", "true");
  link.appendChild(canvas);
  var hud = document.createElement("div"); hud.className = "rx__hud"; hud.setAttribute("aria-hidden", "true");
  var hudL = document.createElement("span"); hudL.className = "rx__l";
  var ticks = document.createElement("span"); ticks.className = "rx__ticks";
  var tickEls = [];
  for (var t = 0; t < N; t++) { var s = document.createElement("i"); ticks.appendChild(s); tickEls.push(s); }
  var hudR = document.createElement("span"); hudR.className = "rx__r";
  hud.appendChild(hudL); hud.appendChild(ticks); hud.appendChild(hudR);
  fig.appendChild(hud);
  rx.classList.add("is-on");

  /* the stage sits under NOSLEN's own bar, which stays at the top */
  var bar = document.querySelector(".pn");
  function measure() { rx.style.setProperty("--rx-top", (bar ? bar.getBoundingClientRect().height : 0) + "px"); }

  /* load each frame's picture once, in order, as the stage comes near */
  var pics = new Array(N), started = false;
  function load() {
    if (started) return; started = true;
    frames.forEach(function (f, i) {
      var im = new Image(); im.decoding = "async";
      im.onload = function () { pics[i] = im; dirty = true; schedule(); };
      im.src = srcOf(f.img);
    });
  }

  var ctx = canvas.getContext("2d");
  var off = document.createElement("canvas"), octx = off.getContext("2d");
  var W = 0, H = 0;
  function size() {
    var r = link.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; dirty = true; }
  }

  /* how coarse a frame still is, by how far it has come: so many blocks across, up to the whole picture (0) */
  var STEPS = [16, 24, 36, 54, 80, 120, 180, 270, 400, 0];
  var shown = { k: -1, b: -1 }, dirty = true, current = 0;
  function draw(k, b) {
    var im = pics[k];
    if (!im) { if (k > 0 && pics[k - 1]) im = pics[k - 1], b = 0; else { ctx.clearRect(0, 0, W, H); return; } }
    if (!b) {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(im, 0, 0, W, H);
    } else {
      var w = Math.min(W, b), h = Math.max(1, Math.round(w * H / W));
      off.width = w; off.height = h;
      octx.imageSmoothingEnabled = true; octx.drawImage(im, 0, 0, w, h);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, w, h, 0, 0, W, H);
    }
  }

  function fmt(x) { return (Math.round(x * 10) / 10).toFixed(1); }

  function frame() {
    raf = 0;
    var r = rx.getBoundingClientRect(), range = rx.offsetHeight - stage.offsetHeight;
    var p = range > 0 ? Math.min(1, Math.max(0, -(r.top - (parseFloat(getComputedStyle(rx).getPropertyValue("--rx-top")) || 0)) / range)) : 0;
    /* frame 1 is there from the start; the others each take an equal share of the way, resolving in its first half */
    var span = 1 / (N - 1), k, b;
    if (p <= 0) { k = 0; b = 0; }
    else {
      k = Math.min(N - 1, 1 + Math.floor(p / span));
      var q = k === N - 1 && p >= 1 ? 1 : (p - (k - 1) * span) / span;
      b = STEPS[Math.min(STEPS.length - 1, Math.floor(Math.min(1, q / 0.55) * (STEPS.length - 1)))];
      if (p >= 1) b = 0;
    }
    if (dirty || k !== shown.k || b !== shown.b) { draw(k, b); shown.k = k; shown.b = b; dirty = false; }
    if (k !== current) {
      current = k;
      if (frames[k].href) link.setAttribute("href", frames[k].href);
      hero.setAttribute("alt", frames[k].img.getAttribute("alt") || "");
      tickEls.forEach(function (el, i) { el.className = i < k ? "is-in" : i === k ? "is-now" : ""; });
    }
    hudL.textContent = (b ? "RECEIVING " : "RECEIVED ") + code + " · FRAME " + (k + 1) + "/" + N;
    hudR.textContent = isNaN(das) ? "" : "T+" + fmt(das * p) + " s / " + fmt(das) + " s";
  }
  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(frame); }

  tickEls[0].className = "is-now";
  measure(); size(); frame();
  var near = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) load(); });
  }, { rootMargin: "100% 0px" });
  near.observe(rx);
  var live = false;
  new IntersectionObserver(function (es) { live = es[0].isIntersecting; if (live) schedule(); }).observe(rx);
  window.addEventListener("scroll", function () { if (live) schedule(); }, { passive: true });
  window.addEventListener("resize", function () { measure(); size(); schedule(); });
  if (window.ResizeObserver) new ResizeObserver(function () { size(); schedule(); }).observe(link);
})();

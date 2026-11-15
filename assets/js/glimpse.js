/* A Sheet's picture comes to light (round 35, 2026-11-15). Where a Sheet's frame stands on a page with [data-glimpse], a
   few seconds of the Sheet itself play in its place, silent, from that frame's own moment: under the pointer or the
   focus for as long as it stays; on a screen that is touched, once, when the picture has come to rest in view. The
   frame is the page; the glimpse is laid over it and taken away again, so nothing moves in the layout.
   It asks only the site itself for the clip, and only when it is first wanted. Reduced motion, Save-Data, no script:
   the frame, still. */
(function () {
  'use strict';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('[data-glimpse]'));
  if (!boxes.length || !window.matchMedia) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var conn = navigator.connection;
  if (conn && conn.saveData) return;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  var live = null;                                            // one glimpse at a time
  function setup(box) {
    var v = null, want = false, again = 0, card = box.closest('li') || box;
    function make() {
      v = document.createElement('video');
      v.className = 'gl__v'; v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      v.tabIndex = -1; v.disableRemotePlayback = true;
      v.addEventListener('playing', function () {
        if (!want) return;
        if (isFinite(v.duration)) box.style.setProperty('--gl-d', v.duration.toFixed(2) + 's');
        box.classList.add('is-live');
      });
      v.addEventListener('ended', function () {
        box.classList.remove('is-live');
        if (want && fine) again = setTimeout(play, 1100);      // under the pointer it comes again; touched, it has been seen
        else want = false;
      });
      v.addEventListener('error', function () { want = false; box.classList.remove('is-live'); });
      v.src = box.getAttribute('data-glimpse');
      box.appendChild(v);
    }
    function play() {
      if (!want) return;
      if (!v) make();
      try { v.currentTime = 0; } catch (e) { /* not ready yet: it starts at its start anyway */ }
      var p = v.play();
      if (p && p.catch) p.catch(function () { want = false; box.classList.remove('is-live'); });
    }
    var api = {
      start: function () {
        if (want) return;
        if (live && live !== api) live.stop();
        live = api; want = true; play();
      },
      stop: function () {
        want = false; clearTimeout(again); box.classList.remove('is-live');
        if (v) v.pause();
        if (live === api) live = null;
      }
    };
    if (fine) {
      card.addEventListener('pointerenter', api.start);
      card.addEventListener('pointerleave', api.stop);
      card.addEventListener('focusin', api.start);
      card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget)) api.stop(); });
    }
    return api;
  }

  var apis = boxes.map(setup);
  if (!fine && 'IntersectionObserver' in window) {
    var rest = new Map();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var k = boxes.indexOf(e.target), api = apis[k];
        clearTimeout(rest.get(k));
        if (e.intersectionRatio >= 0.85) rest.set(k, setTimeout(api.start, 650));
        else if (e.intersectionRatio < 0.4) api.stop();
      });
    }, { threshold: [0, 0.4, 0.85, 1] });
    boxes.forEach(function (b) { io.observe(b); });
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden && live) live.stop(); });
})();

/* The strip runs (round 36, 2026-11-15). On NOSLEN's page every frame of every Sheet stands on one strip; here the strip
   is film going through a gate: it travels by itself, slowly, faster as the page is moved, and turns back at its ends.
   Under the pointer or the focus, or touched, it stands still; Hold stops it for good. The strip's own scrolling, its
   two buttons and its track (site.js) work as they did. Reduced motion or no script: the strip, still. */
(function () {
  'use strict';
  var reel = document.querySelector('.reel');
  if (!reel || !window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var dir = 1, boost = 0, lastY = window.scrollY, lastT = 0, over = false, held = false, seen = false, raf = 0, x = reel.scrollLeft;
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'reel__hold'; btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Hold';
  function place() { var nav = reel.parentNode.querySelector('.reel__nav'); if (nav && btn.parentNode !== nav) nav.insertBefore(btn, nav.firstChild); else if (!nav && !btn.parentNode) reel.parentNode.appendChild(btn); }
  btn.addEventListener('click', function () {
    held = !held; btn.setAttribute('aria-pressed', held ? 'true' : 'false'); btn.textContent = held ? 'Run' : 'Hold';
    if (!held) go();
  });
  function running() { return seen && !over && !held && !document.hidden; }
  function step(t) {
    raf = 0;
    if (!running()) { reel.classList.remove('is-running'); return; }
    reel.classList.add('is-running');
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0); lastT = t;
    var max = reel.scrollWidth - reel.clientWidth;
    if (max <= 4) return;
    if (Math.abs(reel.scrollLeft - x) > 2) x = reel.scrollLeft;         // moved by hand: go on from there
    x += dir * (26 + boost) * dt; boost *= Math.pow(0.04, dt);
    if (x >= max) { x = max; dir = -1; } else if (x <= 0) { x = 0; dir = 1; }
    reel.scrollLeft = x;
    raf = requestAnimationFrame(step);
  }
  function go() { place(); if (!raf && running()) { lastT = performance.now(); x = reel.scrollLeft; raf = requestAnimationFrame(step); } }
  window.addEventListener('scroll', function () { var y = window.scrollY; boost = Math.min(900, boost + Math.abs(y - lastY) * 3.2); lastY = y; }, { passive: true });
  reel.addEventListener('pointerenter', function () { over = true; });
  reel.addEventListener('pointerleave', function () { over = false; go(); });
  reel.addEventListener('focusin', function () { over = true; });
  reel.addEventListener('focusout', function () { over = false; go(); });
  reel.addEventListener('touchstart', function () { over = true; }, { passive: true });
  reel.addEventListener('touchend', function () { setTimeout(function () { over = false; go(); }, 2500); }, { passive: true });
  document.addEventListener('visibilitychange', go);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; go(); }, { threshold: 0.2 }).observe(reel);
  else { seen = true; }
  setTimeout(go, 1200);
})();

/* The Sheets, come through the delay (round 36, 2026-11-15; the client: louder). On the home the row of Sheets becomes a
   held scene: the page stands still while the reader goes on, and the Sheets come one after another out of the distance,
   each to the front, whole, then past; behind them the light's fronts go by, and each Sheet's name stands behind it at
   the size of the screen. The Sheet at the front plays its glimpse. The scroll is the only clock: nothing moves that
   the reader does not move. Serial order; no count is said.
   Without this script, where motion is reduced, or in a window too short to hold a frame: the row, as written. */
(function () {
  'use strict';
  var sec = document.querySelector('.shs'), row = sec && sec.querySelector('.shs__row');
  if (!row || !window.matchMedia || !window.requestAnimationFrame) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerHeight < 560) return;
  var items = Array.prototype.slice.call(row.children), n = items.length;
  if (n < 2) return;
  var NS = 'http://www.w3.org/2000/svg', root = document.documentElement;
  root.classList.add('deep');

  var stage = document.createElement('div'); stage.className = 'shs__stage';
  while (sec.firstChild) stage.appendChild(sec.firstChild);
  sec.appendChild(stage); sec.classList.add('shs--deep');
  row.removeAttribute('tabindex');
  var STEP = 0.9;                                              // a Sheet's share of the way, in screens
  sec.style.height = ((n - 1) * STEP + 1.35) * 100 + 'svh';

  var fronts = document.createElementNS(NS, 'svg'); fronts.setAttribute('class', 'shs__fronts'); fronts.setAttribute('aria-hidden', 'true');
  var rings = [];
  for (var k = 0; k < 9; k++) { var c = document.createElementNS(NS, 'circle'); c.setAttribute('fill', 'none'); fronts.appendChild(c); rings.push(c); }
  stage.insertBefore(fronts, row);
  var names = items.map(function (li) {
    var t = li.querySelector('.shs__t'), el = document.createElement('p');
    el.className = 'shs__big'; el.setAttribute('aria-hidden', 'true'); el.textContent = t ? t.textContent : '';
    stage.insertBefore(el, row); return el;
  });
  var boxes = items.map(function (li) { return li.querySelector('[data-glimpse]'); });

  var W = 0, H = 0, top = 0, span = 1, front = -1, since = 0, playing = -1, raf = 0;
  function measure() {
    W = window.innerWidth; H = window.innerHeight;
    var r = sec.getBoundingClientRect(); top = r.top + window.scrollY; span = Math.max(1, (n - 1) * STEP * H);
    fronts.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  }
  function fire(i, name) { if (boxes[i]) boxes[i].dispatchEvent(new Event(name)); }

  function draw() {
    raf = 0;
    var p = (window.scrollY - top - 0.12 * H) / span * (n - 1);      // which Sheet is at the front (0 .. n - 1), and how far past
    p = Math.max(-0.6, Math.min(n - 1, p));
    var cx = W * 0.5, cy = H * 0.52, vx = W * 0.5, vy = H * 0.34;   // where the front stands; where the distance is
    var nearest = -1, best = 9;
    for (var i = 0; i < n; i++) {
      var d = i - p, li = items[i], s, x, y, o;
      if (d >= 0) {                                              // still coming: smaller, toward the distance
        s = 1 / (1 + 1.9 * d); x = (vx - cx) * (1 - s); y = (vy - cy) * (1 - s);
        o = d < 1.6 ? 1 : Math.max(0, 1 - (d - 1.6) / 0.9);
      } else {                                                   // past the front: it comes on, larger, and is gone
        var e = -d; s = 1 + 2.4 * e * e + 0.5 * e; x = -e * W * 0.16; y = e * H * 0.10;
        o = Math.max(0, 1 - e / 0.34);
      }
      li.style.transform = 'translate(-50%, -50%) translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
      li.style.opacity = o.toFixed(3);
      li.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
      li.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
      li.classList.toggle('is-front', Math.abs(d) < 0.3);
      var nm = names[i], a = Math.max(0, 1 - Math.abs(d) / 0.8);
      nm.style.opacity = a.toFixed(3);
      nm.style.transform = 'translate(-50%, -50%) translate3d(' + (d * W * 0.42).toFixed(1) + 'px,0,0) scale(' + (1 + 0.12 * (1 - a)).toFixed(3) + ')';
      if (Math.abs(d) < best) { best = Math.abs(d); nearest = i; }
    }
    var R = Math.hypot(W, H) * 0.62;                             // the light's fronts: rings about the distance, each a Sheet's step apart, going by
    for (var j = 0; j < rings.length; j++) {
      var dd = (j - 2) * 0.5 - (p % 0.5) + 0.25, sc = dd >= 0 ? 1 / (1 + 1.9 * dd) : 1 + 2.4 * dd * dd - 0.5 * dd, rr = R * sc * 0.5;
      var ro = dd >= 0 ? Math.min(1, 0.9 - dd * 0.3) : Math.max(0, 1 + dd / 0.5);
      rings[j].setAttribute('cx', (vx + (cx - vx) * Math.min(1.4, sc)).toFixed(1)); rings[j].setAttribute('cy', (vy + (cy - vy) * Math.min(1.4, sc)).toFixed(1));
      rings[j].setAttribute('r', Math.max(0, rr).toFixed(1)); rings[j].style.opacity = Math.max(0, ro * 0.55).toFixed(3);
      rings[j].classList.toggle('is-near', dd > -0.25 && dd < 0.25);
    }
    var now = performance.now(), f = best < 0.22 ? nearest : -1;   // the Sheet that has come to the front and stayed plays
    if (f !== front) { front = f; since = now; if (playing >= 0) { fire(playing, 'glimpse:stop'); playing = -1; } }
    if (front >= 0 && playing < 0 && now - since > 320) { playing = front; fire(front, 'glimpse:start'); }
    if (front >= 0 && playing < 0) raf = requestAnimationFrame(draw);
  }
  function ask() { if (!raf) raf = requestAnimationFrame(draw); }

  measure(); draw();
  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', function () { measure(); ask(); });
  if ('ResizeObserver' in window) new ResizeObserver(function () { measure(); ask(); }).observe(document.body);
  row.addEventListener('focusin', function (e) {                // the focus goes to a Sheet: the page goes to it
    var li = e.target.closest ? e.target.closest('.shs__it') : null, i = items.indexOf(li);
    if (i < 0) return;
    var y = top + 0.12 * H + i * STEP * H;
    if (Math.abs(window.scrollY - y) > 0.25 * H) window.scrollTo({ top: y, behavior: 'smooth' });
  });
})();

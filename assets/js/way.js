/* The Register's line, kept (round 35, 2026-11-15). "Delivered at the speed of light. Eventually."
   Under the line, the way from the FUCHA to the Earth at the last Sheet's Delay at Sending (the List's own number), drawn
   to scale in seconds. Light sent as the page opened is on it, where light would be: it crosses in that many seconds
   and not one fewer, whatever the reader does (the tab hidden, the drawing held: it does not wait). When it is at the
   Earth the line's last word is lit. The mark that travels is the delay chip's own, as on every frame.
   It requests nothing, stores nothing; without script the line stands as it was. Reduced motion: drawn where it is as
   the page opens, and again when it has arrived; nothing travels. */
(function () {
  'use strict';
  var el = document.querySelector('[data-way]');
  if (!el) return;
  var das = parseFloat(el.getAttribute('data-das'));
  if (!(das > 0)) return;
  var NS = 'http://www.w3.org/2000/svg';
  var motto = el.closest('.motto');
  var plot = el.querySelector('.way__plot'), tEl = el.querySelector('[data-way-t]');
  var sentEl = el.querySelector('[data-way-sent]'), dueEl = el.querySelector('[data-way-due]'), dueK = el.querySelector('[data-way-duek]');
  var hold = el.querySelector('.way__hold');
  var still = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: true };
  var t0 = Date.now(), held = false, done = false, W = 0, H = 132, xs = 0, xe = 0, mid = 58, hm = 40;
  var lit, pulse, earth, ring, wave = [], fronts = [];

  var two = function (n) { return (n < 10 ? '0' : '') + n; };
  var clock = function (ms) { var d = new Date(ms); return two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds()); };
  var mk = function (name, at, cls) {
    var n = document.createElementNS(NS, name);
    for (var k in at) n.setAttribute(k, at[k]);
    if (cls) n.setAttribute('class', cls);
    return n;
  };
  var arc = function (cx, r, h) {                              // the part of a circle about the sender that stands within h of the way
    h = Math.min(h, r);
    var dx = Math.sqrt(r * r - h * h);
    return 'M' + (cx + dx).toFixed(1) + ' ' + (mid - h).toFixed(1) + 'A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + (cx + dx).toFixed(1) + ' ' + (mid + h).toFixed(1);
  };

  function build() {
    W = Math.round(plot.clientWidth);
    if (!W) return;
    var small = W < 560;
    H = small ? 132 : 196; hm = small ? 40 : 74; mid = hm + 14; xs = 9; xe = W - 9;
    plot.style.height = H + 'px';
    while (plot.firstChild) plot.removeChild(plot.firstChild);
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'aria-hidden': 'true', focusable: 'false' }, 'way__svg');
    svg.appendChild(mk('line', { x1: xs, x2: xe, y1: mid, y2: mid }, 'way__base'));
    fronts = [];
    for (var t = 30; t < das - 8; t += 30) {                   // a wave front every half minute of light; every minute named
      var min = t % 60 === 0, r = (xe - xs) * t / das;
      var f = mk('path', { d: arc(xs, r, min ? hm : hm * 0.42) }, min ? 'way__front way__front--min' : 'way__front');
      svg.appendChild(f); fronts.push([t, f]);
      if (min && (!small || (t / 60) % 2 === 0)) {
        var tx = mk('text', { x: (xs + r).toFixed(1), y: mid + hm + 20, 'text-anchor': 'middle' }, 'way__n');
        tx.textContent = (t / 60) + ' min';
        svg.appendChild(tx);
      }
    }
    lit = mk('line', { x1: xs, x2: xs, y1: mid, y2: mid }, 'way__lit'); svg.appendChild(lit);
    var g = mk('g', {}, 'way__fch');                           // the sender: the house's plate
    g.appendChild(mk('rect', { x: xs - 7, y: mid - 7, width: 14, height: 14, rx: 2 }, 'way__plate'));
    g.appendChild(mk('rect', { x: xs - 2.5, y: mid - 2.5, width: 5, height: 5 }, 'way__eye'));
    svg.appendChild(g);
    ring = mk('circle', { cx: xe, cy: mid, r: 6.5 }, 'way__ring'); svg.appendChild(ring);
    earth = mk('circle', { cx: xe, cy: mid, r: 6.5 }, 'way__earth'); svg.appendChild(earth);
    pulse = mk('g', {}, 'way__pulse');                          // the delay chip's mark at the size of the way: the light's front, two behind it, its point on the line
    wave = [0, 1, 2].map(function (i) { var w = mk('path', { d: '' }, 'way__w way__w--' + (i + 1)); pulse.appendChild(w); return w; });
    pulse.appendChild(mk('circle', { cx: 0, cy: mid, r: 3.6 }, 'way__dot'));
    svg.appendChild(pulse);
    plot.appendChild(svg);
    draw(true);
  }

  function draw(force) {
    if (!W) return;
    var s = (Date.now() - t0) / 1000, u = Math.min(1, s / das), x = xs + (xe - xs) * u;
    if (u >= 1 && !done) arrive();
    if (held && !force && !done) return;
    lit.setAttribute('x2', x.toFixed(1));
    for (var i = 0; i < 3; i++) {
      var r = x - xs - i * (W < 560 ? 7 : 11);
      wave[i].setAttribute('d', r > 2 ? arc(xs, r, hm + 8 - i * 6) : '');
    }
    pulse.lastChild.setAttribute('cx', x.toFixed(1));
    for (var k = 0; k < fronts.length; k++) {
      var on = fronts[k][0] <= s;
      if (on !== (fronts[k][2] === true)) { fronts[k][2] = on; fronts[k][1].classList.toggle('is-lit', on); }
    }
    if (tEl) {
      var sec = Math.min(s, das), m = Math.floor(sec / 60), rr = sec - m * 60;
      tEl.textContent = 'T+' + m + ':' + (rr < 10 ? '0' : '') + rr.toFixed(1);
      var half = tEl.offsetWidth / 2;
      tEl.style.transform = 'translateX(' + Math.max(0, Math.min(W - 2 * half, x - half)).toFixed(1) + 'px)';
    }
  }

  function arrive() {
    done = true;
    el.classList.add('is-in');
    if (motto) motto.classList.add('is-in');
    if (dueK) dueK.textContent = 'received';
    if (hold) hold.hidden = true;
  }

  sentEl.textContent = clock(t0);
  dueEl.textContent = clock(t0 + das * 1000);
  el.hidden = false;
  build();
  if ('ResizeObserver' in window) new ResizeObserver(function () { if (Math.round(plot.clientWidth) !== W) build(); }).observe(plot);
  else window.addEventListener('resize', build);

  if (hold) {
    hold.addEventListener('click', function () {
      held = !held;
      hold.setAttribute('aria-pressed', held ? 'true' : 'false');
      hold.textContent = held ? 'Follow' : 'Hold';
      el.classList.toggle('is-held', held);
      if (!held) draw(true);                                   // the light did not wait
    });
  }
  if (still.matches) {                                         // nothing travels: where it is now, and the arrival when it comes
    if (hold) hold.hidden = true;
    setTimeout(function () { draw(true); }, Math.max(0, das * 1000 - (Date.now() - t0)) + 50);
    return;
  }
  var seen = true;
  if ('IntersectionObserver' in window) {
    seen = false;
    new IntersectionObserver(function (es) { seen = es[0].isIntersecting; if (seen) tick(); }, { rootMargin: '80px' }).observe(el);
  }
  var raf = 0;
  function tick() {
    cancelAnimationFrame(raf);
    draw(false);
    if (done) { draw(true); return; }
    if (seen && !document.hidden) raf = requestAnimationFrame(tick);
  }
  setInterval(function () { if (!done && (Date.now() - t0) / 1000 >= das) { arrive(); draw(true); } }, 1000);   // it arrives whether or not it is watched
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
  tick();
})();

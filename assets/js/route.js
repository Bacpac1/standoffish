/* A route's page: one event, then still. It requests nothing, stores nothing and reads nothing back.
   Elements with data-at take the class "on" at that second; each route may also count, turn or type. Under reduced
   motion the end state is drawn at once; without this script the page shows the end state as written. Dates and
   times are the reader's terminal's own, computed here and sent nowhere. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var id = root.getAttribute('data-route');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ease(x) { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  function set(el, s) { if (el && el.textContent !== s) el.textContent = s; }
  var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var now = new Date();
  var iso = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  var hhmm = pad(now.getHours()) + ':' + pad(now.getMinutes());
  var dmy = pad(now.getDate()) + ' ' + MON[now.getMonth()] + ' ' + now.getFullYear();

  // counters written data-count="from:to:start:end"
  var counts = $$('[data-count]').map(function (el) {
    var p = el.getAttribute('data-count').split(':').map(Number);
    return { el: el, a: p[0], b: p[1], s: p[2], e: p[3] };
  });
  function tickCounts(t) {
    counts.forEach(function (c) { set(c.el, String(Math.round(c.a + (c.b - c.a) * clamp((t - c.s) / (c.e - c.s), 0, 1)))); });
  }

  var R = {
    understudy: { end: 2.6, init: function () {
        set($('[data-us-eta]'), '00:19:00'); set($('[data-us-date]'), '30 June 2073');
        var st = $('.us__stand'); if (st) st.classList.remove('on', 'gone');
      },
      tick: function (t) {
        var s = Math.round((1 - clamp((t - 0.3) / 1.2, 0, 1)) * 19 * 60);
        set($('[data-us-eta]'), '00:' + pad(Math.floor(s / 60)) + ':' + pad(s % 60));
        if (t >= 2.0) set($('[data-us-date]'), '1 July 2073');
        if (t >= 2.15) { var st = $('.us__stand'); if (st) st.classList.add('gone'); }
      },
      final: function () {
        set($('[data-us-eta]'), '00:00:00'); set($('[data-us-date]'), '1 July 2073');
        var st = $('.us__stand'); if (st) st.classList.add('on', 'gone');
      } },

    facsimile: { end: 3.0, init: function () { set($('[data-fx-lcd]'), 'READY'); set($('[data-fx-now]'), iso + ' ' + hhmm); },
      tick: function (t) {
        var led = $('.fx__led');
        if (t >= 0.4 && t < 2.8) { set($('[data-fx-lcd]'), 'RX P.01 ' + pad(Math.round(clamp((t - 0.4) / 2.3, 0, 1) * 99), 2) + '%'); if (led) led.classList.add('rx'); }
        if (t >= 2.8) { set($('[data-fx-lcd]'), 'RX OK P.01'); if (led) led.classList.remove('rx'); }
      },
      final: function () { set($('[data-fx-lcd]'), 'RX OK P.01'); set($('[data-fx-now]'), iso + ' ' + hhmm); } },

    telephone: { end: 2.6, tick: function (t) {
        // the zero: pulled round to the finger stop (330 degrees), released, and returned by the governor at ten
        // pulses a second, one pulse for each of its ten steps
        var w = $('.tp__wheel'), a = 0;
        if (t < 0.4) a = 0;
        else if (t < 1.25) a = 330 * ease((t - 0.4) / 0.85);
        else if (t < 1.4) a = 330;
        else a = 330 * (1 - clamp((t - 1.4) / 1.0, 0, 1));
        if (w) w.style.transform = 'rotate(' + a.toFixed(2) + 'deg)';
        var n = t < 1.4 ? 0 : Math.min(10, Math.floor((t - 1.4) / 0.1) + 1);
        $$('.tp__pulses i').forEach(function (p, i) { p.classList.toggle('on', i < n); });
      },
      final: function () { var w = $('.tp__wheel'); if (w) w.style.transform = 'rotate(0deg)'; $$('.tp__pulses i').forEach(function (p) { p.classList.add('on'); }); } },

    telegraph: { end: 4.2, init: function () {
        $$('.tg__strip').forEach(function (s) {
          if (!s.hasAttribute('data-full')) s.setAttribute('data-full', s.textContent);
          s.textContent = '';
        });
        if (!$('.tg__morse b')) morse();
      },
      tick: function (t) {
        $$('.tg__strip').forEach(function (s) {
          var full = s.getAttribute('data-full') || '', at = +s.getAttribute('data-type');
          set(s, full.slice(0, clamp(Math.floor((t - at) * 30), 0, full.length)));
        });
        if (t >= 0.3) { set($('[data-tg-time]'), hhmm); set($('[data-tg-date]'), dmy); }
        if (t >= 3.0) set($('[data-tg-stamp]'), dmy);
        var m = $('.tg__morse'), box = $('.tg__tape');
        if (m && box) m.style.transform = 'translateX(' + (box.clientWidth - t * 150).toFixed(1) + 'px)';
      },
      final: function () {
        $$('.tg__strip').forEach(function (s) { var f = s.getAttribute('data-full'); if (f) set(s, f); });
        set($('[data-tg-time]'), hhmm); set($('[data-tg-date]'), dmy); set($('[data-tg-stamp]'), dmy);
        if (!$('.tg__morse b')) morse();
      } }
  };

  // ------------------------------------------------------------------ the 2090s (round 24d): loops
  // The page is whole at once; its text is the final record. The drawing lives: the system's own work goes round and
  // round, and the rule the page states holds every time: Hail's cards come in from Earth and are held at CDX3, the
  // way on to the vessel empty; Thrice's witnesses come in threes and stop short of a terminal; a week passes over
  // Lintel's empty plot, every day --:--; Fallow's collectors work their furrows and turn at the line. A control under
  // the drawing pauses it and plays it; out of view, or with the page hidden, it waits. Under reduced motion, and
  // without the script, the drawing stands still as written.
  var NS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function num(el, a) { return el.getAttribute(a).split(' ').map(Number); }
  function f1(v) { return v.toFixed(1); }
  function at(el, x, y, extra) { el.setAttribute('transform', 'translate(' + f1(x) + ' ' + f1(y) + ')' + (extra || '')); }
  function inout(x) { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function out3(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
  // an even pace, slowing to a stop over its last part: position 0..1 at time u 0..1
  function pace(u, slow) {
    u = clamp(u, 0, 1);
    var ud = 1 - slow, v = 1 / (ud + slow / 2);
    return u <= ud ? v * u : v * ud + v * (u - ud) - v * (u - ud) * (u - ud) / (2 * slow);
  }
  // a cubic "M x y C x y x y x y" at even lengths along it
  function curve(d, n) {
    var v = d.match(/-?[\d.]+/g).map(Number), P = [], acc = [0];
    for (var i = 0; i <= n; i++) {
      var u = i / n, a = (1 - u) * (1 - u) * (1 - u), b = 3 * u * (1 - u) * (1 - u), c = 3 * u * u * (1 - u), e = u * u * u;
      P.push([a * v[0] + b * v[2] + c * v[4] + e * v[6], a * v[1] + b * v[3] + c * v[5] + e * v[7]]);
      if (i) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    }
    return function (f) {
      var L = acc[n] * clamp(f, 0, 1), i = 1;
      while (i < n && acc[i] < L) i++;
      var w = (L - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1);
      return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * w, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * w];
    };
  }
  // the drawing's own projection (tools/drawings24c.py writes it on the picture): a point of the model, in its units
  function projector(svg) {
    var p = num(svg, 'data-proj'), C = Math.cos(Math.PI / 6);
    return function (x, y, z) { return [((x - y) * C - p[0]) * p[2] + p[3], ((x + y) / 2 - z - p[1]) * p[2] + p[3]]; };
  }
  function hull(pts) {
    pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function turn(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], hi = [];
    pts.forEach(function (p) { while (lo.length > 1 && turn(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
    pts.slice().reverse().forEach(function (p) { while (hi.length > 1 && turn(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); });
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  function poly(pts) { return 'M' + pts.map(function (p) { return f1(p[0]) + ' ' + f1(p[1]); }).join('L') + 'Z'; }

  var LOOP = {
    // Hail: a card leaves a terminal on Earth's edge every 1.15 s, by one of four ways in turn, and is 1.5 s on its
    // way; it waits in the tray before the slot, three long, moving up as each new one lands; the first goes into the
    // relay (0.35 s). The bay's lamp answers each landing. The way on to FCH(T) stays empty. One turn: 4.6 s.
    hail: function (svg) {
      var g = svg.querySelector('.hl__over');
      if (!g) return null;
      var slot = num(g, 'data-slot'), tr = num(g, 'data-tray'), ways = g.getAttribute('data-ways').split(';');
      var tray = [[tr[0], tr[1]], [tr[2], tr[3]], [tr[4], tr[5]]];
      var still = [g.querySelector('.hl__pk'), g.querySelector('.hl__trail')];
      var live = mk('g', { 'class': 'hl__live' }, g);
      var trails = ways.map(function (d) { return mk('path', { 'class': 'hl__wtr', d: d, pathLength: 1 }, live); });
      var curves = ways.map(function (d) { return curve(d, 140); });
      var lamp = mk('circle', { 'class': 'hl__lamp', r: 2.4, cx: f1(slot[0] + 19), cy: f1(slot[1] - 15) }, live);
      var POOL = 7, cards = [];
      for (var i = 0; i < POOL; i++) {                  // a postcard: its face, its stamp
        var cg = mk('g', { 'class': 'hl__pc' }, live);
        mk('rect', { 'class': 'hl__cb', x: -7.5, y: -5, width: 15, height: 10, rx: 1.2 }, cg);
        mk('rect', { 'class': 'hl__cs', x: 2.4, y: -3.2, width: 3.2, height: 3.2 }, cg);
        cards.push(cg);
      }
      var P = 1.15, FLY = 1.5, SHIFT = 0.3, IN = 0.35;
      return {
        start: function () { still.forEach(function (e) { e.classList.add('is-gone'); }); live.classList.remove('is-gone'); },
        stop: function () { still.forEach(function (e) { e.classList.remove('is-gone'); }); live.classList.add('is-gone'); },
        frame: function (t) {
          t += 3 * P + FLY + IN;                           // the tray is full from the first frame
          var used = {}, lampOn = 0;
          trails.forEach(function (e) { e.style.opacity = '0'; });
          var n1 = Math.floor(t / P), n0 = Math.max(0, Math.floor((t - FLY - 3 * P - IN) / P));
          for (var n = n0; n <= n1; n++) {
            var t0 = n * P, el = cards[n % POOL], k = n % ways.length, x, y, op = 1, sc = 1;
            used[n % POOL] = true;
            if (t < t0 + FLY) {
              var u = (t - t0) / FLY, q = curves[k](inout(u));
              x = q[0]; y = q[1];
              trails[k].style.opacity = '.75';
              trails[k].style.strokeDashoffset = (1 - inout(u)).toFixed(4);
            } else {
              var since = t - t0 - FLY, c = Math.floor((since + SHIFT) / P), tau = since + SHIFT - c * P;   // those ahead move up as it lands
              if (since < 1.2) { trails[k].style.opacity = (0.75 * (1 - since / 1.2)).toFixed(3); trails[k].style.strokeDashoffset = '0'; }
              if (since < 0.5) lampOn = Math.max(lampOn, 1 - since / 0.5);
              if (c < 3) {
                var from = tray[Math.min(2, 3 - c)] || tray[2], to = tray[2 - c], s2 = c === 0 ? 1 : inout(tau / SHIFT);
                if (c === 0) { from = tray[2]; }
                x = from[0] + (to[0] - from[0]) * s2; y = from[1] + (to[1] - from[1]) * s2;
              } else if (tau < IN) {
                var s3 = inout(tau / IN);
                x = tray[0][0] + (slot[0] - tray[0][0]) * s3; y = tray[0][1] + (slot[1] - tray[0][1]) * s3;
                op = 1 - s3 * s3; sc = 1 - 0.25 * s3;
              } else { op = 0; x = slot[0]; y = slot[1]; }
            }
            at(el, x, y, sc !== 1 ? ' scale(' + sc.toFixed(3) + ')' : '');
            el.style.opacity = op.toFixed(3);
          }
          cards.forEach(function (e, i) { if (!used[i]) e.style.opacity = '0'; });
          lamp.style.opacity = lampOn.toFixed(3);
        }
      };
    },

    // Thrice: every 2.6 s a booking is written on a terminal (its line, 0.8 s) and three witnesses come in from the
    // CONSTANT desk (each 1.5 s, 0.09 s apart, slowing at the end); they stop in the queue short of the post, three
    // threes long; as each three joins, those ahead move up (0.7 s) and the first three, at the post the longest, go
    // (0.5 s). The caret blinks. The time at the door stays --:--.
    thrice: function (svg) {
      var g = svg.querySelector('.th__over');
      if (!g) return null;
      var w = num(g, 'data-way'), dx = w[2] - w[0], dy = w[3] - w[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      var still = Array.prototype.slice.call(g.querySelectorAll('.th__w'));
      var caret = g.querySelector('.th__caret'), typed = g.querySelector('.th__type');
      var live = mk('g', { 'class': 'th__live' }, g);
      var POOL = 15, ds = [];
      for (var i = 0; i < POOL; i++) ds.push(mk('path', { 'class': 'th__d', d: 'M0 -7.5L5 0L0 7.5L-5 0Z' }, live));
      var P = 2.6, WALK = 1.5, GAP = 0.09, MOVE = 0.7, GO = 0.5, HEAD = 28, ROW = 66, STEP = 18;
      function spot(k, i) { var d = HEAD + ROW * k + STEP * i; return [w[2] - ux * d, w[3] - uy * d - 7.5]; }
      return {
        start: function () { still.forEach(function (e) { e.classList.add('is-gone'); }); live.classList.remove('is-gone'); caret.classList.add('is-on'); typed.classList.add('is-on'); },
        stop: function () { still.forEach(function (e) { e.classList.remove('is-gone'); }); live.classList.add('is-gone'); caret.classList.remove('is-on'); typed.classList.remove('is-on'); caret.style.opacity = ''; typed.style.strokeDashoffset = ''; },
        frame: function (t) {
          t += 2 * P + MOVE;                                // the queue is full from the first frame
          var used = {}, n1 = Math.floor(t / P), n0 = Math.max(0, Math.floor((t - GO) / P) - 3);
          for (var n = n0; n <= n1; n++) {
            var t0 = n * P, since = t - t0;
            for (var i = 0; i < 3; i++) {
              var el = ds[(n * 3 + i) % POOL], x, y, op = 1, lift = 0;
              used[(n * 3 + i) % POOL] = true;
              var c = Math.floor(since / P), tau = since - c * P;        // c: the threes that joined after this one
              if (c === 0) {
                var u = (since - i * GAP) / WALK, p = pace(u, 0.14 / WALK * 1.5), f = spot(2, i);
                x = w[0] + (f[0] - w[0]) * p; y = (w[1] - 7.5) + (f[1] - w[1] + 7.5) * p;
                if (u > 0 && u < 1) y -= Math.abs(Math.sin(u * WALK * Math.PI * 4)) * 1.1;   // the step
                if (u <= 0) op = 0;
              } else if (c <= 2) {
                var a = spot(3 - c, i), b = spot(2 - c, i), s2 = inout((tau - 0.3 - i * 0.05) / MOVE);
                x = a[0] + (b[0] - a[0]) * s2; y = a[1] + (b[1] - a[1]) * s2;
              } else {
                var e = spot(0, i), s3 = clamp(tau / GO, 0, 1);
                x = e[0]; y = e[1]; op = 1 - s3; lift = 4 * out3(s3);
              }
              at(el, x, y - lift);
              el.style.opacity = op.toFixed(3);
            }
          }
          ds.forEach(function (e, i) { if (!used[i]) e.style.opacity = '0'; });
          var ph = (t % P) / P;
          caret.style.opacity = (t % 1.0) < 0.55 ? '1' : '0';
          typed.style.strokeDashoffset = (ph < 0.31 ? 1 - out3(ph / 0.31) : ph < 0.92 ? 0 : 1).toFixed(3);
        }
      };
    },

    // Lintel: a day every 4.2 s (3.2 s of light, 1 s of night), a week round: the sun goes over the plot, east to
    // west, and the doorway's and the stakes' shadows turn on the ground; the night darkens the place a little; the
    // hours table shows the day that passes, every day --:--.
    lintel: function (svg) {
      var sky = svg.querySelector('.li__sky'), sh = svg.querySelector('.li__shadows');
      var ground = sh && sh.previousElementSibling;                // the plot's own face, painted just before its shadows
      var day = [247, 243, 234], dusk = [229, 223, 209];
      if (!sky || !sh) return null;
      var T = projector(svg), plane = +sky.getAttribute('data-plane');
      var boxes = sky.getAttribute('data-casters').split(';').map(function (b) { return b.split(' ').map(Number); });
      var paths = boxes.map(function () { return mk('path', { 'class': 'li__sh' }, sh); });
      var rows = $$('.li__hours tr');
      var DAY = 4.2, LIGHT = 3.2;
      return {
        start: function () { sh.classList.remove('is-gone'); },
        stop: function () { sh.classList.add('is-gone'); if (ground) ground.style.fill = ''; rows.forEach(function (r) { r.classList.remove('is-now'); }); },
        frame: function (t) {
          var d = Math.floor(t / DAY) % 7, h = t % DAY;
          rows.forEach(function (r, i) { r.classList.toggle('is-now', i === d); });
          var dark = h < LIGHT ? Math.max(0, 1 - h / 0.35, 1 - (LIGHT - h) / 0.35) : 1;
          if (ground) {
            var k2 = clamp(dark, 0, 1);
            ground.style.fill = 'rgb(' + day.map(function (v, i) { return Math.round(v + (dusk[i] - v) * k2); }).join(' ') + ')';
          }
          if (h >= LIGHT) { sh.style.opacity = '0'; return; }
          var u = h / LIGHT, az = (-35 + 250 * u) * Math.PI / 180, el = (10 + 38 * Math.sin(Math.PI * u)) * Math.PI / 180;
          var Lx = Math.cos(el) * Math.cos(az), Ly = Math.cos(el) * Math.sin(az), Lz = Math.sin(el);
          sh.style.opacity = (0.15 * clamp(Math.min(u / 0.12, (1 - u) / 0.12), 0, 1)).toFixed(3);
          boxes.forEach(function (b, i) {
            var pts = [];
            for (var a = 0; a < 8; a++) {
              var x = a & 1 ? b[3] : b[0], y = a & 2 ? b[4] : b[1], z = Math.max(plane, a & 4 ? b[5] : b[2]);
              var k = (z - plane) / Lz;
              pts.push(T(x - Lx * k, y - Ly * k, plane));
            }
            paths[i].setAttribute('d', poly(hull(pts)));
          });
        }
      };
    },

    // Fallow: four collectors work four furrows, each at its own pace (6.6 to 8 s a round): along the furrow to the
    // line, a stop at it (the line answers where it is touched), and back. Past the line, nothing.
    fallow: function (svg) {
      var T = projector(svg), touch = svg.querySelector('.fa__touch');
      if (!touch) return null;
      var X = +touch.getAttribute('data-line'), lanes = {};
      Array.prototype.forEach.call(svg.querySelectorAll('.fa__lane'), function (g) { lanes[g.getAttribute('data-y')] = g; });
      var spec = [[120, 7.2, 0.1], [300, 8.0, 0.55], [480, 6.6, 0.3], [660, 7.6, 0.8]], LEN = 70, WID = 34, HGT = 20;
      var cols = spec.map(function (c) {
        var g = mk('g', { 'class': 'fa__col' }, lanes[c[0]] || touch);
        return { y: c[0], per: c[1], ph: c[2], g: g,
                 top: mk('path', { 'class': 'fa__ct' }, g), left: mk('path', { 'class': 'fa__cl' }, g), right: mk('path', { 'class': 'fa__cr' }, g),
                 mast: mk('path', { 'class': 'fa__cm' }, g), lamp: mk('circle', { 'class': 'fa__lamp', r: 1.6 }, g),
                 mark: mk('path', { 'class': 'fa__mark', d: 'M' + T(X, c[0] - 26, 0).map(f1).join(' ') + 'L' + T(X, c[0] + 26, 0).map(f1).join(' ') }, touch) };
      });
      var x0 = 30, x1 = X - LEN - 5;
      return {
        start: function () { cols.forEach(function (c) { c.g.classList.remove('is-gone'); }); },
        stop: function () { cols.forEach(function (c) { c.g.classList.add('is-gone'); c.mark.style.opacity = '0'; }); },
        frame: function (t) {
          cols.forEach(function (c) {
            var u = ((t / c.per) + c.ph) % 1, x, hit = 0;
            if (u < 0.42) x = x0 + (x1 - x0) * inout(u / 0.42);
            else if (u < 0.5) { x = x1; hit = 1 - (u - 0.42) / 0.08; }
            else if (u < 0.92) x = x1 - (x1 - x0) * inout((u - 0.5) / 0.42);
            else x = x0;
            var y0 = c.y - WID / 2, y1 = c.y + WID / 2, z0 = 0, z1 = HGT, xa = x, xb = x + LEN;
            c.top.setAttribute('d', poly([T(xa, y0, z1), T(xb, y0, z1), T(xb, y1, z1), T(xa, y1, z1)]));
            c.left.setAttribute('d', poly([T(xa, y1, z0), T(xb, y1, z0), T(xb, y1, z1), T(xa, y1, z1)]));
            c.right.setAttribute('d', poly([T(xb, y0, z0), T(xb, y1, z0), T(xb, y1, z1), T(xb, y0, z1)]));
            var mx = xa + 14, my = c.y;
            c.mast.setAttribute('d', 'M' + T(mx, my, z1).map(f1).join(' ') + 'L' + T(mx, my, z1 + 18).map(f1).join(' '));
            var lp = T(mx, my, z1 + 19);
            c.lamp.setAttribute('cx', f1(lp[0])); c.lamp.setAttribute('cy', f1(lp[1]));
            c.lamp.style.opacity = ((t + c.ph * 3) % 0.9) < 0.3 ? '1' : '.25';
            c.mark.style.opacity = (hit > 0 ? 0.25 + 0.75 * hit : 0).toFixed(3);
          });
        }
      };
    }
  };

  function runner(scene, loop) {
    var row = document.createElement('p'), btn = document.createElement('button');
    row.className = 'rt__ctlrow'; btn.type = 'button'; btn.className = 'rt__ctl';
    row.appendChild(btn); scene.appendChild(row);
    var user = false, seen = false, hidden = document.hidden, running = false, t = 0, last = 0, raf = 0;
    function label() { btn.textContent = user ? 'Play' : 'Pause'; }
    function step(ts) {
      if (!running) return;
      if (last) t += Math.min(0.1, (ts - last) / 1000);
      last = ts;
      loop.frame(t);
      raf = requestAnimationFrame(step);
    }
    function sync() {
      var go = !user && seen && !hidden;
      if (go && !running) { running = true; last = 0; raf = requestAnimationFrame(step); }
      else if (!go && running) { running = false; cancelAnimationFrame(raf); }
      label();
    }
    btn.addEventListener('click', function () { user = !user; sync(); });
    loop.start();
    loop.frame(0);
    label();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.intersectionRatio >= 0.3) seen = true;
          else if (e.intersectionRatio < 0.1) seen = false;
        });
        sync();
      }, { threshold: [0, 0.1, 0.3] }).observe(scene.querySelector('svg') || scene);
    } else { seen = true; sync(); }
    document.addEventListener('visibilitychange', function () { hidden = document.hidden; sync(); });
    return { stop: function () { running = false; cancelAnimationFrame(raf); loop.stop(); row.remove(); } };
  }

  // Lintel: how early the reader's terminal is, from its own date
  function gap() {
    var target = new Date(2066, 10, 1), el = $('[data-gap]'), box = $('.li__gap');
    if (!el || !box) return;
    if (now >= target) { set(el, 'On time.'); box.hidden = false; return; }
    var y = target.getFullYear() - now.getFullYear(), d = new Date(now.getTime());
    d.setFullYear(now.getFullYear() + y);
    if (d > target) { y -= 1; d.setFullYear(now.getFullYear() + y); }
    var days = Math.round((target - d) / 864e5);
    set(el, y + (y === 1 ? ' year' : ' years') + ', ' + days + (days === 1 ? ' day' : ' days') + ' early.');
    box.hidden = false;
  }

  // the telegraphic address in Morse on the tape: a dot, a dash three dots long, letters three apart, words seven
  var CODE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-',
               L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-',
               W: '.--', X: '-..-', Y: '-.--', Z: '--..' };
  function morse() {
    var m = $('.tg__morse'); if (!m) return;
    var words = 'STANDOFFISH LONGYEARBYEN'.split(' ');
    words.forEach(function (w, wi) {
      if (wi) m.appendChild(el('w'));
      w.split('').forEach(function (ch, ci) {
        if (ci) m.appendChild(el('g'));
        CODE[ch].split('').forEach(function (c) { m.appendChild(el(c === '.' ? 'd' : 'h')); });
      });
    });
    function el(k) { var b = document.createElement('b'); b.className = k; return b; }
  }

  if (id === 'lintel') { set($('[data-today]'), iso); gap(); }
  if (LOOP[id]) {
    var scene = $('[data-scene]'), svg = scene && scene.querySelector('svg.rt__draw');
    if (!svg || reduce) return;                           // the drawing still, as written
    var loop = LOOP[id](svg);
    if (!loop) return;
    var run = runner(scene, loop);
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-reduced-motion: reduce)');
      var off = function () { if (mq.matches) run.stop(); };
      if (mq.addEventListener) mq.addEventListener('change', off); else if (mq.addListener) mq.addListener(off);
    }
    return;
  }

  var r = R[id] || {};
  var timed = $$('[data-at]').map(function (el) { return { el: el, at: +el.getAttribute('data-at') }; });
  var END = Math.max(r.end || 0, timed.reduce(function (m, x) { return Math.max(m, x.at); }, 0) + 0.1,
                     counts.reduce(function (m, c) { return Math.max(m, c.e); }, 0));
  function finish() {
    timed.forEach(function (x) { x.el.classList.add('on'); });
    tickCounts(1e9);
    if (r.final) r.final();
  }
  if (reduce) { if (r.init) r.init(); finish(); return; }
  // the event again, on request, once it is over: everything back to its start, then the same seconds
  var stage = $('.rt__stage'), again = null;
  function play() {
    if (again) again.classList.remove('is-on');
    timed.forEach(function (x) { x.el.classList.remove('on'); });
    void document.body.offsetWidth;                      // a fresh start for the transitions and animations
    if (r.init) r.init();
    tickCounts(0);
    var t0 = 0;
    function frame(ts) {
      if (!t0) t0 = ts;
      var t = (ts - t0) / 1000;
      timed.forEach(function (x) { if (t >= x.at) x.el.classList.add('on'); });
      tickCounts(t);
      if (r.tick) r.tick(t);
      if (t < END) requestAnimationFrame(frame);
      else { finish(); if (again) again.classList.add('is-on'); }
    }
    requestAnimationFrame(frame);
  }
  if (stage && (timed.length || r.tick)) {
    again = document.createElement('button');
    again.type = 'button'; again.className = 'rt__again'; again.setAttribute('aria-label', 'Again');
    again.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.6-3.7"/><path d="M13.2 2.2v3h-3"/></svg>';
    again.addEventListener('click', play);
    stage.appendChild(again);
  }
  play();
})();

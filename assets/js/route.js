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

  // ------------------------------------------------------------------ the 2090s (round 24c)
  // The page is whole at once, its text the final record. Hail and Thrice re-enact their process once, when the
  // drawing is in view (60 % of it for a quarter second); a control under it pauses, resumes and replays. It stops
  // at its end state if the drawing leaves the view or the page is hidden. Lintel and Fallow are still.
  function curve(d, n) {                              // a cubic "M x y C x y x y x y" at even lengths along it
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
  // an even pace, slowing to a stop over the last part (no overshoot): position 0..1 at time u 0..1
  function pace(u, slow) {
    u = clamp(u, 0, 1);
    var ud = 1 - slow, v = 1 / (ud + slow / 2);
    return u <= ud ? v * u : v * ud + v * (u - ud) - v * (u - ud) * (u - ud) / (2 * slow);
  }
  function at(el, x, y) { el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'); }

  var EV = {
    hail: function () {
      var tr = $('.hl__trail'), pk = $('.hl__pk');
      if (!tr || !pk) return null;
      var way = curve(tr.getAttribute('d'), 160);
      function put(f) { var q = way(f); at(pk, q[0], q[1]); }
      // 0.72 s along the way, the last 0.12 s slowing into the slot
      return { dur: 0.72, marks: [pk], reset: function () { put(0); }, frame: function (t) { put(pace(t / 0.72, 0.12 / 0.72)); },
               end: function () { put(1); } };
    },
    thrice: function () {
      var g = $('.th__over'), ws = $$('.th__w');
      if (!g || !ws.length) return null;
      var w = g.getAttribute('data-way').split(' ').map(Number), dx = w[2] - w[0], dy = w[3] - w[1], L = Math.hypot(dx, dy);
      var ux = dx / L, uy = dy / L;
      var M = ws.map(function (el) { var d = +el.getAttribute('data-d'); return { el: el, x1: w[2] - ux * d, y1: w[3] - uy * d - 7.5 }; });
      function put(i, p) { var m = M[i]; at(m.el, w[0] + (m.x1 - w[0]) * p, w[1] - 7.5 + (m.y1 - w[1] + 7.5) * p); }
      // each 0.62 s, 0.09 s apart, the last 0.14 s slowing; 0.8 s in all
      return { dur: 0.8, marks: ws,
               reset: function () { M.forEach(function (m, i) { put(i, 0); }); },
               frame: function (t) { M.forEach(function (m, i) { put(i, pace((t - i * 0.09) / 0.62, 0.14 / 0.62)); }); },
               end: function () { M.forEach(function (m, i) { put(i, 1); }); } };
    }
  };

  function player(scene, ev) {
    var row = document.createElement('p'), btn = document.createElement('button');
    row.className = 'rt__ctlrow'; btn.type = 'button'; btn.className = 'rt__ctl';
    row.appendChild(btn);
    var state = 'idle', acc = 0, t0 = 0, raf = 0, wait = 0, seen = false;
    function label(x) { btn.textContent = x; }
    function step(ts) {
      if (state !== 'play') return;
      var t = acc + (ts - t0) / 1000;
      if (t >= ev.dur) { done(); return; }
      ev.frame(t);
      raf = requestAnimationFrame(step);
    }
    function run() { state = 'play'; label('Pause'); raf = requestAnimationFrame(function (ts) { t0 = ts; step(ts); }); }
    function start() { acc = 0; ev.reset(); run(); }
    function done() { cancelAnimationFrame(raf); state = 'done'; ev.end(); label('Replay'); }
    function pause() { cancelAnimationFrame(raf); acc += (performance.now() - t0) / 1000; state = 'paused'; label('Resume'); }
    function replay() {
      state = 'fade';
      ev.marks.forEach(function (m) { m.classList.add('is-out'); });
      setTimeout(function () {
        ev.reset();
        ev.marks.forEach(function (m) { m.classList.remove('is-out'); });
        setTimeout(start, 80);
      }, 120);
    }
    btn.addEventListener('click', function () {
      if (state === 'play') pause(); else if (state === 'paused') run(); else if (state === 'done' || state === 'idle') replay();
    });
    ev.reset();
    label('Play');
    scene.appendChild(row);
    // once, when the drawing is in view; out of view or with the page hidden, it stops at its end
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var r = e.intersectionRatio;
          if (r >= 0.6 && !seen && !wait) wait = setTimeout(function () { wait = 0; if (!seen) { seen = true; start(); } }, 250);
          if (r < 0.6 && wait) { clearTimeout(wait); wait = 0; }
          if (r < 0.1 && state === 'play') done();
        });
      }, { threshold: [0, 0.1, 0.6] }).observe(scene.querySelector('svg') || scene);
    } else { seen = true; start(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden && state === 'play') done(); });
    return { stop: function () { if (wait) clearTimeout(wait); seen = true; if (state !== 'done') done(); row.remove(); } };
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

  if (id === 'lintel') { set($('[data-today]'), iso); gap(); return; }
  if (id === 'fallow') return;
  if (EV[id]) {
    var ev = EV[id](), scene = $('[data-scene]');
    if (!ev || !scene) return;
    if (reduce) return;                                   // the end state, as written
    var pl = player(scene, ev);
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-reduced-motion: reduce)');
      var off = function () { if (mq.matches) pl.stop(); };
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

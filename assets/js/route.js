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
    thrice: { end: 2.2, init: function () { set($('[data-eta]'), '20:00'); walk(0); },
      tick: function (t) {
        walk(t);
        var el = $('[data-eta]');
        if (t >= 1.7) { set(el, '––:––'); return; }
        var s = 1200 - Math.round(clamp((t - 0.35) / 1.25, 0, 1) * 29);
        set(el, pad(Math.floor(s / 60)) + ':' + pad(s % 60));
      },
      final: function () { set($('[data-eta]'), '––:––'); walk(1e9); } },

    lintel: { end: 1.6, init: function () { set($('[data-today]'), iso); }, final: function () {
      set($('[data-today]'), iso);
      var target = new Date(2066, 10, 1), el = $('[data-gap]'), box = $('.li__gap');
      if (!el || !box) return;
      if (now >= target) { set(el, 'On time.'); box.hidden = false; return; }
      var y = target.getFullYear() - now.getFullYear(), d = new Date(now.getTime());
      d.setFullYear(now.getFullYear() + y);
      if (d > target) { y -= 1; d.setFullYear(now.getFullYear() + y); }
      var days = Math.round((target - d) / 864e5);
      set(el, y + (y === 1 ? ' year' : ' years') + ', ' + days + (days === 1 ? ' day' : ' days') + ' early.');
      box.hidden = false;
    } },

    understudy: { end: 2.6, init: function () { set($('[data-us-eta]'), '00:19:00'); set($('[data-us-date]'), '30 June 2073'); },
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
        $$('.tg__strip').forEach(function (s) { s.setAttribute('data-full', s.textContent); s.textContent = ''; });
        morse();
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

  // Thrice: the three walk in along the painted line (y = k x + b in the drawing's units, from x0) to their places
  var W = null;
  function walk(t) {
    if (W === null) {
      var svg = $('.th__over'), ws = $$('.th__w');
      if (!svg || !ws.length) { W = []; return; }
      var L = svg.getAttribute('data-line').split(' ').map(Number);
      W = ws.map(function (g) {
        var m = /translate\(([-\d.]+) /.exec(g.getAttribute('transform'));
        return { g: g, x1: +m[1], k: L[0], b: L[1], x0: L[2] };
      });
    }
    W.forEach(function (w, i) {
      var p = ease((t - 0.35 - i * 0.12) / 1.1);
      var x = w.x0 + (w.x1 - w.x0) * p;
      w.g.setAttribute('transform', 'translate(' + x.toFixed(0) + ' ' + (w.k * x + w.b - 300).toFixed(0) + ')');
      w.g.style.opacity = t < 0.3 + i * 0.12 ? '0' : '1';
    });
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
  if (r.init) r.init();
  tickCounts(0);
  var t0 = 0;
  function frame(ts) {
    if (!t0) t0 = ts;
    var t = (ts - t0) / 1000;
    timed.forEach(function (x) { if (t >= x.at) x.el.classList.add('on'); });
    tickCounts(t);
    if (r.tick) r.tick(t);
    if (t < END) requestAnimationFrame(frame); else finish();
  }
  requestAnimationFrame(frame);
})();

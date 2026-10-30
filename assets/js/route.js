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
    // the 2090s: the page is whole at once; one thing moves, from a quarter second, and is still within a second and a
    // quarter (round 24b)
    hail: { end: 1.45, init: function () { hail(0); }, tick: function (t) { hail(t); }, final: function () { hail(1e9); } },

    thrice: { end: 1.2, init: function () { set($('[data-eta]'), '20:00'); walk(0); },
      tick: function (t) {
        walk(t);
        var el = $('[data-eta]');
        if (t >= 1.07) { set(el, '––:––'); return; }
        var s = 1200 - Math.round(clamp((t - 0.25) / 0.82, 0, 1) * 29);
        set(el, pad(Math.floor(s / 60)) + ':' + pad(s % 60));
      },
      final: function () { set($('[data-eta]'), '––:––'); walk(1e9); } },

    lintel: { end: 0.8, init: function () { set($('[data-today]'), iso); gap(); }, final: function () { set($('[data-today]'), iso); gap(); } },

    fallow: { end: 1.1, init: function () { fallow(0); }, tick: function (t) { fallow(t); }, final: function () { fallow(1e9); } },

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

  // a cubic way "M x y C x y x y x y" as points at even lengths along it (for a thing that keeps its pace)
  function curve(d, n) {
    var v = d.match(/-?[\d.]+/g).map(Number), P = [], acc = [0];
    for (var i = 0; i <= n; i++) {
      var u = i / n, a = (1 - u) * (1 - u) * (1 - u), b = 3 * u * (1 - u) * (1 - u), c = 3 * u * u * (1 - u), e = u * u * u;
      P.push([a * v[0] + b * v[2] + c * v[4] + e * v[6], a * v[1] + b * v[3] + c * v[5] + e * v[7]]);
      if (i) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    }
    return function (f) {                                   // the point at the fraction f of the way's length
      var L = acc[n] * clamp(f, 0, 1), i = 1;
      while (i < n && acc[i] < L) i++;
      var w = (L - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1);
      return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * w, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * w];
    };
  }

  // Hail: the card leaves the reader's terminal at a quarter second, is at the relay 0.7 s later, settles in its bay
  // (0.12 s), and the bay answers once (0.24 s); the way it came stays drawn
  var HL = null;
  function hail(t) {
    if (HL === null) {
      var tr = $('.hl__trail'), pk = $('.hl__pk'), svg = $('.hl__over');
      if (!tr || !pk || !svg) { HL = false; return; }
      var vb = svg.getAttribute('viewBox').split(' ').map(Number);
      HL = { tr: tr, pk: pk, at: curve(tr.getAttribute('d'), 120), w: vb[2], h: vb[3], ring: $('.hl__ring') };
    }
    if (!HL) return;
    var f = clamp((t - 0.25) / 0.7, 0, 1);
    f = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;                 // out of the terminal, into the bay
    var q = HL.at(f);
    HL.pk.style.left = (q[0] / HL.w * 100).toFixed(3) + '%';
    HL.pk.style.top = (q[1] / HL.h * 100).toFixed(3) + '%';
    HL.tr.style.strokeDashoffset = (1 - f).toFixed(4);
    var s = t < 0.95 ? 1 : t < 1.07 ? 1.18 - 0.18 * ease((t - 0.95) / 0.12) : 1;
    HL.pk.style.transform = s === 1 ? '' : 'scale(' + s.toFixed(3) + ')';
    if (HL.ring) HL.ring.classList.toggle('on', t >= 1.07 && t < 1e8);
  }

  // Thrice: the three walk in along the way (y = k x + b in the drawing's units, from x0), each 0.64 s, 0.09 s apart,
  // at an even pace and then slowing over the last 0.14 s; they stop short of its end
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
    var ud = 0.5 / 0.64, v = 1 / (ud + (1 - ud) / 2);
    W.forEach(function (w, i) {
      var u = clamp((t - 0.25 - i * 0.09) / 0.64, 0, 1);
      var p = u <= ud ? v * u : v * ud + v * (u - ud) - v * (u - ud) * (u - ud) / (2 * (1 - ud));
      var x = w.x0 + (w.x1 - w.x0) * clamp(p, 0, 1);
      w.g.setAttribute('transform', 'translate(' + x.toFixed(0) + ' ' + (w.k * x + w.b - 140).toFixed(0) + ')');
    });
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

  // Fallow: collection runs along the furrows to the line in 0.75 s and stops there; then there are no collectors
  var FA = null;
  function fallow(t) {
    if (FA === null) {
      var svg = $('.fa__over'), fr = $('.fa__front');
      if (!svg || !fr) { FA = false; return; }
      FA = { fr: fr, a: svg.getAttribute('data-from').split(' ').map(Number), b: svg.getAttribute('data-to').split(' ').map(Number),
             n: $('[data-fa-count]') };
    }
    if (!FA) return;
    var f = clamp((t - 0.25) / 0.75, 0, 1), on = t < 1.0;
    f = f * f * (1.6 - 0.6 * f);                             // gathering pace; it stops at the line, not before it
    var p = FA.a.map(function (a, i) { return (a + (FA.b[i] - a) * f).toFixed(0); });
    FA.fr.setAttribute('d', 'M' + p[0] + ' ' + p[1] + 'L' + p[2] + ' ' + p[3]);
    FA.fr.classList.toggle('run', on);
    set(FA.n, on ? '12' : '0');
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
  // the event again, on request, once it is over: everything back to its start, then the same seconds
  var stage = $('[data-scene]') || $('.rt__stage'), again = null;
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

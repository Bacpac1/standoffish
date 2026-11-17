/* The circle, at work (round 40, 2026-11-17). On the home each card of the Register's circle carries a stage, and on it
   the page the card leads to does its work by itself: a record is read code by code, a receiver chooses the place of
   receipt, a page is delivered and its count stays struck, the Terms are leafed through, the year's light passes over
   the seat, the open roles come up. Every string is the linked page's own (src/live.py prints them; this file writes none).
   A stage runs only while it is in view, the page is in front, and Hold is up; with reduced motion nothing runs and the
   first state stands (the seat's year is drawn whole). It requests nothing and stores nothing. Styles go through the CSSOM. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-insts]');
  if (!sec || !('IntersectionObserver' in window) || !window.matchMedia) return;
  var slice = function (l) { return Array.prototype.slice.call(l); };
  var still = matchMedia('(prefers-reduced-motion: reduce)');
  var hold = sec.querySelector('.inst__hold'), held = false;
  var data = function (el, k) { try { return JSON.parse(el.getAttribute(k)); } catch (e) { return null; } };
  var land = function (el, cls) {                              // (re)start an element's landing
    cls = cls || 'land';
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  };
  var put = function (el, text, cls) { el.textContent = text; land(el, cls); };

  var MAKE = {
    /* a record, read: each code of the coded line lit in turn; under it the field, the reading and the rule */
    read: function (el) {
      var S = data(el, 'data-steps'), all = slice(el.querySelectorAll('.ird__tok'));
      if (!S) return null;
      var toks = S.map(function (st) { return all.filter(function (t) { return t.getAttribute('data-c') === st.c; })[0]; });
      if (toks.some(function (t) { return !t; })) return null;
      var f = el.querySelector('.ird__f'), v = el.querySelector('.ird__v'), r = el.querySelector('.ird__r');
      var i = parseInt(el.getAttribute('data-at'), 10) || 0;
      return { wait: 1700, step: function () {
        toks[i].classList.remove('is-on');
        i = (i + 1) % S.length;
        toks[i].classList.add('is-on');
        put(f, S[i].f); put(v, S[i].v, 'land-2'); put(r, S[i].r, 'land-3');
        return 2500;
      } };
    },

    /* the place of receipt: a receiver's pointer goes to the next of the four, presses it, and that place's notice stands */
    jur: function (el) {
      var S = data(el, 'data-steps'), tabs = slice(el.querySelectorAll('.ijr__tab'));
      if (!S || tabs.length !== S.length) return null;
      var a = el.querySelector('.ijr__a'), k2 = el.querySelector('.ijr__k2'), b = el.querySelector('.ijr__b');
      var cur = el.querySelector('.ijr__cur'), i = 0, ph = 0;
      var at = function (x, y, now) {
        if (now) cur.style.transition = 'none';
        cur.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
        if (now) { void cur.offsetWidth; cur.style.transition = ''; }
      };
      var rest = function (now) {                              // off the text: beside the four places, or out of sight on a narrow stage
        var w = el.clientWidth;
        if (w < 430) { cur.style.opacity = '0'; return; }
        cur.style.opacity = '1'; at(w - 112, 30, now);
      };
      rest(true);
      return { wait: 2100, resize: function () { if (ph === 0) rest(true); }, step: function () {
        if (ph === 0) {                                        // to the next tab
          var t = tabs[(i + 1) % S.length], box = el.getBoundingClientRect(), tb = t.getBoundingClientRect();
          if (el.clientWidth < 430) at(tb.left - box.left + tb.width / 2 + 52, tb.top - box.top - 8, true);   // in from beside the row
          cur.style.opacity = '1';
          at(tb.left - box.left + tb.width / 2, tb.top - box.top + tb.height / 2 + 2);
          ph = 1; return 700;
        }
        if (ph === 1) {                                        // pressed: the panel changes
          cur.classList.add('is-down');
          tabs[i].classList.remove('is-on');
          i = (i + 1) % S.length;
          tabs[i].classList.add('is-on');
          put(a, S[i].a); put(k2, S[i].k, 'land-2'); put(b, S[i].b, 'land-3');
          ph = 2; return 170;
        }
        if (ph === 2) { cur.classList.remove('is-down'); ph = 3; return 520; }
        rest(); ph = 0; return 2500;
      } };
    },

    /* one way: the page crosses and is delivered; where the visit would be counted, the three dashes are entered */
    one: function (el) {
      var chip = el.querySelector('.ion__chip'), to = el.querySelector('.ion__to'), say = el.querySelector('.ion__say');
      var fig = el.querySelector('.ion__fig'), dash = fig.textContent, ph = 0, n = 0;
      return { wait: 900, step: function () {
        if (ph === 0) {                                        // sent
          chip.classList.remove('is-in'); to.classList.remove('is-got'); fig.classList.remove('is-snap');
          void chip.offsetWidth; chip.classList.add('is-go'); fig.classList.add('is-spin');
          ph = 1; return 2300;
        }
        if (ph === 1) {                                        // delivered
          chip.classList.remove('is-go'); chip.classList.add('is-in'); to.classList.add('is-got'); land(say);
          ph = 2; n = 0; return 650;
        }
        if (ph === 2) {                                        // the entry, a dash at a time
          fig.classList.remove('is-spin'); n++;
          fig.textContent = dash.slice(0, n);
          if (n < dash.length) return 190;
          land(fig, 'is-snap'); ph = 0; return 3600;
        }
        return 1000;
      } };
    },

    /* the Terms, leafed through */
    terms: function (el) {
      var S = data(el, 'data-steps'), ticks = slice(el.querySelectorAll('.itm__tk'));
      if (!S) return null;
      var num = el.querySelector('.itm__n'), t = el.querySelector('.itm__t'), i = 0;
      return { wait: 2300, step: function () {
        i = (i + 1) % S.length;
        put(num, S[i][0], 'roll'); put(t, S[i][1], 'land-2');
        ticks.forEach(function (k, j) { k.classList.toggle('is-on', j <= i); });
        return i === S.length - 1 ? 3200 : 2100;
      } };
    },

    /* a figure of a page's own entries (round 45): its entries taken in turn. The mark of the one taken is lit (the
       element whose data-i is the step's i, or the step's place in the list), what is written of it stands in the
       slots (data-out names the step's field), and --at carries its place for what moves (the step's at, or its
       number). Where the round begins again, what moves is put back out of sight (is-wrap), never run backward. */
    pick: function (el) {
      var S = data(el, 'data-steps'), items = slice(el.querySelectorAll('[data-i]')), outs = slice(el.querySelectorAll('[data-out]'));
      if (!S || !S.length) return null;
      var i = parseInt(el.getAttribute('data-at'), 10) || 0;
      var show = function (first) {
        var st = S[i], id = String(st.i != null ? st.i : i);
        items.forEach(function (t) { t.classList.toggle('is-on', t.getAttribute('data-i') === id); });
        if (!first) outs.forEach(function (o, k) { put(o, st[o.getAttribute('data-out')], k ? (k === 1 ? 'land-2' : 'land-3') : 'land'); });
        if (i === 0 && !first) { el.classList.add('is-wrap'); el.style.setProperty('--at', st.at != null ? st.at : i); void el.offsetWidth; el.classList.remove('is-wrap'); }
        else el.style.setProperty('--at', st.at != null ? st.at : i);
      };
      show(true);
      return { wait: 2200, step: function () { i = (i + 1) % S.length; show(false); return 2600; } };
    },

    /* the seat: the year's light. Across, the days of the year; down, the hours of the day at Longyearbyen (UTC+1). */
    visit: function (el) {
      var cv = el.querySelector('.ivs__c'), ctx = cv.getContext && cv.getContext('2d');
      if (!ctx) return null;
      var year = parseInt(el.getAttribute('data-year'), 10) || 2095, marks = data(el, 'data-marks') || [];
      var dEl = el.querySelector('.ivs__d'), flag = el.querySelector('.ivs__flag');
      var rad = Math.PI / 180, LAT = 78.2232, LON = 15.6267, DAYS = 365, ROWS = 96, SWEEP = 9000, REST = 2600;
      var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      var sunAt = function (ms) {
        var n = ms / 864e5 + 2440587.5 - 2451545.0;
        var L = (280.46 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * rad;
        var lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, eps = (23.439 - 4e-7 * n) * rad;
        var dec = Math.asin(Math.sin(eps) * Math.sin(lam)), ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
        var ha = ((280.46061837 + 360.98564736629 * n) % 360 + LON) * rad - ra;
        return Math.asin(Math.sin(LAT * rad) * Math.sin(dec) + Math.cos(LAT * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
      };
      var css = getComputedStyle(el), rgb = function (name) {
        var h = css.getPropertyValue(name).trim().replace('#', '');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      };
      var C = [rgb('--yl-night'), rgb('--yl-astro'), rgb('--yl-naut'), rgb('--yl-civil'), rgb('--yl-day')];
      if (C.some(function (c) { return c.some(isNaN); })) return null;
      var map = document.createElement('canvas'); map.width = DAYS; map.height = ROWS;       // the year, a point a day and quarter-hour
      (function () {
        var m = map.getContext('2d'), im = m.createImageData(DAYS, ROWS), t0 = Date.UTC(year, 0, 1) - 36e5;
        for (var d = 0; d < DAYS; d++) for (var q = 0; q < ROWS; q++) {
          var e = sunAt(t0 + d * 864e5 + (q + 0.5) * 9e5), c = C[e < -18 ? 0 : e < -12 ? 1 : e < -6 ? 2 : e < -0.833 ? 3 : 4], o = (q * DAYS + d) * 4;
          im.data[o] = c[0]; im.data[o + 1] = c[1]; im.data[o + 2] = c[2]; im.data[o + 3] = 255;
        }
        m.putImageData(im, 0, 0);
      })();
      var W = 0, H = 0, dpr = 1, p = 0, last = 0, resting = 0;
      var size = function () {
        dpr = Math.min(window.devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight;
        if (!W || !H) return;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      };
      var date = function (d) { var t = new Date(Date.UTC(year, 0, 1 + d)); return t.getUTCDate() + ' ' + MON[t.getUTCMonth()]; };
      var draw = function (whole) {
        if (!W) size();
        if (!W) return;
        var w = cv.width, h = cv.height, x = whole ? w : Math.round(w * p);
        ctx.imageSmoothingEnabled = true;
        ctx.globalAlpha = 1; ctx.fillStyle = 'rgb(' + C[0].join(',') + ')'; ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 0.3; ctx.drawImage(map, 0, 0, w, h);                              // the year ahead, faint
        ctx.globalAlpha = 1;
        if (x > 0) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, h); ctx.clip(); ctx.drawImage(map, 0, 0, w, h); ctx.restore(); }
        if (whole) { dEl.textContent = ''; flag.classList.remove('is-up'); return; }
        ctx.fillStyle = '#fff'; ctx.fillRect(Math.min(x, w - 2 * dpr), 0, 2 * dpr, h);
        var day = Math.min(DAYS - 1, Math.floor(p * DAYS)), cx = x / dpr;
        dEl.textContent = date(day);
        var dw = dEl.offsetWidth, left = cx + 10 + dw > W - 8 ? cx - 10 - dw : cx + 10;
        dEl.style.transform = 'translateX(' + Math.round(left - 18) + 'px)';
        var m = null;                                                                        // the last day of change passed, for a moment
        for (var k = 0; k < marks.length; k++) if (day >= marks[k][0] && day < marks[k][0] + 26) m = marks[k];
        if (m) {
          flag.textContent = m[1];
          var fx = Math.max(flag.offsetWidth / 2 + 6, Math.min(W - flag.offsetWidth / 2 - 6, (m[0] + 0.5) / DAYS * W));
          flag.style.left = Math.round(fx) + 'px'; flag.classList.add('is-up');
        } else flag.classList.remove('is-up');
      };
      size(); draw(true);
      return { wait: 500, still: function () { size(); draw(true); }, resize: function () { size(); draw(still.matches || held || p === 0); },
        step: function () {
          var now = Date.now();
          if (resting) { if (now < resting) return 200; resting = 0; p = 0; last = now; }
          if (!last || now - last > 400) last = now - 33;                                    // back in view: go on from where it stood
          p = Math.min(1, p + (now - last) / SWEEP); last = now;
          draw(false);
          if (p >= 1) { resting = now + REST; flag.classList.remove('is-up'); return 200; }
          return 33;
        } };
    },

    /* the open roles come up, the newest on top */
    jobs: function (el) {
      var S = data(el, 'data-steps'), box = el.querySelector('.ijb__rows');
      if (!S || !box) return null;
      var rows = slice(box.querySelectorAll('.ijb__row')), next = rows.length % S.length, KEEP = parseInt(el.getAttribute('data-rows'), 10) || 3;
      var seat = function () { rows.forEach(function (r, j) { r.style.setProperty('--i', j); }); };
      var row = function (j) {
        var r = document.createElement('span'); r.className = 'ijb__row is-new';
        [['ijb__t', 0], ['ijb__p', 1], ['ijb__n', 2]].forEach(function (c) {
          var s = document.createElement('span'); s.className = c[0]; s.textContent = S[j][c[1]]; r.appendChild(s);
        });
        return r;
      };
      seat();
      return { wait: 2000, step: function () {
        var r = row(next); next = (next + 1) % S.length;
        r.style.setProperty('--i', 0);
        box.insertBefore(r, box.firstChild); rows.unshift(r);
        void r.offsetWidth; r.classList.remove('is-new');
        seat();
        if (rows.length > KEEP + 1) { var old = rows.pop(); if (old.parentNode) old.parentNode.removeChild(old); }
        if (rows.length > KEEP) rows[KEEP].classList.add('is-old');
        return 2400;
      } };
    }
  };

  var list = [];
  slice(sec.querySelectorAll('[data-inst]')).forEach(function (el) {
    var mk = MAKE[el.getAttribute('data-inst')], o = null;
    try { o = mk && mk(el); } catch (e) { o = null; }
    if (o) { o.el = el; o.seen = false; o.t = 0; list.push(o); }
  });
  if (!list.length) return;
  sec.classList.add('is-live');

  var can = function (o) { return o.seen && !held && !document.hidden && !still.matches; };
  var tick = function (o) {
    o.t = 0;
    if (!can(o)) return;
    var w = 2000;
    try { w = o.step(); } catch (e) { return; }
    o.t = setTimeout(function () { tick(o); }, w);
  };
  var sync = function () {
    list.forEach(function (o) {
      if (can(o)) { if (!o.t) o.t = setTimeout(function () { tick(o); }, o.wait); }
      else if (o.t) { clearTimeout(o.t); o.t = 0; }
    });
  };

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      for (var k = 0; k < list.length; k++) if (list[k].el === e.target) list[k].seen = e.isIntersecting;
    });
    sync();
  }, { threshold: 0.35 });
  list.forEach(function (o) { io.observe(o.el); });
  var once = new IntersectionObserver(function (es) {            // the cards come up, once
    if (es.some(function (e) { return e.isIntersecting; })) { sec.classList.add('is-seen'); once.disconnect(); }
  }, { threshold: 0.04 });
  once.observe(sec);

  document.addEventListener('visibilitychange', sync);
  var motion = function () {
    if (hold) hold.hidden = still.matches;
    if (still.matches) list.forEach(function (o) { if (o.still) o.still(); });
    sync();
  };
  if (still.addEventListener) still.addEventListener('change', motion); else if (still.addListener) still.addListener(motion);
  motion();
  if (hold) hold.addEventListener('click', function () {
    held = !held;
    hold.setAttribute('aria-pressed', held ? 'true' : 'false');
    hold.textContent = held ? 'Run' : 'Hold';
    sync();
  });
  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { list.forEach(function (o) { if (o.resize) o.resize(); }); }, 150);
  });
})();

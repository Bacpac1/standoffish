/* The house's script (its light is kept by light.js, in the head). It requests nothing from anyone, stores nothing and reads nothing back; the pages are
   whole without it.
   1. (Retired in round 24, 2026-10-30: the house's pictures are drawings now, and they stand still.)
   2. The seat. The time in Longyearbyen, and whether the sun rises there today.
   3. The desks. Find a desk: the atlas's views as tabs with their counts, a search and a filter by service over the
      map, its list and the directory; a desk opens beside the map; Earth zooms and pans. Whole without it.
   4. The carriers. Each node of the network's drawing gives its card and lights what it works with; the day of link
      windows marks the hour in TCB.
   5. The slip. On /reply/, the desk's stamp is set down on the lodging slip as the page reaches it.
   6. The year's light. On /visit/, the reader's today and now on the year of light at the seat; any day read out.
   7. The statement. One year for every card of the annual statement, chosen above or under the pointer.
   8. The clock. On /service-standards/, the clock runs once across its six weeks as the page reaches it.
   9. The mark at a size. On /mark/, the class mark at any size on four grounds, with its clear space and contrast.
   10. The home's map. Each desk is a link to its entry in Find a desk; under the pointer or the focus, its name.
   11. The drawings' loops. Replies, Certification and Records, each the place's own work going round (round 24e).
   12. The map's day. The home's map keeps a day of the reader's date: the night side going over the desks. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  /* ------------------------------------------------------------------------------------------- 2. the seat */
  var seats = Array.prototype.slice.call(document.querySelectorAll('[data-seat-now]'));
  if (seats.length && window.Intl) {
    var LAT = 78.2232, LON = 15.6267, rad = Math.PI / 180, fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Arctic/Longyearbyen', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }
    catch (e) { try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); } catch (e2) { fmt = null; } }
    var sunAt = function (d) {                    // the sun's elevation, in degrees, at Longyearbyen at the moment d
      var jd = d.getTime() / 864e5 + 2440587.5, n = jd - 2451545.0;
      var L = (280.46 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * rad;
      var lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, eps = (23.439 - 4e-7 * n) * rad;
      var dec = Math.asin(Math.sin(eps) * Math.sin(lam));
      var ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
      var gmst = (280.46061837 + 360.98564736629 * n) % 360;
      var ha = ((gmst + LON) * rad - ra);
      return Math.asin(Math.sin(LAT * rad) * Math.sin(dec) + Math.cos(LAT * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
    };
    var state = function (now) {
      var hi = -90, lo = 90;
      for (var k = 0; k < 48; k++) { var e = sunAt(new Date(now.getTime() + (k - 24) * 18e5)); hi = Math.max(hi, e); lo = Math.min(lo, e); }
      if (hi < -0.833) return 'Polar night';
      if (lo > -0.833) return 'Midnight sun';
      return sunAt(now) > -0.833 ? 'Daylight' : 'Dark';
    };
    var show = function () {
      var now = new Date(), st = state(now), hm = fmt ? fmt.format(now) : '';
      var line = 'Longyearbyen ' + hm + ' · ' + st;
      seats.forEach(function (seat) {                // a line, the line with the place, the clock alone, the sun alone
        var m = seat.getAttribute('data-seat-now');
        seat.textContent = m === 'time' ? line : m === 'clock' ? (hm || seat.textContent) : m === 'sun' ? st
                         : '78°13′N 15°38′E · ' + line;
        seat.hidden = false;
      });
      setTimeout(show, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    };
    show();
  }

  /* ------------------------------------------------------------------------------------------- 3. the desks */
  var slice = function (l) { return Array.prototype.slice.call(l); };
  var atlas = document.querySelector('[data-atlas]');
  if (atlas) (function () {
    /* Find a desk. The atlas's three views become tabs above the map, each with its count; the search (a town, a
       place, a country or a code) and the filter by service narrow the map, the list beside it and the directory
       below, together. A marker or a row opens its desk beside the map, copied from the desk's own entry in the
       directory. Earth zooms by continent, by + and -, by a double click, a pinch, or the wheel with Ctrl or Cmd,
       and pans by dragging; the list then holds the desks in view. On the markers the arrow keys travel: left and
       right go west and east, up and down north and south. Escape goes back. Under reduced motion nothing travels. */
    atlas.classList.add('is-live');
    var $ = function (s, r) { return (r || atlas).querySelector(s); };
    var $$ = function (s, r) { return slice((r || atlas).querySelectorAll(s)); };
    var stage = $('[data-atlas-stage]'), panel = $('[data-atlas-panel]'), list = $('[data-atlas-list]');
    var lk = $('[data-atlas-lk]'), also = $('[data-atlas-also]'), rowsEl = $('[data-atlas-rows]'), detail = $('[data-atlas-detail]');
    var tip = $('[data-atlas-tip]'), input = $('[data-atlas-q]'), seg = $('.atlas__tabs'), tabs = $$('[role="tab"]');
    var views = $$('[data-view]'), marks = $$('.dm'), fbtns = $$('[data-desk-filter] button');
    var zoomBar = $('[data-atlas-zoom]'), zbtns = $$('button', zoomBar), zc = $('[data-atlas-zc]'), zcb = $$('button', zc);
    var nav = document.querySelector('.dindex'), count = document.querySelector('[data-desk-count]');
    var groups = slice(document.querySelectorAll('[data-group], .dcont, .dregion'));
    var earthFig = $('[data-view="earth"]'), earth = $('svg', earthFig);
    var lo = $('.atlas__land--lo', earth), hi = $('.atlas__land--hi', earth);
    var FULL = earth.getAttribute('viewBox').split(/[ ,]+/).map(parseFloat), W = FULL[2], H = FULL[3], WMIN = W / 8;
    var coarse = window.matchMedia ? matchMedia('(pointer: coarse)') : { matches: false };
    var pxW = 1000, sT = 1;                        // the map's width on screen; a marker's unit in pixels
    var zooms = {}; try { zooms = JSON.parse(earthFig.getAttribute('data-zooms')) || {}; } catch (e) {}
    var CONT = { europe: 'Europe', africa: 'Africa', asia: 'Asia', oceania: 'Oceania', 'the-americas': 'the Americas' };
    var WHERE = { earth: 'on Earth', 'earth-orbit': 'in Earth orbit', mars: 'at Mars' };
    var narrow = window.matchMedia ? matchMedia('(max-width: 999px)') : { matches: false };
    var smooth = function () { return mq.matches ? 'auto' : 'smooth'; };
    var norm = function (t) {                      // Tromso finds Tromsø, Sao Paulo São Paulo, Reykjavik Reykjavík
      t = String(t || '').toLowerCase().replace(/\u00f8/g, 'o').replace(/\u00e6/g, 'ae').replace(/\u0153/g, 'oe')
        .replace(/\u00f0/g, 'd').replace(/\u00fe/g, 'th').replace(/\u00df/g, 'ss');
      return t.normalize ? t.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : t;
    };
    var keyed = function (el) { try { return el.matches(':focus-visible'); } catch (e) { return true; } };
    var split = function (t) { return norm(t).split(/[\s,;\/\u00b7]+/).filter(Boolean); };

    /* the desks: each marker with its entry in the directory, and a row for the list */
    var D = {}, order = [];
    slice(document.querySelectorAll('.dlist .desk[id]')).forEach(function (li) {
      var m = $('.dm[data-desk="' + li.id + '"]'); if (!m) return;
      var g = $('.dm__at', m), xy = (g.getAttribute('transform').match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/) || [0, 0, 0]);
      var grp = li.closest('[data-group]'), gh = grp && grp.querySelector('.dgroup__h'), sub = li.querySelector('.desk__sub');
      var d = { id: li.id, li: li, mark: m, at: g, base: g.getAttribute('transform'), x: +xy[1], y: +xy[2],
        view: m.closest('[data-view]').getAttribute('data-view'), c: m.getAttribute('data-c') || '',
        kind: (li.className.match(/desk--(\w+)/) || ['', ''])[1], town: li.querySelector('.desk__town').textContent.trim(),
        label: li.querySelector('.desk__kind').textContent.trim(), place: gh ? gh.textContent.trim() : sub ? sub.textContent.trim() : '',
        f: ' ' + (li.getAttribute('data-f') || '') + ' ', q: norm(li.getAttribute('data-q')), on: true };
      D[d.id] = d; order.push(d);
    });
    order.forEach(function (d) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.className = 'arow';
      var mk = document.createElement('i'); mk.className = 'arow__mk arow__mk--' + d.kind; mk.setAttribute('aria-hidden', 'true');
      var t = document.createElement('span'); t.className = 'arow__t'; t.textContent = d.town;
      var s = document.createElement('span'); s.className = 'arow__s'; s.textContent = d.label + (d.place ? ' · ' + d.place : '');
      b.appendChild(mk); b.appendChild(t); b.appendChild(s);
      b.addEventListener('click', function () { go(d.id, { from: b, fly: true }); });
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hot(d.id); });
      b.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hot(null); });
      b.addEventListener('focus', function () { if (keyed(b)) hot(d.id); });
      b.addEventListener('blur', function () { hot(null); });
      li.appendChild(b); rowsEl.appendChild(li); d.row = li; d.btn = b;
      var on = document.createElement('button'); on.type = 'button'; on.className = 'desk__map'; on.textContent = 'On the map';
      on.addEventListener('click', function () {                   // from the directory to the map, and back with Escape
        atlas.scrollIntoView({ behavior: smooth(), block: 'start' });
        go(d.id, { from: on, fly: true });
      });
      d.li.appendChild(on);
    });

    /* what shows: the view, the search, the filter; on Earth, the continent or the part in view */
    var cur = 'earth', sel = null, filt = 'all', words = [], area = 'all', vb = FULL.slice(), anim = 0, origin = null, rv = {};
    var ok = function (d) {
      if (filt !== 'all' && d.f.indexOf(' ' + filt + ' ') < 0) return false;
      for (var i = 0; i < words.length; i++) if (d.q.indexOf(words[i]) < 0) return false;
      return true;
    };
    var inside = function (d) { return d.x >= vb[0] && d.x <= vb[0] + vb[2] && d.y >= vb[1] && d.y <= vb[1] + vb[3]; };
    var inArea = function (d) { return d.view !== 'earth' || words.length > 0 || area === 'all' || (area === 'view' ? inside(d) : d.c === area); };
    var where = function () {
      if (cur !== 'earth' || words.length || area === 'all') return WHERE[cur];
      return area === 'view' ? 'in view' : 'in ' + CONT[area];
    };
    var narrowed = function () { return filt !== 'all' || words.length > 0; };
    function refresh() {
      var per = { earth: 0, 'earth-orbit': 0, mars: 0 }, total = 0, shown = 0;
      var moved = false;                           // the page below changes only when the search or the filter does
      order.forEach(function (d) {
        var on = ok(d); if (on) { per[d.view]++; total++; }
        if (on !== d.on || d.li.hidden === on) { d.on = on; d.mark.classList.toggle('is-off', !on); d.li.hidden = !on; moved = true; }
        var vis = !!(on && d.view === cur && inArea(d));
        if (d.row.hidden === vis) d.row.hidden = !vis;
        if (vis) shown++;
      });
      if (moved) groups.forEach(function (g) { var h = !g.querySelector('.desk:not([hidden])'); if (g.hidden !== h) g.hidden = h; });
      tabs.forEach(function (t) { $('[data-count]', t).textContent = per[t.getAttribute('data-tab')]; });
      lk.textContent = shown + (shown === 1 ? ' desk ' : ' desks ') + where();
      also.textContent = '';
      if (narrowed() && !total) {
        var p = document.createElement('p'); p.textContent = 'Try a town, a country or a code, such as SIN.'; also.appendChild(p);
      } else if (narrowed()) tabs.forEach(function (t) {
        var v = t.getAttribute('data-tab'); if (v === cur || !per[v]) return;
        var b = document.createElement('button'); b.type = 'button'; b.textContent = per[v] + ' ' + WHERE[v];
        b.addEventListener('click', function () { tab(v); var r = rowsEl.querySelector('li:not([hidden]) .arow'); if (r) r.focus(); });
        also.appendChild(b);
      });
      also.hidden = !also.firstChild;
      count.textContent = '';
      var n = document.createElement('span'); n.textContent = narrowed() ? total + ' of ' + order.length + ' desks' : order.length + ' desks';
      count.appendChild(n);
      if (narrowed()) {
        var a = document.createElement('button'); a.type = 'button'; a.textContent = 'Show all desks';
        a.addEventListener('click', function () { reset(); count.focus({ preventScroll: true }); });
        count.appendChild(a);
      }
      count.hidden = false;
      if (sel && !D[sel].on) close(false);
      roving(); recluster();
      var back = $('.atlas__back', detail); if (back) back.textContent = lk.textContent;
    }
    function reset() {
      input.value = ''; words = []; filt = 'all';
      fbtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === 'all' ? 'true' : 'false'); });
      refresh();
    }

    /* the views, as tabs: the arrow keys, Home and End move between them */
    var th = document.createElement('span'); th.className = 'atlas__thumb'; th.setAttribute('aria-hidden', 'true');
    seg.insertBefore(th, seg.firstChild);
    function thumb(now) {
      var t = $('[aria-selected="true"]', seg); if (!t) return;
      if (now) th.style.transition = 'none';
      th.style.width = t.offsetWidth + 'px'; th.style.transform = 'translateX(' + t.offsetLeft + 'px)';
      if (now) { th.getBoundingClientRect(); th.style.transition = ''; }
    }
    function tab(v, focus) {
      if (v !== cur && sel) close(false);
      cur = v;
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-tab') === v;
        t.setAttribute('aria-selected', on ? 'true' : 'false'); t.setAttribute('tabindex', on ? '0' : '-1');
        if (on && focus) t.focus();
      });
      views.forEach(function (f) { var on = f.getAttribute('data-view') === v; f.classList.toggle('is-on', on); f.inert = !on; });
      zoomBar.hidden = zc.hidden = v !== 'earth';
      hot(null); thumb(); refresh();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { tab(t.getAttribute('data-tab')); });
      t.addEventListener('keydown', function (e) {
        var j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (j === undefined) return;
        e.preventDefault(); tab(tabs[(j + tabs.length) % tabs.length].getAttribute('data-tab'), true);
      });
    });

    /* a marker's name over it, for a pointer or a row; the selection, beside the map */
    function hot(id, text, at) {                   // a desk by its id; or a cluster (at), with its names
      order.forEach(function (d) { var on = d.id === id; d.mark.classList.toggle('is-hot', on); d.btn.classList.toggle('is-hot', on); });
      var d = id && D[id], cl = at || (d && d.cl && document.activeElement !== d.mark ? d.cl : null);
      Object.keys(bubbles).forEach(function (k) { bubbles[k].classList.toggle('is-hot', bubbles[k] === cl); });
      if (!at && (!d || d.view !== cur || !d.on || (d.view === 'earth' && !inside(d)))) { tip.classList.remove('is-on'); tip.hidden = true; return; }
      var el = cl ? cl.firstChild : $('rect, circle:not(.dm__halo):not(.dm__hit)', d.mark);
      var s = stage.getBoundingClientRect(), g = el.getBoundingClientRect();
      tip.textContent = text || d.town + ' · ' + d.label; tip.hidden = false;
      var tw = tip.offsetWidth, tht = tip.offsetHeight, x = g.left + g.width / 2 - s.left;
      var left = Math.max(6, Math.min(s.width - tw - 6, x - tw / 2)), top = g.top - s.top - tht - 9;
      if (top < 6) top = g.bottom - s.top + 9;
      tip.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
      requestAnimationFrame(function () { tip.classList.add('is-on'); });
    }
    function fill(d) {
      detail.textContent = '';
      var back = document.createElement('button'); back.type = 'button'; back.className = 'atlas__back'; back.textContent = lk.textContent;
      back.addEventListener('click', function () { close(true); });
      var body = d.li.cloneNode(true), box = document.createElement('div');
      box.className = 'desk desk--' + d.kind;
      $$('[id]', body).forEach(function (n) { n.removeAttribute('id'); });
      $$('.desk__map', body).forEach(function (n) { n.parentNode.removeChild(n); });
      while (body.firstChild) box.appendChild(body.firstChild);
      var h = $('.desk__town', box), h2 = document.createElement('h2');
      h2.className = 'desk__town'; h2.setAttribute('tabindex', '-1');
      while (h.firstChild) h2.appendChild(h.firstChild);
      h.parentNode.replaceChild(h2, h);
      var to = document.createElement('a'); to.className = 'more desk__go'; to.href = '#' + d.id; to.textContent = 'In the directory';
      to.addEventListener('click', function (e) {
        e.preventDefault();
        d.li.scrollIntoView({ behavior: smooth(), block: 'center' });
        var f = d.li.querySelector('.desk__map'); if (f) f.focus({ preventScroll: true });
      });
      box.appendChild(to);
      detail.appendChild(back); detail.appendChild(box);
    }
    function go(id, o) {
      var d = D[id]; if (!d) return;
      o = o || {};
      if (!d.on) reset();
      if (d.view !== cur) tab(d.view);
      sel = id; origin = o.from || null; rv[d.view] = id;
      order.forEach(function (e) {
        var on = e.id === id;
        e.mark.classList.toggle('is-sel', on); e.li.classList.toggle('is-sel', on); e.btn.classList.toggle('is-sel', on);
        if (on) e.btn.setAttribute('aria-current', 'true'); else e.btn.removeAttribute('aria-current');
      });
      fill(d);
      list.hidden = true; detail.hidden = false; detail.scrollTop = 0;
      roving(); recluster();
      if (d.view === 'earth') { if (o.fly && area !== d.c && !(area === 'view' && inside(d))) zoom(d.c); else ensure(d); }
      if (o.focus !== false) $('.desk__town', detail).focus({ preventScroll: true });
      if (o.reveal && narrow.matches) panel.scrollIntoView({ behavior: smooth(), block: 'nearest' });
    }
    function close(restore) {
      var o = origin; sel = null; origin = null;
      order.forEach(function (e) { e.mark.classList.remove('is-sel'); e.li.classList.remove('is-sel'); e.btn.classList.remove('is-sel'); e.btn.removeAttribute('aria-current'); });
      detail.hidden = true; detail.textContent = ''; list.hidden = false;
      recluster();
      if (!restore) return;
      if (o && document.documentElement.contains(o) && !o.closest('[hidden]')) o.focus();
      else { var r = rowsEl.querySelector('li:not([hidden]) .arow'); if (r) r.focus({ preventScroll: true }); }
    }
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !sel) return;
      var a = document.activeElement;
      if (a && a !== document.body && !atlas.contains(a)) return;
      e.preventDefault(); close(true);
    });

    /* the search and the filter */
    var qt = 0;
    var search = function () { clearTimeout(qt); words = split(input.value); if (sel) close(false); refresh(); };
    input.addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(search, 70); });
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault(); search();
      var hits = order.filter(function (d) { return d.on; });
      if (words.length && hits.length === 1) go(hits[0].id, { from: input, fly: true, reveal: true });
      else if (hits.length && !hits.some(function (d) { return d.view === cur; })) tab(hits[0].view);
    });
    fbtns.forEach(function (b) {
      b.addEventListener('click', function () {
        filt = b.getAttribute('data-f');
        fbtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        refresh();
      });
    });

    /* the markers: one stop for the Tab key in each view; the arrow keys travel */
    function roving() {
      views.forEach(function (f) {
        var v = f.getAttribute('data-view'), ms = $$('.dm', f), keep = null;
        var live = ms.filter(function (m) { return !m.classList.contains('is-off'); });
        [rv[v], sel].forEach(function (id) { if (!keep && id) live.forEach(function (m) { if (m.getAttribute('data-desk') === id) keep = m; }); });
        keep = keep || live[0] || null;
        ms.forEach(function (m) { m.setAttribute('tabindex', m === keep ? '0' : '-1'); });
      });
    }
    function step(m, key) {
      var d = D[m.getAttribute('data-desk')], ms = $$('.dm', m.closest('[data-view]')).filter(function (x) { return !x.classList.contains('is-off'); });
      var i = ms.indexOf(m), n = ms.length, to = null, best = Infinity;
      if (key === 'ArrowRight') return ms[(i + 1) % n];
      if (key === 'ArrowLeft') return ms[(i - 1 + n) % n];
      if (key === 'Home') return ms[0];
      if (key === 'End') return ms[n - 1];
      if (key !== 'ArrowUp' && key !== 'ArrowDown') return null;
      var sgn = key === 'ArrowUp' ? -1 : 1;
      ms.forEach(function (x) {
        var e = D[x.getAttribute('data-desk')], dy = (e.y - d.y) * sgn, dx = e.x - d.x;
        if (dy <= 0.5) return;
        var sc = dy * dy + 4 * dx * dx; if (sc < best) { best = sc; to = x; }
      });
      return to;
    }
    marks.forEach(function (m) {
      var id = m.getAttribute('data-desk'), d = D[id]; if (!d) return;
      m.addEventListener('click', function (e) { e.preventDefault(); go(id, { from: m, reveal: true }); });
      m.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hot(id); });
      m.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hot(null); });
      m.addEventListener('focus', function () { rv[d.view] = id; roving(); if (d.view === 'earth') ensure(d); hot(id); });
      m.addEventListener('blur', function () { hot(null); });
      m.addEventListener('keydown', function (e) {
        if (e.key === ' ') { e.preventDefault(); go(id, { from: m, reveal: true }); return; }
        if (d.view === 'earth' && (e.key === '+' || e.key === '=' || e.key === '-')) {
          e.preventDefault();
          var w = Math.max(WMIN, Math.min(W, vb[2] * (e.key === '-' ? 2 : .5))), h = w * H / W;
          fly(clampVB([d.x - w / 2, d.y - h / 2, w, h]), function () { settle(); hot(id); });
          return;
        }
        var to = step(m, e.key); if (!to) return;
        e.preventDefault(); to.focus({ preventScroll: true });
      });
    });

    /* Earth: the zoom and the pan. The markers keep their size at any zoom; past 1.3 times the finer land comes in */
    var clampVB = function (b) {
      var w = Math.max(WMIN, Math.min(W, b[2])), h = w * H / W;
      return [Math.max(FULL[0], Math.min(FULL[0] + W - w, b[0])), Math.max(FULL[1], Math.min(FULL[1] + H - h, b[1])), w, h];
    };
    function setVB(b) {
      vb = b; earth.setAttribute('viewBox', b.map(function (v) { return v.toFixed(2); }).join(' '));
      var k = b[2] / W, f = Math.max(0, Math.min(1, (1 / k - 1.3) / 0.5)), ms = (sT * b[2] / pxW).toFixed(4);
      if (hi) { hi.style.opacity = f.toFixed(2); lo.style.opacity = (1 - f).toFixed(2); }
      order.forEach(function (d) { if (d.view === 'earth') d.at.setAttribute('transform', d.base + ' scale(' + ms + ')'); });
      recluster();
      earthFig.classList.toggle('is-zoomed', k < .999);
      zcb[0].setAttribute('aria-disabled', b[2] <= WMIN + .5 ? 'true' : 'false');
      zcb[1].setAttribute('aria-disabled', k >= .999 ? 'true' : 'false');
    }
    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    function fly(to, then) {                       // the width changes by ratio, the centre in a line: a steady zoom
      cancelAnimationFrame(anim); hot(null);
      var from = vb.slice(), t0 = performance.now(), T = mq.matches ? 0 : 650;
      var c0x = from[0] + from[2] / 2, c0y = from[1] + from[3] / 2, c1x = to[0] + to[2] / 2, c1y = to[1] + to[3] / 2;
      var tick = function (now) {
        var t = T ? Math.min(1, (now - t0) / T) : 1, e = ease(t);
        var w = from[2] * Math.pow(to[2] / from[2], e), h = w * H / W;
        setVB(t < 1 ? clampVB([c0x + (c1x - c0x) * e - w / 2, c0y + (c1y - c0y) * e - h / 2, w, h]) : to);
        if (t < 1) anim = requestAnimationFrame(tick); else if (then) then();
      };
      anim = requestAnimationFrame(tick);
    }
    function press(key) { zbtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-z') === key ? 'true' : 'false'); }); }
    function zoom(key) {
      var to = zooms[key]; if (!to) return;
      area = key; press(key); fly(clampVB(to)); refresh();
    }
    function settle() {                            // after a pan or a zoom by hand: the list holds the desks in view
      var full = vb[2] >= W - .5;
      area = full ? 'all' : 'view'; press(full ? 'all' : ''); refresh();
    }
    function ensure(d) {
      if (vb[2] >= W - .5) return;
      var mx = vb[2] * .1, my = vb[3] * .1;
      if (d.x > vb[0] + mx && d.x < vb[0] + vb[2] - mx && d.y > vb[1] + my && d.y < vb[1] + vb[3] - my) return;
      fly(clampVB([d.x - vb[2] / 2, d.y - vb[3] / 2, vb[2], vb[3]]), function () {
        settle(); if (document.activeElement === d.mark) hot(d.id);
      });
    }
    function zoomAt(ax, ay, f, bx, by) {           // the point under (ax, ay) comes to (bx, by), the width times f
      var r = earth.getBoundingClientRect(), s0 = vb[2] / r.width;
      var ux = vb[0] + (ax - r.left) * s0, uy = vb[1] + (ay - r.top) * s0;
      var w = Math.max(WMIN, Math.min(W, vb[2] * f)), s1 = w / r.width;
      if (bx === undefined) { bx = ax; by = ay; }
      setVB(clampVB([ux - (bx - r.left) * s1, uy - (by - r.top) * s1, w, w * H / W]));
    }
    function measure() {                           // the markers keep their size on screen, whatever the map's width or zoom
      pxW = earth.getBoundingClientRect().width || 1000; sT = Math.max(.8, Math.min(1, pxW / 1000));
      var r = ((coarse.matches ? 34 : 22) * .56 / sT).toFixed(1), k0 = (sT * 1000 / pxW).toFixed(4);
      $$('.dm__hit').forEach(function (c) { c.setAttribute('r', r); });       // a finger's reach, or a pointer's
      order.forEach(function (d) { if (d.view !== 'earth') d.at.setAttribute('transform', d.base + ' scale(' + k0 + ')'); });
      setVB(vb);
    }
    /* desks too close to tell apart on screen stand together as one mark with their number; a click on it zooms in
       until they stand apart. The seat and the open desk stand alone, and at the closest zoom every desk does. */
    var NS = 'http://www.w3.org/2000/svg', bubbles = {}, cg = document.createElementNS(NS, 'g');
    cg.setAttribute('class', 'atlas__cl'); cg.setAttribute('aria-hidden', 'true'); earth.appendChild(cg);
    var names = function (m) {
      var t = m.map(function (e) { return e.town; });
      return t.length <= 3 ? t.join(', ') : t.slice(0, 2).join(', ') + ' and ' + (t.length - 2) + ' more';
    };
    function bubble() {
      var g = document.createElementNS(NS, 'g'), c = document.createElementNS(NS, 'circle');
      var t = document.createElementNS(NS, 'text'), hit = document.createElementNS(NS, 'circle');
      g.setAttribute('class', 'dc'); hit.setAttribute('class', 'dc__hit'); t.setAttribute('dy', '.36em');
      g.appendChild(c); g.appendChild(t); g.appendChild(hit);
      g.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); spread(g._m); });
      g.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hot(null, names(g._m), g); });
      g.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hot(null); });
      return g;
    }
    function recluster() {
      var R = coarse.matches ? 34 : 22, s = pxW / vb[2], ms = (sT * vb[2] / pxW).toFixed(4), keep = {}, used = {};
      var live = order.filter(function (d) { return d.view === 'earth' && d.on; });
      order.forEach(function (d) { d.cl = null; });
      if (vb[2] > WMIN + .5) live.forEach(function (d) {
        if (used[d.id] || d.kind === 'seat' || d.id === sel) return;
        var m = [d];
        live.forEach(function (e) {
          if (e === d || used[e.id] || e.kind === 'seat' || e.id === sel) return;
          var dx = (e.x - d.x) * s, dy = (e.y - d.y) * s;
          if (dx * dx + dy * dy < R * R) m.push(e);
        });
        if (m.length < 2) return;
        var key = m.map(function (e) { return e.id; }).sort().join(' '), cx = 0, cy = 0;
        m.forEach(function (e) { used[e.id] = 1; cx += e.x / m.length; cy += e.y / m.length; });
        var g = bubbles[key] || bubble();
        g._m = m; keep[key] = g;
        g.firstChild.setAttribute('r', (11 + 2.6 * Math.log(m.length) / Math.LN2).toFixed(1));
        g.childNodes[1].textContent = m.length;
        g.lastChild.setAttribute('r', (Math.max(R * .6, 16) / sT).toFixed(1));
        g.setAttribute('transform', 'translate(' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ') scale(' + ms + ')');
        m.forEach(function (e) { e.cl = g; });
      });
      Object.keys(bubbles).forEach(function (k) { if (!keep[k]) { cg.removeChild(bubbles[k]); delete bubbles[k]; } });
      Object.keys(keep).forEach(function (k) { if (!bubbles[k]) { bubbles[k] = keep[k]; cg.appendChild(keep[k]); } });
      order.forEach(function (d) { d.mark.classList.toggle('is-in', !!d.cl); });
    }
    function spread(m) {                           // zoom until the desks of a cluster stand apart, all in view
      var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, dmin = Infinity, R = coarse.matches ? 34 : 22;
      m.forEach(function (a, i) {
        x0 = Math.min(x0, a.x); x1 = Math.max(x1, a.x); y0 = Math.min(y0, a.y); y1 = Math.max(y1, a.y);
        m.slice(i + 1).forEach(function (b) { dmin = Math.min(dmin, Math.hypot(a.x - b.x, a.y - b.y)); });
      });
      var need = dmin * pxW / (R * 1.7), fit = Math.max((x1 - x0) * 1.5, (y1 - y0) * 1.5 * W / H);
      var w = Math.max(WMIN, fit, Math.min(need, vb[2] / 2)), h = w * H / W;
      fly(clampVB([(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h]), settle);
    }
    zbtns.forEach(function (b) { b.addEventListener('click', function () { zoom(b.getAttribute('data-z')); }); });
    zcb.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-disabled') === 'true') return;
        var w = Math.max(WMIN, Math.min(W, vb[2] * (b.getAttribute('data-zc') === 'in' ? .5 : 2))), h = w * H / W;
        fly(clampVB([vb[0] + vb[2] / 2 - w / 2, vb[1] + vb[3] / 2 - h / 2, w, h]), settle);
      });
    });
    var ptrs = {}, drag = false, moved = false, wt = 0;
    var grab = function (ids) {
      drag = true; moved = true; cancelAnimationFrame(anim); hot(null); earthFig.classList.add('is-drag');
      ids.forEach(function (id) { try { earth.setPointerCapture(+id); } catch (x) {} });
    };
    earth.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY }; moved = false;
    });
    earth.addEventListener('pointermove', function (e) {
      var p = ptrs[e.pointerId]; if (!p) return;
      var ids = Object.keys(ptrs);
      if (ids.length === 2) {                      // two fingers: a pinch, and a pan with them
        var a = ptrs[ids[0]], b = ptrs[ids[1]];
        var d0 = Math.hypot(a.x - b.x, a.y - b.y), ax = (a.x + b.x) / 2, ay = (a.y + b.y) / 2;
        p.x = e.clientX; p.y = e.clientY;
        var d1 = Math.hypot(a.x - b.x, a.y - b.y), bx = (a.x + b.x) / 2, by = (a.y + b.y) / 2;
        if (!drag) grab(ids);
        if (d0 > 0 && d1 > 0) zoomAt(ax, ay, d0 / d1, bx, by);
        return;
      }
      if (ids.length !== 1) return;
      if (!drag) {
        if (Math.abs(e.clientX - p.x0) + Math.abs(e.clientY - p.y0) < 6 || vb[2] >= W - .5) return;
        grab(ids);
      }
      var s = vb[2] / earth.getBoundingClientRect().width;
      setVB(clampVB([vb[0] - (e.clientX - p.x) * s, vb[1] - (e.clientY - p.y) * s, vb[2], vb[3]]));
      p.x = e.clientX; p.y = e.clientY;
    });
    var lift = function (e) {
      if (!ptrs[e.pointerId]) return;
      delete ptrs[e.pointerId];
      var left = Object.keys(ptrs);
      left.forEach(function (id) { ptrs[id].x0 = ptrs[id].x; ptrs[id].y0 = ptrs[id].y; });
      if (!left.length && drag) { drag = false; earthFig.classList.remove('is-drag'); settle(); }
    };
    earth.addEventListener('pointerup', lift); earth.addEventListener('pointercancel', lift);
    earth.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    earth.addEventListener('wheel', function (e) {    // a pinch on a trackpad, or the wheel with Ctrl or Cmd; the page scrolls otherwise
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault(); cancelAnimationFrame(anim); hot(null);
      var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(e.clientX, e.clientY, Math.abs(dy) < 50 ? Math.exp(dy * .01) : Math.exp((dy > 0 ? 1 : -1) * .25));
      clearTimeout(wt); wt = setTimeout(settle, 180);
    }, { passive: false });
    earth.addEventListener('dblclick', function (e) {
      if (e.target.closest && e.target.closest('.dm')) return;
      e.preventDefault();
      var r = earth.getBoundingClientRect(), s = vb[2] / r.width, ux = vb[0] + (e.clientX - r.left) * s, uy = vb[1] + (e.clientY - r.top) * s;
      var w = Math.max(WMIN, Math.min(W, vb[2] * (e.shiftKey ? 2 : .5))), k = w / vb[2];
      fly(clampVB([ux - (ux - vb[0]) * k, uy - (uy - vb[1]) * k, w, w * H / W]), settle);
    });

    /* in place: the controls, the list, the views as tab panels; the region tiles give way to the tabs */
    views.forEach(function (f) { f.setAttribute('role', 'tabpanel'); f.setAttribute('aria-labelledby', 'tab-' + f.getAttribute('data-view')); });
    var keys = document.createElement('p'); keys.className = 'vh'; keys.id = 'atlas-keys';
    keys.textContent = 'The arrow keys move between the desks: left and right go west and east, up and down go north and south. Enter opens a desk; on Earth, plus and minus zoom.';
    atlas.appendChild(keys);
    views.forEach(function (f) { $('svg', f).setAttribute('aria-describedby', 'atlas-keys'); });
    $('[data-atlas-ctrl]').hidden = false; panel.hidden = false;
    if (nav) nav.hidden = true;
    count.setAttribute('tabindex', '-1');
    measure(); tab('earth'); thumb(true);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { thumb(true); });
    window.addEventListener('resize', function () { thumb(true); measure(); hot(null); });
    var h0 = decodeURIComponent(location.hash.slice(1));      // from elsewhere: /desks/#tromso, /desks/#mars
    if (D[h0]) go(h0, { focus: false }); else if (h0 === 'earth-orbit' || h0 === 'mars') tab(h0);
  })();

  /* ------------------------------------------------------------------------------------------- 5. the slip */
  var slip = document.querySelector('[data-slip]');
  if (slip) (function () {
    /* the lodging slip stands printed; as the page reaches it, the desk's stamp is set down on it. Under the pointer, a
       part of the slip and its name beside it light each other */
    var parts = slice(slip.closest('section').querySelectorAll('[data-k]'));
    parts.forEach(function (p) {
      var k = p.getAttribute('data-k');
      p.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        parts.forEach(function (q) { q.classList.toggle('is-on', q.getAttribute('data-k') === k); });
      });
      p.addEventListener('pointerleave', function () { parts.forEach(function (q) { q.classList.remove('is-on'); }); });
    });
    if (mq.matches || !('IntersectionObserver' in window)) return;
    // once it stands printed, its four parts are named in turn, each lit with its name, once through (round 41);
    // the pointer on the slip takes over
    var touched = false;
    slip.closest('section').addEventListener('pointerenter', function () { touched = true; }, true);
    function read(k) {
      if (touched) return;
      parts.forEach(function (q) { q.classList.toggle('is-on', +q.getAttribute('data-k') === k); });
      if (k <= 4) setTimeout(function () { read(k + 1); }, 1100);
    }
    var r = slip.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) { setTimeout(function () { read(1); }, 1400); return; }   // in view on arrival: it stands, printed
    slip.classList.add('is-ready');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { slip.classList.add('is-printed'); io.disconnect(); setTimeout(function () { read(1); }, 1300); } });
    }, { threshold: .3 });
    io.observe(slip);
  })();

  /* ------------------------------------------------------------------------------------------- 6. the year's light */
  var yl = document.querySelector('[data-yl]');
  if (yl) (function () {
    /* the reader's today and now on the year of light (UTC+1), and any day read out: under the pointer, a tap, or the
       arrow keys (a day; Page Up and Page Down, a month; Home and End, the year's ends). The figures are the build's. */
    var M; try { M = JSON.parse(yl.getAttribute('data-yl')); } catch (e) { return; }
    var G = M.geo, D = M.d, svg = yl.querySelector('svg'), dot = yl.querySelector('[data-yl-now]');
    var cur = yl.querySelector('[data-yl-cur]'), read = yl.querySelector('[data-yl-read]'), key = yl.querySelector('[data-yl-key]');
    var box = yl.querySelector('.yl__scroll');
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
                  'November', 'December'];
    var two = function (n) { return (n < 10 ? '0' : '') + n; };
    var hm = function (m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return two(Math.floor(m / 60)) + ':' + two(m % 60); };
    var dur = function (m) { m = Math.round(m); return Math.floor(m / 60) + ' h ' + two(m % 60) + ' min'; };
    var dateOf = function (d) { var t = new Date(Date.UTC(G.year, 0, 1 + d)); return t.getUTCDate() + ' ' + MONTHS[t.getUTCMonth()]; };
    var deg = function (v) { return Math.abs(Math.round(v)) + '\u00b0'; };
    var xOf = function (d) { return G.x0 + (d + .5) * (G.x1 - G.x0) / G.days; };
    function words(d) {                            // [noon, highest, lowest, lowest at, rise, twilight from, set, twilight to]
      var r = D[d], out = [dateOf(d)];
      if (r[4] === -2) out.push('Midnight sun', 'highest ' + deg(r[1]) + ' at ' + hm(r[0]), 'lowest ' + deg(r[2]) + ' at ' + hm(r[3]));
      else if (r[4] >= 0) out.push('Sunrise ' + hm(r[4]), 'sunset ' + hm(r[6]), dur(r[6] - r[4]) + ' of daylight');
      else {
        out.push('Polar night');
        if (r[5] >= 0) out.push('twilight ' + hm(r[5]) + ' to ' + hm(r[7]));
        out.push('the sun ' + deg(r[1]) + ' below the horizon at ' + hm(r[0]));
      }
      return out.join(' \u00b7 ');
    }
    var today = 0, at = 0;
    function show(d, isToday) {
      at = d; var x = xOf(d).toFixed(1);
      cur.setAttribute('x1', x); cur.setAttribute('x2', x);
      if (isToday) cur.setAttribute('hidden', ''); else cur.removeAttribute('hidden');
      read.textContent = (isToday ? 'Today, ' : '') + words(d);
      key.setAttribute('aria-valuenow', d + 1); key.setAttribute('aria-valuetext', words(d));
    }
    function tick() {                              // today, and the hour now, at UTC+1
      var t = new Date(Date.now() + 36e5), d = Math.floor((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5);
      today = Math.max(0, Math.min(G.days - 1, d));
      var x = xOf(today).toFixed(1), y = (G.y0 + (t.getUTCHours() * 60 + t.getUTCMinutes()) / 1440 * (G.y1 - G.y0)).toFixed(1);
      var ln = dot.querySelector('line'), c = dot.querySelector('circle');
      ln.setAttribute('x1', x); ln.setAttribute('x2', x); c.setAttribute('cx', x); c.setAttribute('cy', y);
      dot.removeAttribute('hidden');
      if (at === today || cur.hasAttribute('hidden')) show(today, true);
      setTimeout(tick, 60000 - (t.getUTCSeconds() * 1000 + t.getUTCMilliseconds()) + 50);
    }
    key.style.left = (G.x0 / G.vw * 100) + '%'; key.style.width = ((G.x1 - G.x0) / G.vw * 100) + '%';
    key.style.top = (G.y0 / G.vh * 100) + '%'; key.style.height = ((G.y1 - G.y0) / G.vh * 100) + '%';
    var dayAt = function (e) {
      var r = key.getBoundingClientRect();
      return Math.max(0, Math.min(G.days - 1, Math.floor((e.clientX - r.left) / r.width * G.days)));
    };
    var down = null;
    key.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') show(dayAt(e)); });
    key.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch' && document.activeElement !== key) show(today, true); });
    key.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; });
    key.addEventListener('pointerup', function (e) {                    // a tap reads its day; a swipe scrolls the box
      if (down && Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) < 8) show(dayAt(e));
      down = null;
    });
    key.addEventListener('keydown', function (e) {
      var to = { ArrowRight: at + 1, ArrowLeft: at - 1, PageUp: at - 30, PageDown: at + 30, Home: 0, End: G.days - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault(); show(Math.max(0, Math.min(G.days - 1, to)));
    });
    key.addEventListener('focus', function () { show(at); });
    key.addEventListener('blur', function () { show(today, true); });
    key.removeAttribute('hidden'); read.removeAttribute('hidden');
    tick();
    if (box.scrollWidth > box.clientWidth + 1) box.scrollLeft = xOf(today) / G.vw * box.scrollWidth - box.clientWidth / 2;
  })();

  /* ------------------------------------------------------------------------------------------- 7. the statement */
  var sty = document.querySelector('[data-styears]');
  if (sty) (function () {
    /* one year for every card of the statement: chosen above (the arrow keys move it), or under the pointer on any
       card's bars, a click keeping it */
    var btns = slice(sty.querySelectorAll('[role="radio"]')), cards = slice(document.querySelectorAll('.stcard'));
    var years = btns.map(function (b) { return b.textContent; }), chosen = btns.length - 1;
    function show(i) {
      cards.forEach(function (c) {
        var n = c.getAttribute('data-n').split('|'), d = c.getAttribute('data-d').split('|');
        c.querySelector('[data-stn]').textContent = n[i];
        c.querySelector('[data-sty]').textContent = years[i];
        c.querySelector('[data-std]').textContent = d[i];
        slice(c.querySelectorAll('.stcard__bar')).forEach(function (r) { r.classList.toggle('is-on', +r.getAttribute('data-i') === i); });
      });
    }
    function choose(i, focus) {
      chosen = i;
      btns.forEach(function (b, j) {
        b.setAttribute('aria-checked', j === i ? 'true' : 'false'); b.setAttribute('tabindex', j === i ? '0' : '-1');
        if (j === i && focus) b.focus();
      });
      show(i);
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { choose(i); });
      b.addEventListener('keydown', function (e) {
        var j = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: btns.length - 1 }[e.key];
        if (j === undefined) return;
        e.preventDefault(); choose(Math.max(0, Math.min(btns.length - 1, j)), true);
      });
    });
    cards.forEach(function (c) {
      var svg = c.querySelector('svg');
      var at = function (e) {
        var r = svg.getBoundingClientRect();
        return Math.max(0, Math.min(btns.length - 1, Math.floor((e.clientX - r.left) / r.width * btns.length)));
      };
      svg.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') show(at(e)); });
      svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') show(chosen); });
      svg.addEventListener('click', function (e) { choose(at(e)); });
    });
    sty.hidden = false;
  })();

  /* ------------------------------------------------------------------------------------------- 8. the clock */
  var clk = document.querySelector('[data-clk]');
  if (clk && !mq.matches && 'IntersectionObserver' in window) (function () {
    /* the service clock runs once across its six weeks as the page reaches it */
    var r = clk.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) return;
    clk.classList.add('is-ready');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { clk.classList.add('is-run'); io.disconnect(); } });
    }, { threshold: .25 });
    io.observe(clk);
  })();

  /* ------------------------------------------------------------------------------------------- 9. the mark at a size */
  var mkb = document.querySelector('[data-mkb]');
  if (mkb) (function () {
    /* the class mark at any size from the least, on four grounds, its clear space shown or hidden, the contrast of its
       one colour read out (WCAG's formula, as Schedule A(5) has it); at 48 px and under, beside it its pixels, as a
       screen draws them, enlarged */
    var range = mkb.querySelector('[data-mkb-size]'), out = mkb.querySelector('[data-mkb-out]');
    var stage = mkb.querySelector('[data-mkb-stage]'), svg = stage.querySelector('svg'), read = mkb.querySelector('[data-mkb-read]');
    var cs = mkb.querySelector('[data-mkb-cs]'), gb = slice(mkb.querySelectorAll('[data-ground]'));
    var vb = svg.getAttribute('viewBox').split(' ').map(parseFloat), BOX = 10.3;
    var C = { ground: ['#f1f3f2', '#121417'], paper: ['#ece4d2', '#121417'], ink: ['#121417', '#f1f3f2'], navy: ['#1a2944', '#f1f3f2'] };
    var lum = function (h) {
      var c = [1, 3, 5].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
      return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    };
    var g = 'ground', pre = slice(mkb.querySelectorAll('[data-px]')), loupe = mkb.querySelector('[data-mkb-loupe]');
    var cv = mkb.querySelector('[data-mkb-px]'), lt = mkb.querySelector('[data-mkb-lt]');
    function pixels(px) {                          // the figure as a screen draws it at that size, one pixel to a cell
      var k = px / BOX, w = Math.ceil(6.15 * k) + 2, h = Math.ceil(BOX * k) + 2, ctx = cv.getContext && cv.getContext('2d');
      if (!ctx) return;
      cv.width = w; cv.height = h;
      var z = Math.max(4, Math.min(12, Math.floor(132 / h)));
      cv.style.width = w * z + 'px'; cv.style.height = h * z + 'px';
      ctx.fillStyle = C[g][0]; ctx.fillRect(0, 0, w, h);
      var cx = 1 + k, cy = h / 2;
      ctx.fillStyle = ctx.strokeStyle = C[g][1];
      ctx.beginPath(); ctx.arc(cx, cy, k, 0, Math.PI * 2); ctx.fill();
      [[1.96, .42], [3.72, .35], [5.00, .30]].forEach(function (a) {
        ctx.beginPath(); ctx.lineWidth = a[1] * k; ctx.lineCap = 'butt'; ctx.arc(cx, cy, a[0] * k, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      });
      lt.textContent = px + ' px \u00d7' + z;
    }
    function draw() {
      var px = +range.value, k = px / BOX;
      pre.forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-px') === px ? 'true' : 'false'); });
      loupe.hidden = px > 48;
      if (px <= 48) pixels(px);
      svg.style.width = (vb[2] * k).toFixed(1) + 'px'; svg.style.height = (vb[3] * k).toFixed(1) + 'px';
      svg.classList.toggle('is-cs', cs.checked);
      stage.setAttribute('data-ground', g);
      var a = lum(C[g][0]), b = lum(C[g][1]), r = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      out.textContent = px + ' px';
      range.setAttribute('aria-valuetext', px + ' pixels across the outer arc');
      read.textContent = px + ' px across the outer arc, from the least of 12 \u00b7 contrast ' + r.toFixed(1) + ' to 1, from the least of 4.5';
    }
    range.addEventListener('input', draw);
    pre.forEach(function (b) { b.addEventListener('click', function () { range.value = b.getAttribute('data-px'); draw(); }); });
    cs.addEventListener('change', draw);
    gb.forEach(function (b, i) {
      b.addEventListener('click', function () { pick(i); });
      b.addEventListener('keydown', function (e) {
        var j = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: gb.length - 1 }[e.key];
        if (j === undefined) return;
        e.preventDefault(); pick((j + gb.length) % gb.length, true);
      });
    });
    function pick(i, focus) {
      g = gb[i].getAttribute('data-ground');
      gb.forEach(function (b, j) { b.setAttribute('aria-checked', j === i ? 'true' : 'false'); b.setAttribute('tabindex', j === i ? '0' : '-1'); if (j === i && focus) b.focus(); });
      draw();
    }
    mkb.hidden = false; draw();
  })();

  /* ------------------------------------------------------------------------------------------- 10. the home's map */
  // each desk on the home's map is a link to its entry in Find a desk (which opens it there); under the pointer or
  // the focus its town and kind are named beside it
  (function () {
    var fig = document.querySelector('[data-dmap]');
    if (!fig) return;
    var tip = fig.querySelector('[data-dmap-tip]');
    if (!tip) return;
    function show(a) {
      var m = a.querySelector('.dm__mk') || a, r = m.getBoundingClientRect(), f = fig.getBoundingClientRect();
      tip.textContent = a.getAttribute('data-t') + ' ';
      var k = document.createElement('span'); k.textContent = '\u00b7 ' + a.getAttribute('data-k'); tip.appendChild(k);
      tip.hidden = false;
      var x = Math.round(r.left + r.width / 2 - f.left), y = Math.round(r.top - f.top - 10);
      x = Math.max(tip.offsetWidth / 2 + 4, Math.min(f.width - tip.offsetWidth / 2 - 4, x));
      tip.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -100%)';
      tip.classList.add('is-on');
    }
    function hide() { tip.classList.remove('is-on'); }
    Array.prototype.forEach.call(fig.querySelectorAll('a.dm'), function (a) {
      a.addEventListener('mouseenter', function () { show(a); });
      a.addEventListener('focus', function () { show(a); });
      a.addEventListener('mouseleave', hide);
      a.addEventListener('blur', hide);
    });
  })();

  /* ------------------------------------------------------------------------------------------- 4. the carriers */
  var netw = document.querySelector('[data-netw]');
  if (netw) (function () {
    /* every station, relay and vessel of the drawing gives its card (the gazetteer's facts, and its windows) and lights
       what it works with; a click keeps the card, with a way out (the close button, Escape, back to the node) and on
       (its entry). The day of windows below marks the hour in TCB on the reader's clock, names the windows for that day
       and opens them at it. TCB runs ahead of UTC by the leap seconds, 32.184 s and the rate of the barycentre. */
    var nodes = {}; try { nodes = JSON.parse(netw.getAttribute('data-netw')); } catch (e) {}
    var stage = netw.querySelector('.netw__stage'), card = netw.querySelector('[data-netw-card]');
    var nn = slice(netw.querySelectorAll('.nn')), links = slice(netw.querySelectorAll('[data-link]'));
    var rows = slice(netw.querySelectorAll('[data-node-row]'));
    var pinned = null;
    var esc = function (t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
    function light(code) {
      var n = nodes[code], pin = !!n && code === pinned; netw.classList.toggle('is-lit', !!n);
      var withs = n ? n.with_ : [];
      nn.forEach(function (a) { var c = a.getAttribute('data-node'); a.classList.toggle('is-on', c === code); a.classList.toggle('is-with', withs.indexOf(c) >= 0); });
      links.forEach(function (l) { l.classList.toggle('is-with', !!code && (' ' + l.getAttribute('data-link') + ' ').indexOf(' ' + code + ' ') >= 0); });
      rows.forEach(function (r) { r.classList.toggle('is-on', !!code && (' ' + r.getAttribute('data-node-row') + ' ').indexOf(' ' + code + ' ') >= 0); });
      if (!n) { card.classList.remove('is-on'); card.hidden = true; return; }
      card.innerHTML = (pin ? '<button type="button" class="netw__x" aria-label="Close">\u00d7</button>' : '') +
        '<h3>' + esc(n.name) + '</h3><p class="c">' + esc(n.code) + '</p><dl>' +
        n.rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' +
        (pin && n.link ? '<a class="more netw__go" href="' + esc(n.link) + '">' +
          (n.link.indexOf('/places/') === 0 ? 'In the gazetteer' : 'The provisions') + '</a>' : '');
      card.classList.toggle('is-pin', pin);
      card.setAttribute('aria-label', n.name);
      var x = card.querySelector('.netw__x');
      if (x) x.addEventListener('click', function () { unpin(true); });
      card.hidden = false;
      var a = netw.querySelector('.nn[data-node="' + code + '"]'), s = stage.getBoundingClientRect(), r = a.getBoundingClientRect();
      var cx = r.left + r.width / 2 - s.left, cy = r.top + r.height / 2 - s.top, cw = card.offsetWidth, ch = card.offsetHeight;
      var left = cx + 20 + cw > s.width ? cx - 20 - cw : cx + 20, top = Math.max(0, Math.min(s.height - ch, cy - ch / 2));
      card.style.left = Math.round(Math.max(0, left)) + 'px'; card.style.top = Math.round(top) + 'px';
      requestAnimationFrame(function () { card.classList.add('is-on'); });
    }
    nn.forEach(function (a) {
      var c = a.getAttribute('data-node');
      a.addEventListener('mouseenter', function () { light(c); });
      a.addEventListener('mouseleave', function () { light(pinned); });
      a.addEventListener('focus', function () { light(c); });
      a.addEventListener('blur', function () { light(pinned); });
      a.addEventListener('click', function (e) {               // a node chooses; its card offers the way out and on
        e.preventDefault();
        if (pinned === c) { unpin(true); return; }
        pinned = c; light(c);
        var x = card.querySelector('.netw__x'); if (x) x.focus({ preventScroll: true });
      });
    });
    function unpin(back) {
      var c = pinned; pinned = null; light(null);
      if (back && c) { var a = netw.querySelector('.nn[data-node="' + c + '"]'); if (a) a.focus({ preventScroll: true }); }
    }
    rows.forEach(function (r) {
      var c = r.getAttribute('data-node-row').split(' ')[0];
      r.addEventListener('mouseenter', function () { light(c); });
      r.addEventListener('mouseleave', function () { light(pinned); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pinned) unpin(card.contains(document.activeElement)); });
    document.addEventListener('click', function (e) { if (pinned && !e.target.closest('.nn') && !card.contains(e.target)) unpin(false); });
    var lw = slice(netw.querySelectorAll('.wnd__l')).filter(function (t) { return t.textContent.indexOf('ddd') >= 0; });
    lw.forEach(function (t) { t.setAttribute('data-lw', t.textContent); });
    var now = netw.querySelector('[data-wnd-now]');
    if (now) {
      var line = now.querySelector('line'), txt = now.querySelector('text'), svg = now.ownerSVGElement;
      var tick = function () {
        var d = new Date(), jd = d.getTime() / 864e5 + 2440587.5;
        var tcb = d.getTime() / 1000 + 37 + 32.184 + 1.550519768e-8 * (jd - 2443144.5003725) * 86400;
        var h = ((tcb / 3600) % 24 + 24) % 24, x = 92 + (940 - 92) * h / 24;
        line.setAttribute('x1', x.toFixed(1)); line.setAttribute('x2', x.toFixed(1));
        txt.setAttribute('x', x.toFixed(1));
        var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
        txt.textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + ' TCB';
        rows.forEach(function (r) { var a = +r.getAttribute('data-from'), b = +r.getAttribute('data-to'); r.classList.toggle('is-open', h >= a && h < b); });
        var td = new Date(tcb * 1000), doy = Math.floor((td.getTime() - Date.UTC(td.getUTCFullYear(), 0, 1)) / 864e5) + 1;
        var ddd = ('00' + doy).slice(-3);                   // the windows of this day in TCB, by their numbers: LW 303/02
        lw.forEach(function (t) { t.textContent = t.getAttribute('data-lw').replace('ddd', ddd); });
        now.removeAttribute('hidden');
        setTimeout(tick, 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50);
      };
      tick();
    }
  })();

  /* ------------------------------------------------------------------------------------------- 11. the drawings' loops */
  // The house's three drawings each have their loop (round 24e): the place's own work goes round while its rule holds.
  // Replies: a reply is lodged at each position in turn (its slot's bezel answers) and is written on every position's
  // display at once, a reply lodged at one being lodged at all; at the window the three displays carry what is held,
  // and stand empty again. Certification: a day goes round the room in sixteen seconds, its one-handed clock with it;
  // the high window's glass goes from day to dusk, night and dawn, and the room with it. Records: the marked row's
  // drawers are drawn out a little and closed, one after another from the left, each sending kept as received. The
  // parts that move are drawn over the picture from the model (tools/drawings24c_house.py writes them, with the frame
  // of each of its two pictures); out of view, or with the page hidden, a loop waits. Without the script, and under
  // reduced motion, the drawing stands still as written.
  var NS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function inout(x) { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function out3(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
  function f1(v) { return v.toFixed(1); }
  function poly(pts) { return 'M' + pts.map(function (p) { return f1(p[0]) + ' ' + f1(p[1]); }).join('L') + 'Z'; }
  function line(pts) { return 'M' + pts.map(function (p) { return f1(p[0]) + ' ' + f1(p[1]); }).join('L'); }
  function hex(c) { return [1, 3, 5].map(function (i) { return parseInt(c.slice(i, i + 2), 16); }); }
  function mix(a, b, k) { a = hex(a); b = hex(b); return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * k); }).join(' ') + ')'; }
  function hull(pts) {
    pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function turn(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], hi = [];
    pts.forEach(function (p) { while (lo.length > 1 && turn(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
    pts.slice().reverse().forEach(function (p) { while (hi.length > 1 && turn(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); });
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  // the house's inks (tools/isodraw.py, HOUSE)
  var INK = { top: '#f8faf9', left: '#e9eeed', right: '#dce3e2', recess: '#cdd6d5', paper: '#ffffff', accent: '#315f9a',
              ink: '#263747', detail: '#73818a' };

  // the standard easing, cubic-bezier(.4, 0, .2, 1), with no overshoot
  function bez(x1, y1, x2, y2) {
    return function (x) {
      x = clamp(x, 0, 1);
      var u = x;
      for (var i = 0; i < 6; i++) {
        var fx = 3 * x1 * u * (1 - u) * (1 - u) + 3 * x2 * u * u * (1 - u) + u * u * u - x;
        var dx = 3 * x1 * (1 - u) * (1 - u) + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u;
        if (Math.abs(dx) < 1e-6) break;
        u = clamp(u - fx / dx, 0, 1);
      }
      return 3 * y1 * u * (1 - u) * (1 - u) + 3 * y2 * u * u * (1 - u) + u * u * u;
    };
  }
  var std = bez(.4, 0, .2, 1);

  // the loops' clocks. One loop runs at a time: the most visible of those at least 55 % in view, once it has been so for
  // a quarter of a second; the others hold where they are and go on from there when they run again. A loop out of
  // view (under a tenth) stops; with the page hidden, all wait.
  var crowd = [], pick = 0;
  function decide() {
    var best = null, cur = null;
    crowd.forEach(function (r) {
      if (r.ratio >= 0.55 && (!best || r.area > best.area)) best = r;
      if (r.on) cur = r;
    });
    if (cur && cur.ratio < 0.1) { cur.on = false; cur.sync(); cur = null; }
    clearTimeout(pick);
    if (best && best !== cur) pick = setTimeout(function () {
      if (best.ratio < 0.55 || best.gone) return;
      crowd.forEach(function (r) { r.on = r === best; r.sync(); });
    }, 250);
  }
  document.addEventListener('visibilitychange', function () { crowd.forEach(function (r) { r.sync(); }); });
  function runner(watch, frame) {
    var r = { ratio: 0, area: 0, on: false, gone: false }, running = false, t = 0, last = 0, raf = 0, cost = 0, odd = false;
    var now = function () { return window.performance ? performance.now() : Date.now(); };
    function step(ts) {
      if (!running) return;
      if (last) t += Math.min(0.1, (ts - last) / 1000);
      last = ts;
      odd = !odd;
      if (cost < 9 || odd) {                                     // a picture that costs more than 9 ms: every other frame (round 42)
        var a = now();
        frame(t);
        cost = cost ? cost * 0.9 + (now() - a) * 0.1 : now() - a;
      }
      raf = requestAnimationFrame(step);
    }
    r.sync = function () {
      var go = r.on && !r.gone && !document.hidden;
      if (go && !running) { running = true; last = 0; raf = requestAnimationFrame(step); }
      else if (!go && running) { running = false; cancelAnimationFrame(raf); }
    };
    crowd.push(r);
    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { r.ratio = e.intersectionRatio; r.area = e.intersectionRect.width * e.intersectionRect.height; });
        decide();
      }, { threshold: [0, 0.1, 0.3, 0.55, 0.7, 0.85, 1] });
      io.observe(watch);
    } else { r.ratio = 1; r.area = 1; decide(); }
    frame(0);
    return { now: function () { return t; },
             stop: function () { r.gone = true; r.on = false; r.sync(); if (io) io.disconnect(); crowd.splice(crowd.indexOf(r), 1); } };
  }

  // The house's machines: purpose-built and as common as the furniture, drawn from their own descriptions (robokit,
  // /assets/js/machines.js) in the house's tones, the near faces' meeting folded and the outline round what is seen.
  // No face and no eye (the industry code bars the infant schema): a machine's light is where it works, a short mark
  // in the accent on a tool's lock, lit while the tool holds. The records' drawers keep the accent's light too.
  var LIT = '#5b8dd3';
  // a run along the floor: away in 0.25 s, at an even pace, down in 0.35 s to a crawl for its last
  // 9 cm, and still; as a function of the part of the run's time gone, the part of its length done
  function drive(L, D) {
    L = Math.abs(L);
    if (L < 1) return std;
    var ta = 0.25, td = 0.35, ts = 0.15, vc = 30, c = Math.min(9, L * 0.25);
    var tc = Math.max(0, (c - vc * ts / 2) / vc), need = ta + td + tc + ts + 0.05;
    if (D < need) { var q = D / need; ta *= q; td *= q; ts *= q; tc *= q; }    // a short run: the same shape, quicker
    c = vc * (tc + ts / 2);
    var Tc = Math.max(0, D - ta - td - tc - ts);
    var V = (L - c - vc * td / 2) / (ta / 2 + Tc + td / 2);
    function at(s) {
      if (s <= 0) return 0;
      if (s < ta) return V * s * s / (2 * ta);
      var p = V * ta / 2; s -= ta;
      if (s < Tc) return p + V * s;
      p += V * Tc; s -= Tc;
      if (s < td) return p + V * s + (vc - V) * s * s / (2 * td);
      p += (V + vc) / 2 * td; s -= td;
      if (s < tc) return p + vc * s;
      p += vc * tc; s -= tc;
      if (s < ts) return p + vc * s - vc * s * s / (2 * ts);
      return L;
    }
    return function (u) { return clamp(at(u * D) / L, 0, 1); };
  }
  // a machine's moves, written in their order: each channel held, then eased to its next value (the standard curve,
  // or a run's); go() moves channels together and advances the plan's clock, also() moves others alongside it
  function Plan(init) {
    var K = {}, now = 0;
    for (var k in init) K[k] = [[0, init[k]]];
    function key(k, v, t0, t1, ease) { var ks = K[k], l = ks[ks.length - 1]; if (t0 > l[0]) ks.push([t0, l[1]]); ks.push([t1, v, ease]); }
    return {
      at: function () { return now; },
      wait: function (d) { now += d; return now; },
      go: function (m, d, ease) { for (var k in m) key(k, m[k], now, now + d, ease); now += d; return now; },
      run: function (k, v, d) {                                    // a run along the floor, to v on channel k
        var ks = K[k], from = ks[ks.length - 1][1];
        key(k, v, now, now + d, drive(v - from, d)); now += d; return now;
      },
      also: function (m, t0, d) { for (var k in m) key(k, m[k], t0, t0 + d); return t0 + d; },
      val: function (k, t) {
        var ks = K[k];
        if (t <= ks[0][0]) return ks[0][1];
        for (var i = 1; i < ks.length; i++) if (t <= ks[i][0]) {
          var a = ks[i - 1], b = ks[i];
          return b[0] > a[0] ? a[1] + (b[1] - a[1]) * (b[2] || std)((t - a[0]) / (b[0] - a[0])) : b[1];
        }
        return ks[ks.length - 1][1];
      }
    };
  }
  // a route over the floor through its points, each corner a quarter circle of radius r; [x, y] at a length along it
  function Route(pts, r) {
    var s = [pts[0]];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], c = pts[i + 1];
      if (!c) { s.push(b); break; }
      var l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      var d1 = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1], d2 = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2];
      var p1 = [b[0] - d1[0] * r, b[1] - d1[1] * r], cx = p1[0] + d2[0] * r, cy = p1[1] + d2[1] * r;
      s.push(p1);
      for (var k = 1; k <= 12; k++) {
        var th = k / 12 * Math.PI / 2;
        s.push([cx - d2[0] * r * Math.cos(th) + d1[0] * r * Math.sin(th), cy - d2[1] * r * Math.cos(th) + d1[1] * r * Math.sin(th)]);
      }
    }
    var acc = [0];
    for (var j = 1; j < s.length; j++) acc.push(acc[j - 1] + Math.hypot(s[j][0] - s[j - 1][0], s[j][1] - s[j - 1][1]));
    return { len: acc[acc.length - 1], at: function (d) {
      d = clamp(d, 0, acc[acc.length - 1]);
      for (var j = 1; j < s.length; j++) if (d <= acc[j]) {
        var f = (d - acc[j - 1]) / ((acc[j] - acc[j - 1]) || 1);
        return [s[j - 1][0] + (s[j][0] - s[j - 1][0]) * f, s[j - 1][1] + (s[j][1] - s[j - 1][1]) * f];
      }
      return s[s.length - 1];
    } };
  }
  // the right end wall stands before what is near it in the room: what is behind it stays hidden
  function behindWall(svg, g, T, w) {
    var cp = mk('clipPath', { id: 'lv-' + Math.random().toString(36).slice(2, 8) }, svg), hp = [], vb = svg.viewBox.baseVal;
    for (var i = 0; i < 8; i++) hp.push(T(i & 1 ? w[3] : w[0], i & 2 ? w[4] : w[1], i & 4 ? w[5] : w[2]));
    mk('path', { 'clip-rule': 'evenodd', d: 'M-10 -10H' + f1(vb.width + 10) + 'V' + f1(vb.height + 10) + 'H-10Z' + poly(hull(hp)) }, cp);
    g.setAttribute('clip-path', 'url(#' + cp.id + ')');
  }
  // The line (round 42): the house's one conveyor, through the three rooms and between them. A flat rail (8 cm wide, 3
  // thick) on the walls, and carriers (16 by 10, 7 high) that ride it, a paper on each: what is lodged, certified or
  // sent goes by it to the records. A way is a list of points, each joined to the next along one axis; along a level
  // length the carriers ride on the rail's top, up or down an upright on its face toward the eye (n: [1, 0] or [0, 1]).
  var LINE = { W: 4, TH: 3, V: 110, GAP: 2.2, N: 3 };
  function Way(pts, n) {
    var seg = [], len = 0;
    n = n || [0, 1];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], ax = a[0] !== b[0] ? 0 : a[1] !== b[1] ? 1 : 2, l = Math.abs(b[ax] - a[ax]);
      seg.push({ a: a, ax: ax, s: b[ax] > a[ax] ? 1 : -1, l: l, d: len }); len += l;
    }
    return {
      len: len,
      // the rail of its lengths i0 to i1 (all of them by default); a level length runs on W past its ends, to meet the next
      rail: function (out, i0, i1, lw) {
        for (var i = i0 || 0; i < (i1 == null ? seg.length : i1); i++) {
          var g = seg[i], p = g.a.slice(), q = g.a.slice(); q[g.ax] += g.s * g.l;
          var lo = [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.min(p[2], q[2])], hi = [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.max(p[2], q[2])];
          if (g.ax === 2) {
            var u = n[0] ? 0 : 1, w = 1 - u;
            lo[u] -= LINE.W; lo[w] -= LINE.W; hi[w] += LINE.W;
          } else { lo[2] -= LINE.TH; lo[1 - g.ax] -= LINE.W; hi[1 - g.ax] += LINE.W; lo[g.ax] -= LINE.W; hi[g.ax] += LINE.W; }
          out.push(RK.box(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2], { w: lw || 0.55, link: 'rail' }));
        }
        return out;
      },
      // a carrier d along the way, with its paper
      car: function (out, d) {
        if (d < 0 || d >= len) return;
        var g = seg[seg.length - 1];
        for (var i = 0; i < seg.length; i++) if (d < seg[i].d + seg[i].l) { g = seg[i]; break; }
        var p = g.a.slice(); p[g.ax] += g.s * (d - g.d);
        var x = p[0], y = p[1], z = p[2];
        if (g.ax === 2) {
          if (n[0]) { out.push(RK.box(x, y - 5, z - 8, x + 7, y + 5, z + 8, { w: 0.85, link: 'car' }), RK.box(x + 7, y - 3, z - 6, x + 7.8, y + 3, z + 6, { w: 0.55, tone: 'paper', link: 'car' })); }
          else { out.push(RK.box(x - 5, y, z - 8, x + 5, y + 7, z + 8, { w: 0.85, link: 'car' }), RK.box(x - 3, y + 7, z - 6, x + 3, y + 7.8, z + 6, { w: 0.55, tone: 'paper', link: 'car' })); }
        } else if (g.ax === 0) {
          out.push(RK.box(x - 8, y - 5, z, x + 8, y + 5, z + 7, { w: 0.85, link: 'car' }), RK.box(x - 6, y - 3, z + 7, x + 6, y + 3, z + 7.8, { w: 0.55, tone: 'paper', link: 'car' }));
        } else {
          out.push(RK.box(x - 5, y - 8, z, x + 5, y + 8, z + 7, { w: 0.85, link: 'car' }), RK.box(x - 3, y - 6, z + 7, x + 3, y + 6, z + 7.8, { w: 0.55, tone: 'paper', link: 'car' }));
        }
      }
    };
  }
  // the carriers that pass a point of the line: three, 2.2 s apart, every P seconds; each one's age at t (for a way of
  // any length: those of the turn before are still on it)
  function passing(t, P, f) {
    var u = ((t % P) + P) % P;
    for (var b = 0; b < 3; b++) for (var j = 0; j < LINE.N; j++) { var age = u - j * LINE.GAP + b * P; if (age >= 0) f(age); }
  }
  // The night's tones (round 44). No filter lies over a canvas here (a filter over a canvas is worked again at every
  // picture, over all of it): at night each tone is turned in the script as the page's filter over the drawings turns
  // it, invert(.92) then hue-rotate(180deg) (house.css, --draw). LIGHT.subs: what is to be painted again when the
  // light changes
  var LIGHT = { night: false, n: 0, subs: [], eye: null }, tones = {}, ntones = 0;
  function tint(c) {
    var o = tones[c];
    if (o) return o;
    var m = /^#(..)(..)(..)$/.exec(c), r, g, b;
    if (m) { r = parseInt(m[1], 16); g = parseInt(m[2], 16); b = parseInt(m[3], 16); }
    else { m = /(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(c); if (!m) return c; r = +m[1]; g = +m[2]; b = +m[3]; }
    r = 0.92 - 0.84 * r / 255; g = 0.92 - 0.84 * g / 255; b = 0.92 - 0.84 * b / 255;
    o = 'rgb(' + Math.round(255 * clamp(-0.574 * r + 1.430 * g + 0.144 * b, 0, 1)) + ' ' + Math.round(255 * clamp(0.426 * r + 0.430 * g + 0.144 * b, 0, 1)) + ' ' +
        Math.round(255 * clamp(0.426 * r + 1.430 * g - 0.856 * b, 0, 1)) + ')';
    if (++ntones > 8000) { tones = {}; ntones = 0; }
    return (tones[c] = o);
  }
  function light() {
    var was = LIGHT.night;
    LIGHT.night = (getComputedStyle(document.documentElement).getPropertyValue('--draw') || 'none').trim() !== 'none';
    if (was !== LIGHT.night) { LIGHT.n++; LIGHT.subs.slice().forEach(function (f) { f(); }); }
  }
  function lights(f) {                                           // f is told of each change of the light; returns how to leave
    if (!LIGHT.eye) { LIGHT.eye = new MutationObserver(light); LIGHT.eye.observe(document.documentElement, { attributes: true, attributeFilter: ['data-light', 'class', 'style'] }); }
    light();
    LIGHT.subs.push(f);
    return function () { var i = LIGHT.subs.indexOf(f); if (i >= 0) LIGHT.subs.splice(i, 1); };
  }
  // A canvas over a drawing for what robokit draws there (round 44). Several hundred boxes redrawn as an <svg>'s paths
  // at each frame cost the page its evenness; the same boxes are painted on a canvas in a fraction of the time. T: the
  // drawing's projection (its viewBox's units); wall: a box that stands before the room's far end, behind which nothing
  // is painted. The canvas lies over the live <svg> and a margin round it, in the night's own tones at night.
  function Canvas(svg, T, wall) {
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d'), vb = svg.viewBox.baseVal, M = 24, hp = null, o = { cv: cv, s: 0 };
    cv.className = 'draw__live draw__cv'; cv.setAttribute('aria-hidden', 'true');
    svg.parentNode.insertBefore(cv, svg.nextSibling);
    if (wall) {
      hp = [];
      for (var i = 0; i < 8; i++) hp.push(T(i & 1 ? wall[3] : wall[0], i & 2 ? wall[4] : wall[1], i & 4 ? wall[5] : wall[2]));
      hp = hull(hp);
    }
    o.fit = function () {
      var w = parseFloat(svg.style.width), h = parseFloat(svg.style.height);
      if (!(w > 0) || !(h > 0)) return;
      var d = Math.min(2, window.devicePixelRatio || 1);
      cv.style.left = (parseFloat(svg.style.left) - M) + 'px'; cv.style.top = (parseFloat(svg.style.top) - M) + 'px';
      cv.style.width = (w + 2 * M) + 'px'; cv.style.height = (h + 2 * M) + 'px';
      var W = Math.round((w + 2 * M) * d), H = Math.round((h + 2 * M) * d);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      o.kd = w / vb.width; o.s = o.kd * d; o.m = M * d;
    };
    o.draw = function (boxes) {
      if (!o.s) o.fit();
      if (!o.s) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(o.s, 0, 0, o.s, o.m, o.m);
      if (hp) {
        ctx.save(); ctx.beginPath(); ctx.rect(-M / o.kd - 10, -M / o.kd - 10, vb.width + 2 * M / o.kd + 20, vb.height + 2 * M / o.kd + 20);
        ctx.moveTo(hp[0][0], hp[0][1]);
        for (var j = 1; j < hp.length; j++) ctx.lineTo(hp[j][0], hp[j][1]);
        ctx.closePath(); ctx.clip('evenodd');
      }
      var pen = new RK.Painter(ctx, T, (T.k || 1) / o.kd);
      pen.tint = LIGHT.night ? tint : null;
      pen.draw(boxes);
      if (hp) ctx.restore();
      o.last = boxes;
    };
    o.leave = lights(function () { if (o.last) o.draw(o.last); });
    (svg._cv = svg._cv || []).push(o);
    o.fit();
    return o;
  }
  function gone(svg) { if (!svg) return; (svg._cv || []).forEach(function (o) { o.leave(); o.cv.remove(); }); svg.remove(); }
  var SCENES = {
    // Replies, a round of four couriers on one beat (round 41; before it one courier served the three positions in a
    // turn of 34 s). The courier (RC-4, tools/robokit/robots.js) works with four arms, none like another, two of them
    // moving at once at most, the others holding: its body 46 by 56 cm and 24 high, a tote in its front half where three
    // envelopes stand in a row on their short edge, a pusher behind them, its mast at its back (140 cm). A, the long arm
    // (50 and 52 cm) from a bracket high on the mast, takes the front envelope by its head in a jaw of two plates; B, a
    // short arm low on the mast (22 and 20 cm), holds the next one down while A draws it out; C, the pusher, brings the
    // row forward; D, a strut out of a sleeve high on the mast, sets its flat foot against the counter's front edge while
    // A reaches over.
    // The round: a courier leaves the berth under the supply's hood (at the left end wall, by the front) with three
    // envelopes, and goes along the lane before the counters a position a beat: at each it takes its front envelope
    // standing in the room (at the counter A's elbow would meet the counter's top), runs into the bay in under the
    // counter's edge, sets D's foot, reaches over, sets the envelope's foot in the slot (12 mm, held 0.25 s) and lets
    // go: 0.18 s on, the slot draws it in, 21 cm in 0.45 s, and the bezel answers. After the third it comes back along
    // the front of the room to the berth, where the pusher draws back and three envelopes are set in from the supply.
    // Four couriers keep the round a beat apart, so at every beat three stand at the three positions and do the same
    // work together, each a third of a second after its neighbour on the left, while the fourth is at the supply; when
    // they move, they move a position on together. Each beat the three records are set on the three displays (the
    // position's own first, its neighbours after, 0.12 s apart); at the window (1.6 s after the third) the bar runs once
    // (0.8 s) and what was held is carried (0.24 s). A courier's light is the mark on the jaw's lock and on B's block,
    // lit while each holds. The machines are drawn from their parts by robokit, all together, what hides what decided
    // again at each picture.
    reply: function (L, T, g, dim, svg) {
      var IN = 0.45, ANS = 0.18, STEP = 0.12, BAR = 0.8, CLR = 0.24, WAVE = 0.3, F0 = L.floor;
      var order = [0, 1, 2];                                     // the positions in the order they lodge
      var EXP = 20.8;                                            // what stands above the slot, its foot 12 mm in
      var R = RK_MACHINES.M.courier, Q = R.poses, mach = new RK.Machine(R);
      var XS = L.pos.map(function (p) { return (p.slot[0] + p.slot[2]) / 2 - 4.5; });   // its middle: A's arm over the slot
      var NP = XS.length, NC = NP + 1;                           // the positions; the couriers
      var LANE = 112, BAYY = LANE + Q.LANE;                      // its head: out in the room; in a bay, in under the edge
      var FR = 182;                                              // its head on the way back, along the front of the room
      var BX = 12 + 32 + 2 + 28;                                 // its middle in its berth
      function pose(n, q) { var m = {}; m[n + '_sh'] = q[0]; m[n + '_el'] = q[1]; m[n + '_wr'] = q[2]; return m; }
      // how far up from the tote (as a part of A's lift) the envelope's foot is out of it: its lower half shown from then
      var UB = 1;
      for (var i = 0; i <= 100; i++) {
        var e = std(i / 100), z = R.wristZ([0, 1].map(function (j) { return Q.TAKE[j] + (Q.LIFT[j] - Q.TAKE[j]) * e; }));
        if (z - 32.5 >= 36.7) { UB = i / 100; break; }
      }
      // one courier's round, a beat (D) to a position: built once to find the beat, then to it
      function round(D) {
        var init = { x: BX, yb: FR, c: 0, d: 0, j: 0, p0: 10, p1: 5, p2: 0 };
        [pose('a', Q.REST), pose('b', Q.BREST)].forEach(function (m) { for (var k in m) init[k] = m[k]; });
        var P = Plan(init), o = { P: P, put: [], S: [], tk: [], tb: [], press: [], rel: [], fill: [], beat: 0 };
        XS.forEach(function (x, k) {
          var b0 = P.at();
          if (k) P.run('x', x, 1.4);                             // a position on, with the others
          else { P.wait(0.3); P.run('x', x, 0.4); P.run('yb', LANE, 0.7); }   // out from under the hood, and up to the lane
          var pre = (k ? 0.6 : 0.7) + (k < NP - 1 ? 0.45 : 0);   // what its own first moves take: the three kept in step
          P.wait(WAVE * k + 1.15 - pre);
          // standing in the room: the front envelope out of the tote
          P.also({ j: -Q.OPEN }, P.at() + 0.25, 0.2);
          P.go(pose('a', Q.TAKE), k ? 0.6 : 0.7);
          if (k < NP - 1) { P.go(pose('b', Q.BOVER), 0.3); P.go(pose('b', Q.PRESS), 0.15); o.press[k] = P.at(); }
          o.tk[k] = P.go({ j: Q.SHUT }, 0.15);
          var up = P.at();
          P.go(pose('a', Q.LIFT), 0.85);
          o.tb[k] = up + 0.85 * UB;
          if (k < NP - 1) {                                      // B lets go; C brings the row forward
            o.rel[k] = up + 0.75;
            P.also(pose('b', Q.BOVER), o.rel[k], 0.25);
            P.also(pose('b', Q.BREST), o.rel[k] + 0.25, 0.4);
            var m = { c: 5 * (k + 1) };
            for (var j = k + 1; j < 3; j++) m['p' + j] = 10 - 5 * (j - k - 1);
            P.also(m, o.rel[k] + 0.65, 0.6);
          }
          P.run('yb', BAYY, 0.8);                                // in under the counter's edge
          P.wait(0.25);                                          // stood still before an arm moves
          P.go({ d: Q.BRACE }, 0.4);                             // D's foot to the counter's edge
          P.go(pose('a', Q.OVER), 0.7);                          // A over the counter
          P.go(pose('a', Q.SET), 0.3);                           // the envelope's foot into the slot
          P.wait(0.25);
          o.put[k] = P.go({ j: -Q.OPEN }, 0.15);                 // the jaw opens
          o.S[k] = P.wait(0.18);                                 // the slot draws it in from here
          P.go(pose('a', Q.OVER), 0.3);
          P.go(pose('a', Q.LIFT), 0.6);                          // A back
          P.go({ d: 0 }, 0.4);                                   // D's foot off
          P.run('yb', LANE, 0.8);                                // out of the bay
          if (k === NP - 1) { P.also(pose('a', Q.REST), P.at(), 0.8); P.also({ j: 0 }, P.at() + 0.4, 0.3); }
          P.wait(WAVE * (NP - 1 - k) + 0.25);
          o.beat = Math.max(o.beat, P.at() - b0);
          if (D) P.wait(b0 + D - P.at());
        });
        P.run('yb', FR, 0.7);                                    // to the front of the room,
        P.run('x', BX, 2.6);                                     // along it, and in under the hood
        var berth = P.at();
        P.also({ p1: 5, p2: 0 }, berth, 0.01);                   // (the slides of the gone envelopes, unseen)
        P.also({ c: 0 }, berth + 0.1, 0.4);                      // the pusher draws back
        o.fill = [berth + 0.6, berth + 0.9, berth + 1.2];        // the envelopes set in from the supply: the far one first
        P.wait(1.6);
        if (D) P.wait(NC * D - P.at());
        return o;
      }
      var D = round(0).beat, C = round(D), P = C.P, TURN = NC * D;
      // each position's events, as parts of the beat: the jaw opens, the slot draws in
      var putB = C.put.map(function (v, k) { return v - k * D; }), SB = C.S.map(function (v, k) { return v - k * D; });
      var WIN = Math.max.apply(null, SB) + 1.6;
      function since(tb, x) { return (((tb - x) % D) + D) % D; } // how long since x last came round

      var pos = L.pos.map(function (p, q) {
        var d = p.disp, y = d[4], b = p.bezel, sl = p.slot;
        var o = { g: mk('g', {}, g), d: d };
        o.flash = mk('path', { 'class': 'lv-fill', fill: '#7d9fce', 'fill-rule': 'evenodd',
                               d: poly([T(b[0], b[1], b[4]), T(b[2], b[1], b[4]), T(b[2], b[3], b[4]), T(b[0], b[3], b[4])]) +
                                  poly([T(sl[0], sl[1], sl[4]), T(sl[2], sl[1], sl[4]), T(sl[2], sl[3], sl[4]), T(sl[0], sl[3], sl[4])]) }, o.g);
        // the envelope in the slot: on its short edge in the middle of the slot, its face to the room
        o.env = mk('g', {}, o.g);
        o.ef = mk('path', { 'class': 'lv-fill', fill: INK.paper }, o.env);
        o.et = mk('path', { 'class': 'lv-fill', fill: INK.top }, o.env);
        o.er = mk('path', { 'class': 'lv-fill', fill: INK.right }, o.env);
        o.eo = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': 0.85, 'stroke-linejoin': 'round' }, o.env);
        o.ex = (sl[0] + sl[2]) / 2; o.ey = (sl[1] + sl[3]) / 2; o.ez = sl[4];
        o.scr = mk('path', { 'class': 'lv-fill', fill: '#f4f8fb', d: poly([T(d[0], y, d[2]), T(d[1], y, d[2]), T(d[1], y, d[3]), T(d[0], y, d[3])]) }, o.g);
        o.edge = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.detail, 'stroke-width': 0.55, d: poly([T(d[0], y, d[2]), T(d[1], y, d[2]), T(d[1], y, d[3]), T(d[0], y, d[3])]) }, o.g);
        o.lines = order.map(function (pp, k) {
          var z = d[3] - 6 - 7 * k, x0 = d[0] + 5, w = (d[1] - d[0] - 10) * [0.74, 0.52, 0.64][k];
          return mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.accent, 'stroke-width': 0.85, 'stroke-linecap': 'round', d: line([T(x0, y, z), T(x0 + w, y, z)]) }, o.g);
        });
        o.bar = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.accent, 'stroke-width': 1.4, 'stroke-linecap': 'round' }, o.g);
        return o;
      });
      // the couriers and the berth, drawn after the positions: they stand before them. The supply against the end
      // wall by the front, its hood over the berth and the hood's lip, with the couriers' parts, in the order what
      // hides what
      var ren = Canvas(svg, T, L.wall);
      var fixed = [RK.box(12, FR - 8, F0, 44, FR + 48, F0 + 118, { w: 0.85, link: 'supply' }),
                   RK.box(12, FR - 4, F0 + 51, 88, FR + 24, F0 + 57, { w: 0.85, link: 'hood' }),
                   RK.box(44, FR + 22.5, F0 + 48, 88, FR + 24, F0 + 51, { w: 0.55, link: 'lip' })];
      var YAW = RK.rot('z', -Math.PI / 2);                       // its front to the counters
      var CH = ['a_sh', 'a_el', 'a_wr', 'b_sh', 'b_el', 'b_wr', 'c', 'd', 'p0', 'p1', 'p2'];
      // the line begins here (round 42): behind each slot a riser up the back wall from the counter's top, the three
      // into one rail along the wall and round along the left wall to the front, where it leaves the room (on the home,
      // on to Certification; alone, down a spout under the floor). What a slot has drawn in goes up its riser on a
      // carrier 0.35 s after the bezel has answered
      var WT = L.pos[0].slot[1] - 10, ZL = F0 + 208, ZC = L.pos[0].slot[4] + 1.6, XL = WT + 4, YL = WT + 4, YX = L.wall[4] + 12;
      var ways = L.pos.map(function (p) {
        var x = p.slot[0] - 14;
        return Way([[x, YL, ZC], [x, YL, ZL], [XL, YL, ZL], [XL, YX, ZL], [XL, YX, F0 - 44]]);
      });
      var last = ways[ways.length - 1], rails = [];
      ways.forEach(function (w) { w.rail(rails, 0, 1); });
      last.rail(rails, 1, 3);
      var spout = last.rail([], 3, 4), spoutLen = F0 - 44 - ZL < 0 ? ZL - F0 + 44 : 0;
      var dep = SB.map(function (v) { return v + IN + 0.35; });
      [150, 360, 440].forEach(function (x) { rails.push(RK.box(x - 2, WT, ZL - 9, x + 2, WT + 6, ZL - 3, { w: 0.55, link: 'bracket' })); });
      [70, 214].forEach(function (y) { rails.push(RK.box(WT, y - 2, ZL - 9, WT + 6, y + 2, ZL - 3, { w: 0.55, link: 'bracket' })); });
      // the desk's stamp, on the left wall over the line: each carrier stops under it (0.4 s) and the head comes down
      // on its paper (0.1 s down, held 0.15, 0.15 up), its mark lit
      var YS = 140, STAMP = 0.4;
      rails.push(RK.box(WT, YS - 12, ZL + 18, WT + 18, YS + 12, ZL + 32, { w: 0.85, link: 'stamp' }));
      var stop = ways.map(function (w, q) { return (ZL - ZC) + (L.pos[q].slot[0] - 14 - XL) + (YS - YL); });
      function along(q, age) {                                   // how far a carrier of position q has come, its stop counted
        var ts = stop[q] / LINE.V;
        return age < ts ? age * LINE.V : age < ts + STAMP ? stop[q] : stop[q] + (age - ts - STAMP) * LINE.V;
      }
      // when the record of position p reaches the display of position q: the own display first, then the nearer
      function at(p, q) {
        var n = [0, 1, 2].sort(function (a, b) { return Math.abs(a - p) - Math.abs(b - p) || a - b; }).indexOf(q);
        return SB[p] + IN + ANS + STEP * n;
      }
      return function (t) {
        var all = fixed.concat(rails), k, tb = t % D;
        if (!L.linked) all = all.concat(spout);
        var press = 0;
        L.out = [];                                              // those that have left the room: how far beyond it (the home's line goes on with them)
        ways.forEach(function (w, q) {                           // the carriers on the line: this beat's and the last's
          for (var b = 0; b < 2; b++) {
            var age = since(tb, dep[q]) + b * D, d = along(q, age), e = age - stop[q] / LINE.V;
            if (d < w.len - (L.linked ? spoutLen : 0)) w.car(all, d);
            else if (L.linked) L.out.push(d - w.len + spoutLen);
            if (e >= 0 && e < STAMP) press = Math.max(press, e < 0.1 ? std(e / 0.1) : e < 0.25 ? 1 : 1 - std((e - 0.25) / 0.15));
          }
        });
        all.push(RK.box(XL - 3, YS - 6, ZL + 12.4 - 4.4 * press, XL + 3, YS + 6, ZL + 18, { w: 0.55, tone: 'recess', link: 'head' }),
                 RK.box(WT + 18, YS - 5, ZL + 23, WT + 18.2, YS + 5, ZL + 26, { lit: press > 0.5 ? 1 : 0.15, link: 'mark' }));
        for (var n = 0; n < NC; n++) {                           // the couriers, a beat apart on the one round
          var u = (t + n * D) % TURN, q = { run: 0 };
          for (k = 0; k < CH.length; k++) q[CH[k]] = P.val(CH[k], u);
          q.a_j1 = P.val('j', u); q.a_j2 = -q.a_j1;
          var held = -1;
          for (k = 0; k < 3; k++) {
            if (u >= C.tk[k] && u < C.put[k]) held = k;
            q['e' + k] = u < C.tk[k] ? 11 : u < C.fill[k] ? 0 : 11 + 3 * (1 - out3((u - C.fill[k]) / 0.25));
          }
          q.env_a = held >= 0 ? 1 : 0; q.env_b = held >= 0 && u >= C.tb[held] ? 1 : 0; q.a_lit = held >= 0 ? 1 : 0.15;
          q.b_lit = (u >= C.press[0] && u < C.rel[0]) || (u >= C.press[1] && u < C.rel[1]) ? 1 : 0.15;
          mach.place(q, RK.mul(RK.move(P.val('x', u), P.val('yb', u) + 23, F0), YAW), all);
        }
        ren.draw(all);
        // the positions, by the beat
        var sW = since(tb, WIN);
        pos.forEach(function (o, q) {
          var d = o.d, y = d[4];
          // the envelope in the slot: set there by its courier, drawn in once the jaw has let it go
          var sp = since(tb, putB[q]), e2 = sp - (SB[q] - putB[q]), exp = e2 < 0 ? EXP : EXP * (1 - std(e2 / IN));
          if (e2 > IN || exp <= 0.2) o.env.style.opacity = '0';
          else {
            o.env.style.opacity = '1';
            var xa = o.ex - 5.5, xb2 = o.ex + 5.5, ya = o.ey - 0.25, yb2 = o.ey + 0.25, z0 = o.ez, z1 = o.ez + exp;
            o.ef.setAttribute('d', poly([T(xa, yb2, z0), T(xb2, yb2, z0), T(xb2, yb2, z1), T(xa, yb2, z1)]));
            o.et.setAttribute('d', poly([T(xa, ya, z1), T(xb2, ya, z1), T(xb2, yb2, z1), T(xa, yb2, z1)]));
            o.er.setAttribute('d', poly([T(xb2, ya, z0), T(xb2, yb2, z0), T(xb2, yb2, z1), T(xb2, ya, z1)]));
            o.eo.setAttribute('d', poly([T(xa, yb2, z0), T(xa, yb2, z1), T(xa, ya, z1), T(xb2, ya, z1), T(xb2, ya, z0)]) + line([T(xb2, yb2, z0), T(xb2, yb2, z1), T(xa, yb2, z1)]));
          }
          // the bezel answers once the envelope is in
          var a = since(tb, SB[q] + IN);
          o.flash.style.opacity = a < ANS ? (0.75 * Math.sin(Math.PI * a / ANS)).toFixed(3) : '0';
          // the display: lit from the first record set on it until what was held is carried
          var first = Math.min(at(0, q), at(1, q), at(2, q)) - 0.15, span = WIN + BAR + CLR - first, sF = since(tb, first);
          var on = sF < 0.2 ? sF / 0.2 : sF < span ? 1 : sF < span + 0.3 ? 1 - (sF - span) / 0.3 : 0;
          o.scr.style.opacity = on.toFixed(3); o.edge.style.opacity = on.toFixed(3);
          order.forEach(function (p, k) {
            var t0 = at(p, q), s = since(tb, t0), v = 0;
            if (s < WIN + BAR + CLR + 0.3 - t0) v = clamp(s / 0.12, 0, 1) * on * (1 - clamp((s - (WIN + BAR - t0)) / CLR, 0, 1));
            o.lines[k].style.opacity = v.toFixed(3);
          });
          if (sW < BAR + CLR) {
            var x0 = d[0] + 5, w = d[1] - d[0] - 10;
            o.bar.setAttribute('d', line([T(x0, y, d[2] + 5), T(x0 + w * std(clamp(sW / BAR, 0, 1)), y, d[2] + 5)]));
            o.bar.style.opacity = (on * (1 - clamp((sW - BAR) / CLR, 0, 1))).toFixed(3);
          } else o.bar.style.opacity = '0';
        });
      };
    },
    // Certification, a day of 20 s from ten in the morning: the day and its dusk and dawn at two hours a second (eight
    // seconds of it), the night at two thirds of an hour a second (twelve: round 41 gave the night the longer part,
    // for the room's work is done then), the changes of pace eased over a quarter of a second; the clock's one hand goes
    // on with it, always forward; the high window's glass from the day's #DDE5E5 to dusk and night; the room's faces a
    // little darker at night, at most six in a hundred, the lines as they are. The floor's three units keep their docks
    // at the back wall, under the high window, by day; with the night they come out in file, sweep along the bench and
    // round to the front, turn about together, and are back in their docks before dawn (below).
    certify: function (L, T, g, dim, svg) {
      var c = L.clock, cx = c[0], cy = c[1], cz = c[2], r = c[3], hand = c[4], gl = L.glass, F0 = L.floor;
      var face = [];
      for (var i = 0; i < 48; i++) { var an = 2 * Math.PI * i / 48; face.push(T(cx + 0.87 * r * Math.cos(an), cy, cz + 0.87 * r * Math.sin(an))); }
      var glass = mk('path', { 'class': 'lv-fill', d: poly([T(gl[0], gl[4], gl[2]), T(gl[1], gl[4], gl[2]), T(gl[1], gl[4], gl[3]), T(gl[0], gl[4], gl[3])]) }, g);
      var frame = L.lines.map(function (ln) { return mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.detail, 'stroke-width': 0.55, d: line(ln.map(function (p) { return T(p[0], p[1], p[2]); })) }, g); });
      mk('path', { 'class': 'lv-fill', fill: INK.paper, d: poly(face) }, g);
      var hd = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': 1.4, 'stroke-linecap': 'round' }, g);
      var DAY = 20, N = 2000, HR = [];
      // the hour at each moment of the turn: the day's pace with dusk's and dawn's (10:00 to 21:00, 05:00 to 10:00) and
      // the night's (21:00 to 05:00), each change eased over a quarter second, the whole made to come round in exactly
      // twenty-four hours
      (function () {
        function sm(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
        var edges = [[5.5, 2 / 3], [17.5, 2]], dt = DAY / N, rate = [], sum = 0;
        for (var k = 0; k < N; k++) {
          var tt = (k + 0.5) * dt, v = 2, prev = 2;
          edges.forEach(function (e) { v += (e[1] - prev) * sm((tt - e[0] + 0.125) / 0.25); prev = e[1]; });
          rate.push(v); sum += v * dt;
        }
        var h = 10;
        for (var j = 0; j <= N; j++) { HR.push(h); if (j < N) h += rate[j] * dt * 24 / sum; }
      })();
      function hourAt(t) { var x = (t % DAY) / DAY * N, k = Math.floor(x); return (HR[k] + (HR[Math.min(N, k + 1)] - HR[k]) * (x - k)) % 24; }
      var SKY = [[0, '#68788e'], [5, '#68788e'], [6, '#a7b3c2'], [7, L.day || '#dde5e5'], [19, L.day || '#dde5e5'], [20, '#a7b3c2'],
                 [21, '#68788e'], [24, '#68788e']];
      function sky(h) {
        for (var i = 1; i < SKY.length; i++) if (h <= SKY[i][0]) { var a = SKY[i - 1], b = SKY[i]; return mix(a[1], b[1], inout((h - a[0]) / (b[0] - a[0]))); }
        return SKY[0][1];
      }
      function dark(h) { return h < 5 || h > 21 ? 1 : h < 7 ? 1 - (h - 5) / 2 : h > 19 ? (h - 19) / 2 : 0; }
      // the floor's units (FL-1, tools/robokit/robots.js), 48 by 40 cm and 10 high, their equipment bays at their backs,
      // three of them (round 41; before it, one), each with its dock: a plate on the floor, its contacts on the back
      // wall, which it meets nose first, the three docks side by side along the back wall, under the high window. Their
      // runs keep to the floor that nothing in the room stands before: between the bench and the standing desk (the
      // desk's top passes over what is that far from it) and along the front, short of the desk's near legs. With the
      // night they back out of their docks half a second apart (0.5 s each), turn (0.4 s) and go out in file: the
      // second and the third along the back wall to the first's line, then all along the bench and round to the front
      // (4.4 s each, their corners round, 20 cm). Along the bench the first two carry their edge module, folded along
      // the left side (two lengths of 12 and 10 cm lying flat and a flat shoe 14 cm long), swung out square to the side
      // (0.45 s) so the shoe runs under the bench's edge, the unit going straight on, its sweep 22 cm wider, and fold
      // it again (0.45 s) before they turn. They stop in file, the first far along the front, the second behind it, the
      // third at the end of the bench; turn about together (0.5 s); go back the way they came (2 s), the third now
      // leading; the two that came along the wall turn to it (0.35 s), and each goes into its own dock (0.7 s) before
      // dawn
      var X0 = L.glass[0] + 18, Y0 = cy + 24, wy = cy - 4, YO = Y0 + 30, DX = 58;
      var XD = [X0, X0 + DX, X0 + 2 * DX], NU = XD.length;      // the docks: the first on the bench's line, the others on to its right
      var ren = Canvas(svg, T, L.wall), FL = RK_MACHINES.M.floor, mach = new RK.Machine(FL);
      var docks = [];
      for (var n = 0; n < NU; n++) {
        docks.push(RK.box(XD[n] - 30, wy + 0.5, F0, XD[n] + 30, wy + 58, F0 + 0.5, { w: 0.55, tone: 'top', link: 'plate' }),
                   RK.box(XD[n] - 9, wy, F0 + 0.5, XD[n] + 9, wy + 4, F0 + 15, { w: 0.85, link: 'contacts' }));
      }
      var WAY = [[[X0, YO], [X0, 300], [X0 + 108, 300]],
                 [[XD[1], YO], [X0, YO], [X0, 300], [X0 + 108 - DX, 300]],
                 [[XD[2], YO], [X0, YO], [X0, 250]]];
      var T0 = 6.6, TA = T0 + 0.5 * (NU - 1) + 0.5 + 0.4 + 4.4 + 0.1, TH = TA + 0.5, NORTH = -Math.PI / 2;
      function heading(rt, d) { var a = rt.at(Math.max(0, d - 1)), b = rt.at(Math.min(rt.len, d + 1)); return Math.atan2(b[1] - a[1], b[0] - a[0]); }
      function turn(a, b, f) { var d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * f; }
      var units = WAY.map(function (w, n) {
        var out = Route(w, 20), home = Route(w.slice().reverse(), 20), xd = XD[n];
        var dOut = drive(out.len, 4.4), dHome = drive(home.len, 2.0);
        var t0 = T0 + 0.5 * n, t1 = t0 + 0.5, t2 = t1 + 0.4, t3 = t2 + 4.4, t5 = TH + 2.0 + (n === 1 ? 0.3 : 0), t6 = t5 + (n ? 0.35 : 0), t7 = t6 + 0.7;
        var h0 = heading(out, 0), h1 = heading(out, out.len), h2 = heading(home, home.len);
        // where the unit is and which way its front looks at u: docked facing the wall (-y)
        return function (u) {
          var d, p;
          if (u < t0 || u >= t7) return [xd, Y0, NORTH, 0];
          if (u < t1) return [xd, Y0 + 30 * std((u - t0) / 0.5), NORTH, 0];             // backs out
          if (u < t2) return [xd, YO, turn(NORTH, h0, std((u - t1) / 0.4)), 0];          // turns to its way
          if (u < t3) { d = out.len * dOut((u - t2) / 4.4); p = out.at(d); return [p[0], p[1], heading(out, d), 1]; }
          p = out.at(out.len);
          if (u < TA) return [p[0], p[1], h1, 0];                                       // stands in file
          if (u < TH) return [p[0], p[1], h1 + Math.PI * std((u - TA) / 0.5), 0];       // about
          if (u < TH + 2.0) { d = home.len * dHome((u - TH) / 2.0); p = home.at(d); return [p[0], p[1], heading(home, d), 0]; }
          if (u < t5) return [xd, YO, h2, 0];                                           // (the second waits for the third's turn)
          if (u < t6) return [xd, YO, turn(h2, NORTH, std((u - t5) / 0.35)), 0];         // to the wall
          return [xd, YO - 30 * std((u - t6) / 0.7), NORTH, 0];                          // in, nose first
        };
      });
      function sm(v, a, b) { v = clamp((v - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); }
      // the line goes through (round 42): in through the back wall near its left end, along the wall over the high
      // window and the clock, out through the end wall; three carriers every ten seconds, as Replies sends them. On
      // the back wall, between the window and the clock, the room's own sender: once a day, in the morning, its mark
      // lights and a carrier goes up its riser and on with the rest
      var WT = cy - 4, ZL = F0 + 236, YL = WT + 4, XE = 70, XS = 311, PT = 10, SEND = 17.9;
      var thru = Way([[XE, WT, ZL], [XE, YL, ZL], [L.wall[3], YL, ZL]]), send = Way([[XS, YL, F0 + 143], [XS, YL, ZL], [L.wall[3], YL, ZL]]);
      var rails = thru.rail([]);
      send.rail(rails, 0, 1);
      rails.push(RK.box(XS - 15, WT, F0 + 100, XS + 15, WT + 12, F0 + 140, { w: 0.85, link: 'sender' }));
      [150, 250, 400, 480].forEach(function (x) { rails.push(RK.box(x - 2, WT, ZL - 9, x + 2, WT + 6, ZL - 3, { w: 0.55, link: 'bracket' })); });
      return function (t) {
        var h = hourAt(t), dk = inout(dark(h));
        glass.setAttribute('fill', sky(h));
        frame.forEach(function (e) { e.setAttribute('stroke', mix(INK.detail, '#b4bfca', dk)); });
        var a = (90 - 30 * h) * Math.PI / 180;
        hd.setAttribute('d', line([T(cx, cy, cz), T(cx + hand * r * Math.cos(a), cy, cz + hand * r * Math.sin(a))]));
        if (dim) dim.style.opacity = dk.toFixed(3);
        var u = t % DAY, all = docks.concat(rails);
        L.out = [];                                              // those gone out through the end wall: how far beyond it
        passing(t, PT, function (age) { var d = age * LINE.V; thru.car(all, d); if (d >= thru.len) L.out.push(d - thru.len); });
        var sd = u - SEND;
        if (sd < -DAY / 2) sd += DAY;
        send.car(all, sd * LINE.V);
        if (sd * LINE.V >= send.len) L.out.push(sd * LINE.V - send.len);
        all.push(RK.box(XS - 7, WT + 12, F0 + 130, XS + 7, WT + 12.2, F0 + 133, { lit: sd > -0.9 && sd < 0.5 ? 1 : 0.15, link: 'mark' }));
        units.forEach(function (where, n) {
          var p = where(u), x = p[0], y = p[1];
          // the edge module: out along the bench, by where the unit is on its way out (the first two)
          var m = n < 2 && p[3] && Math.abs(x - X0) < 0.5 ? sm(y, 112, 146) * (1 - sm(y, 236, 270)) : 0;
          var q = { e_sh: -90 * m, e_el: 180 + 180 * m, e_wr: -180 - 90 * m, lit: m > 0.98 ? 1 : 0.15 };
          mach.place(q, RK.mul(RK.move(x, y, F0), RK.rot('z', p[2])), all);
        });
        ren.draw(all);
      };
    },

    // Records, four runners at four racks (round 41; before it one runner went along all the racks in a turn of 52 s).
    // The store's runner (RN-3, tools/robokit/robots.js: its body 56 by 50 cm and 28 high, a guide near its side toward
    // the racks, a carriage on the guide's far face) works with three arms on the carriage: D, the drawer arm (16 and
    // 14 cm, low on the carriage's left), its hook a bar across to the pull; the carrier, a slide under a tray; P, the
    // picker (20 and 18 cm, from the carriage's top at its right), a bar across to a pair of fingers over the middle.
    // Each rack has its runner, which keeps before it. A turn (about 14 s): the carriage goes to the row that is called
    // while the runner runs to the rack's first drawer; D's hook comes to the pull (0.3 s; the drawer's edge lights as
    // it is called) and draws the drawer out on its slides 11 cm (0.6 s), where it holds it; the tray goes out to the
    // drawer's front (0.65 s); P comes over the card, goes down, takes it by its head, lifts it 4 cm clear of the
    // drawer, carries it over the drawer's front and sets it on the tray against its stop; P goes back to rest while
    // the tray comes back (0.65 s), and only then is the drawer run back (0.55 s) and let go. The card rides on the tray
    // to the rack's second drawer in the same row, where it is set in the same way. Four turns, each at another row,
    // make a runner's round; the four runners keep the one round, each a quarter of a turn after its neighbour on the
    // left and each with its own order of rows, so that at any moment four drawers of the store are at some stage of
    // the same work. A runner's lights are on the hook's lock and on the fingers' block. Drawn from their parts by
    // robokit, all together.
    records: function (L, T, g, dim, svg) {
      var yf = L.yf, BAY = L.bay, MOD = L.mod, UPR = L.up, OUT = 11, F0 = L.floor, Z0 = L.drawers[0][1];
      behindWall(svg, g, T, L.wall);
      var R = RK_MACHINES.M.runner, Q = R.poses, mach = new RK.Machine(R);
      var YB = yf + 32, CY = YB + 25;                            // the body's far face; its middle (the machine's frame)
      var CIN = CY + Q.HOOK, HOFF = CY + Q.HOFF;                 // the hook: at a closed drawer's pull; off, clear of it
      var ROWS = [[0, -2, 1, -4], [-3, 0, 2, -1], [1, -4, 0, -2], [-1, 2, -3, 0]];   // each runner's rows, from the marked one
      var NR = L.drawers.length >> 1, TURN = 0;
      function drawer(x0) {
        var o = { x0: x0, z0: Z0, ev: null };
        o.sig = mk('path', { 'class': 'lv-fill', fill: LIT }, g);
        o.g = mk('g', {}, g);
        o.right = mk('path', { 'class': 'lv-fill', fill: INK.right }, o.g);
        o.slide = mk('path', { 'class': 'lv-fill', fill: '#a3aeb5' }, o.g);         // its slide, under its side
        o.tray = mk('path', { 'class': 'lv-fill', fill: INK.paper }, o.g);
        o.top = mk('path', { 'class': 'lv-fill', fill: INK.top }, o.g);
        o.front = mk('path', { 'class': 'lv-fill', fill: INK.left }, o.g);
        o.seal = mk('path', { 'class': 'lv-fill', fill: LIT }, o.g);
        o.pull = mk('path', { 'class': 'lv-line', fill: INK.left, stroke: INK.ink, 'stroke-width': 0.55, 'stroke-linejoin': 'round' }, o.g);
        o.sheets = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.detail, 'stroke-width': 0.55 }, o.g);
        o.folds = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': 0.55, 'stroke-linejoin': 'round' }, o.g);
        o.sil = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': 0.85, 'stroke-linejoin': 'round' }, o.g);
        return o;
      }
      var runners = [];
      for (var r = 0; r < NR; r++) {
        var xa = L.drawers[2 * r][0], xb = L.drawers[2 * r + 1][0], XD = [xa + BAY / 2, xb + BAY / 2];
        var rows = ROWS[r % ROWS.length], last = Z0 + rows[rows.length - 1] * MOD + 1;
        var P = Plan({ x: XD[1], cz: last, cf: HOFF, ce: 0, py: Q.PY_R, pz: Q.PZ_R, pf: 0 }), ev = [];
        rows.forEach(function (row) {
          [0, 1].forEach(function (i) {
            if (!i) P.also({ cz: Z0 + row * MOD + 1 }, P.at() + 0.15, 0.8);   // the carriage to the row, on the way
            P.run('x', XD[i], 1.15);
            var e = { i: i, z0: Z0 + row * MOD };
            e.tc = P.go({ cf: CIN }, 0.3);                       // the hook to the pull
            P.go({ cf: CIN + OUT }, 0.6);                        // the drawer drawn out, and held
            P.go({ ce: 1 }, 0.65);                               // the tray out to it
            var from = i ? [Q.PY_T, Q.PZ_T] : [Q.PY_D, Q.PZ_D], to = i ? [Q.PY_D, Q.PZ_D] : [Q.PY_T, Q.PZ_T];
            P.also({ pf: -Q.OPEN }, P.at() + 0.3, 0.2);
            P.go({ py: from[0], pz: Q.PZ_UP }, 0.6);             // P over the card
            P.go({ pz: from[1] }, 0.25);                         // down to its head
            e.pick = P.go({ pf: Q.SHUT }, 0.15);                 // takes it
            P.go({ pz: Q.PZ_UP }, 0.35);                         // lifts it clear
            P.go({ py: to[0] }, 0.4);                            // over the drawer's front
            P.go({ pz: to[1] }, 0.25);                           // down onto the tray, or into the drawer
            e.put = P.go({ pf: -Q.OPEN }, 0.15);                 // lets it go
            P.go({ pz: Q.PZ_UP }, 0.3);
            P.also({ py: Q.PY_R, pz: Q.PZ_R }, P.at(), 0.55);    // P back to rest
            P.also({ pf: 0 }, P.at() + 0.2, 0.3);
            P.go({ ce: 0 }, 0.65);                               // the tray back
            e.tr = P.go({ cf: CIN }, 0.55);                      // the drawer run back
            P.go({ cf: HOFF }, 0.25);                            // the hook off
            P.wait(0.3);
            ev.push(e);
          });
        });
        TURN = P.at();
        runners.push({ P: P, ev: ev, d: [drawer(xa), drawer(xb)] });
      }
      var STEP = TURN / ROWS[0].length / NR;                     // a quarter of a turn between neighbours
      var ren = Canvas(svg, T, L.wall);
      // the line ends here (round 42): in through the left end wall, along the back wall over the racks, across the
      // aisle on a beam and down a post into the receiving cabinet at the front, three carriers every ten seconds; the
      // cabinet's mark lights as each comes in. The steward (ST-6: six arms in three pairs down its column's front)
      // stands at the cabinet and works at its top, its own turn of 8 s. Over the racks the tally flyer (FY-2, round 44: a
      // pod between two rings that lean into each move; its perch a shelf on the left end wall, live while it sits
      // there) leaves its perch, stops over each rack in turn, comes down to it, reads (its light lit) and goes on;
      // from the last it comes back to the perch: two rounds to the runners' one
      var WT = yf - 76, ZL = F0 + 242, YL = WT + 4, XC = 320, YC = 226, PT = 10;
      var way = Way([[WT, YL, ZL], [XC, YL, ZL], [XC, YC, ZL], [XC, YC, F0 + 60]]);
      var fixed = way.rail([]);
      fixed.push(RK.box(XC - 20, YC - 30, F0, XC + 20, YC + 30, F0 + 58, { w: 0.85, link: 'cabinet' }));
      [120, 230].forEach(function (x) { fixed.push(RK.box(x - 2, WT, ZL - 9, x + 2, WT + 6, ZL - 3, { w: 0.55, link: 'bracket' })); });
      var ST = RK_MACHINES.M.steward, stew = new RK.Machine(ST), SB_ = RK.move(XC - 98, YC, F0);
      var FY = RK_MACHINES.M.flyer, SC = RK_MACHINES.M.scout, fly = new RK.Machine(SC), XF = 68, YF = (yf - 46 + yf) / 2, ZF = F0 + 224;
      var PF = TURN / 2, BIG = [1.15, 0, 0, 0, 0, 1.15, 0, 0, 0, 0, 1.15, 0];
      // its perch: a shelf off the wall, two rails for its skids, the contact's block behind (its light: live)
      fixed.push(RK.box(22, YF - 26, ZF - 3.6, XF + 24, YF + 26, ZF - 1.6, { w: 0.85, link: 'perch' }));
      fixed.push(RK.box(XF - 12, YF - 5.6, ZF - 1.6, XF + 12, YF - 4, ZF, { w: 0.55, tone: 'dark', link: 'perch' }));
      fixed.push(RK.box(XF - 12, YF + 4, ZF - 1.6, XF + 12, YF + 5.6, ZF, { w: 0.55, tone: 'dark', link: 'perch' }));
      fixed.push(RK.box(22, YF - 9, ZF - 1.6, 31, YF + 9, ZF + 9, { w: 0.85, link: 'perch' }));
      var flight = (function () {
        var K = { mx: [[0, 0]], my: [[0, 0], [PF, 0]], mz: [[0, 0], [1.5, 0], [2.3, 3]], fork: [[0, 0], [PF, 0]], probe: [[0, 0], [PF, 0]], lit: [[0, 0.15]],
                  live: [[0, 1], [0.8, 1], [1.0, 0]], gate: [[0, 0], [1.0, 0], [1.4, -3.6]], wipe: [[0, 0], [PF, 0]] };
        var at = 2.3, x = 0;
        K.mx.push([at, 0]);
        for (var r = 0; r < NR; r++) {
          var xr = -(L.drawers[2 * r][0] + BAY + UPR / 2 - XF), hop = Math.max(1.6, Math.abs(xr - x) / 78);
          at += hop; K.mx.push([at, xr]); K.mz.push([at, 3]); x = xr;                 // over the rack
          at += 0.55; K.mz.push([at, -10]); K.lit.push([at - 0.02, 0.15], [at, 1]);  // down to it: read
          at += 0.8; K.mz.push([at, -10]); K.lit.push([at, 1], [at + 0.02, 0.15]);
          at += 0.55; K.mz.push([at, 3]); K.mx.push([at, xr]);
        }
        at += Math.abs(x) / 130; K.mx.push([at, 0]); K.mz.push([at, 3]);              // back to the dock
        at += 0.8; K.mz.push([at, 0]);
        K.gate.push([at, -3.6], [at + 0.5, 0], [PF, 0]); K.live.push([at + 0.7, 0], [at + 1.0, 1], [PF, 1]);
        K.mx.push([PF, 0]); K.mz.push([PF, 0]); K.lit.push([PF, 0.15]);
        return FY.flight(K, PF);
      })();
      // where a runner's card is: in a drawer, held by P (what of it is below a drawer's top while over it is in it),
      // on the tray
      function card(rn, t, x, cz, py, pz, out) {
        for (var m = 0; m < rn.ev.length; m += 2) {
          var A = rn.ev[m], B = rn.ev[m + 1];
          if (t >= A.pick && t < A.put || t >= B.pick && t < B.put) {
            var e = t < A.put ? A : B, y = CY + py, z0 = cz + pz - Q.CARD[0], z1 = cz + pz - Q.CARD[1];
            var front = yf + 2.2 + (t >= e.tc && t <= e.tr ? clamp(rn.P.val('cf', t) - CIN, 0, OUT) : 0);
            if (y < front) z0 = Math.max(z0, e.z0 + MOD - 0.6);
            if (z1 - z0 > 0.05) out.push(RK.box(x - 13, y - 0.25, z0, x + 13, y + 0.25, z1, { tone: 'paper', link: 'card' }));
            return 0;
          }
          if (t >= A.put && t < B.pick) return 1;                // on the tray between them
        }
        return 0;
      }
      return function (t) {
        var all = fixed.slice(), in0 = 99;
        passing(t, PT, function (age) { var d = age * LINE.V; way.car(all, d); if (d >= way.len) in0 = Math.min(in0, (d - way.len) / LINE.V); });
        all.push(RK.box(XC + 6, YC - 12, F0 + 58, XC + 14, YC + 12, F0 + 58.4, { lit: in0 < 0.5 ? 1 : 0.15, link: 'mark' }));
        stew.place(ST.work(t), SB_, all);
        var fq = flight(t);
        all.push(RK.box(31, YF - 3, ZF + 5, 31.2, YF + 3, ZF + 7, { lit: fq.live, link: 'perch' }));
        fly.place(SC.pose({ fwd: -fq.acc.mx, climb: fq.acc.mz, lit: fq.lit }), RK.mul(RK.move(XF - fq.mx, YF, ZF + fq.mz), BIG), all);
        runners.forEach(function (rn, n) {
          var P = rn.P, u = (t + n * STEP) % TURN;
          var x = P.val('x', u), cz = P.val('cz', u), cf = P.val('cf', u);
          rn.d.forEach(function (o, i) {
            var e = null;
            for (var k = i; k < rn.ev.length; k += 2) if (u >= rn.ev[k].tc - 0.3 && u <= rn.ev[k].tr + 0.5) { e = rn.ev[k]; break; }
            if (!e) { o.sig.style.opacity = '0'; o.g.style.display = 'none'; return; }
            if (o.ev !== e) {                                    // called at this row: its edge, where it lights
              o.ev = e; o.z0 = e.z0;
              var sz = e.z0 + MOD - 0.6, sy = yf + 2.3;
              o.sig.setAttribute('d', poly([T(o.x0 + 0.8, sy, sz - 3.4), T(o.x0 + BAY - 0.8, sy, sz - 3.4), T(o.x0 + BAY - 0.8, sy, sz), T(o.x0 + 0.8, sy, sz)]));
            }
            var d = u >= e.tc && u <= e.tr ? clamp(cf - CIN, 0, OUT) : 0;
            // its edge lights as the runner reaches it, and goes out after it is let go
            o.sig.style.opacity = (u < e.tc ? out3((u - e.tc + 0.3) / 0.3) : u < e.tr ? 1 : 1 - clamp((u - e.tr) / 0.5, 0, 1)).toFixed(3);
            if (d < 0.3) { o.g.style.display = 'none'; return; }
            o.g.style.display = '';
            var xa = o.x0 + 0.8, xb = o.x0 + BAY - 0.8, za = o.z0 + 0.6, zb = o.z0 + MOD - 0.6, yb = yf + 2.2 + d, yp = yf + d;
            var y1 = yf + 1.0, y3 = yf + 3.5, sd = yb > y3;
            o.right.setAttribute('d', sd ? poly([T(xb, y3, za), T(xb, yb, za), T(xb, yb, zb), T(xb, y3, zb)]) : '');
            o.slide.setAttribute('d', sd ? poly([T(xb + 0.05, y3, za), T(xb + 0.05, yb - 0.6, za), T(xb + 0.05, yb - 0.6, za + 1.6), T(xb + 0.05, y3, za + 1.6)]) : '');
            o.tray.setAttribute('d', yp > y1 ? poly([T(xa, y1, zb), T(xb, y1, zb), T(xb, yp, zb), T(xa, yp, zb)]) : '');
            o.top.setAttribute('d', poly([T(xa, Math.max(y1, yp), zb), T(xb, Math.max(y1, yp), zb), T(xb, yb, zb), T(xa, yb, zb)]));
            o.front.setAttribute('d', poly([T(xa, yb, za), T(xb, yb, za), T(xb, yb, zb), T(xa, yb, zb)]));
            o.seal.setAttribute('d', poly([T(xa, yb + 0.05, zb - 3.4), T(xb, yb + 0.05, zb - 3.4), T(xb, yb + 0.05, zb), T(xa, yb + 0.05, zb)]));
            var xm = o.x0 + BAY / 2, zm = o.z0 + MOD / 2 - 0.8;
            o.pull.setAttribute('d', poly([T(xm - 6, yb + 1.2, zm - 0.6), T(xm + 6, yb + 1.2, zm - 0.6), T(xm + 6, yb + 1.2, zm + 0.6), T(xm - 6, yb + 1.2, zm + 0.6)]));
            // the cards standing in the drawer, their heads seen from above (the one to be lifted, or set in, the nearest)
            var sh = '', inCard = i ? u >= e.put : u < e.pick;
            for (var k2 = inCard ? 0.5 : 1; k2 <= 3; k2 += k2 < 1 ? 0.5 : 1) { var ys = yp - 5.5 * k2; if (ys > y1 + 0.5) sh += line([T(xa + 2.5, ys, zb), T(xb - 2.5, ys, zb)]); }
            o.sheets.setAttribute('d', sh);
            // the folds: the front's head and its side; the panel's back, on the top and on the side; the tray's rim
            o.folds.setAttribute('d', line([T(xa, yb, zb), T(xb, yb, zb)]) +
              (sd ? line([T(xb, yb, zb), T(xb, yb, za)]) + line([T(xb, y3, zb), T(xb, yb, zb)]) : '') +
              (yp > y1 ? line([T(xa, yp, zb), T(xb, yp, zb)]) + line([T(xa + 1.2, y1, zb), T(xa + 1.2, yp, zb)]) : '') +
              (yp > y3 ? line([T(xb, yp, zb), T(xb, yp, za)]) : ''));
            // the outline of what is seen of it
            o.sil.setAttribute('d', sd
              ? poly([T(xa, y1, zb), T(xb, y1, zb), T(xb, y3, zb), T(xb, y3, za), T(xb, yb, za), T(xa, yb, za), T(xa, yb, zb)])
              : poly([T(xa, y1, zb), T(xb, y1, zb), T(xb, yb, zb), T(xb, yb, za), T(xa, yb, za), T(xa, yb, zb)]));
          });
          // the runner: its arms posed from their points, its card where it is
          var py = P.val('py', u), pz = P.val('pz', u), held1 = rn.ev.some(function (e) { return u >= e.tc && u <= e.tr; });
          var q = R.pose({ lift: cz - F0, hy: cf - CY, ce: -OUT * P.val('ce', u), py: py, pz: pz, pf: P.val('pf', u), dw: 0, dr: 0,
                           cin: 0, cp: 0, h_lit: held1 ? 1 : 0.15 });
          var boxes = [];
          q.con = card(rn, u, x, cz, py, pz, boxes);
          q.p_lit = boxes.length ? 1 : 0.15;
          mach.place(q, RK.move(x, CY, F0), all);
          for (var b = 0; b < boxes.length; b++) all.push(boxes[b]);
        });
        ren.draw(all);
      };
    },
  };

  // The seat (round 29) is drawn by the house's machines themselves (robokit: /assets/js/machines.js, fetched only
  // where a picture asks for it), on a canvas over the bare picture: the store's part under the hall's floor, kept off
  // where the floor stands before it, the hall's over all. It begins at the picture's own still moment, so the
  // picture and its first frame are the same.
  var kit = null;
  function machines(done) {
    if (window.RK_SEAT) { done(); return; }
    if (!kit) {
      kit = [];
      var cs = document.currentScript || document.querySelector('script[src*="/assets/js/house.js"]');
      var e = document.createElement('script');
      e.src = '/assets/js/machines.js' + (cs && cs.src.indexOf('?') > 0 ? cs.src.slice(cs.src.indexOf('?')) : '');
      e.onload = function () { kit.forEach(function (f) { f(); }); kit = null; };
      document.head.appendChild(e);
    }
    if (kit) kit.push(done);
  }
  // The store's far bay, close (round 31), the same way: the whole scene on the canvas (the rack's parts and the
  // flyer ordered together, so its dock hides it as it goes in), over a bare frame.
  function canvasScene(M, F, cv, img, k0) {
    var C = Math.cos(Math.PI / 6), ctx = cv.getContext('2d'), d = 1, kd = 1, bay = M.kind === 'bay';
    var seat = bay ? new RK_BAY.Bay(M) : new RK_SEAT.Seat(M);
    var P = function (x, y, z) { return [((x - y) * C - F[0]) * F[2] + F[3], ((x + y) / 2 - z - F[1]) * F[2] + F[3]]; };
    var hp = [];
    if (!bay) for (var i = 0; i < 8; i++) hp.push(P(i & 1 ? M.x1 : 0, i & 2 ? M.ys : 0, i & 4 ? M.slab[1] : M.slab[0]));
    if (!bay) hp = hull(hp);
    var last = 0, cost = 0;
    return function (t) {
      var now = window.performance ? performance.now() : Date.now();
      if (last && cost > 8 && now - last < 30) return;     // where a picture costs more than 8 ms, thirty a second
      last = now;
      var r = img.getBoundingClientRect();
      d = Math.min(2, window.devicePixelRatio || 1); kd = r.width / F[4];
      var w = Math.round(r.width * d), h = Math.round(r.height * d);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      ctx.setTransform(kd * d, 0, 0, kd * d, 0, 0);
      ctx.clearRect(-2, -2, F[4] + 4, F[5] + 4);
      var f = seat.frame(t), lw = k0 / kd;
      if (bay) {
        new RK.Painter(ctx, P, lw).draw(f.all);
        var end = window.performance ? performance.now() : Date.now();
        cost = cost ? cost * 0.9 + (end - now) * 0.1 : end - now;
        return;
      }
      ctx.save();
      ctx.beginPath(); ctx.rect(-10, -10, F[4] + 20, F[5] + 20);
      ctx.moveTo(hp[0][0], hp[0][1]);
      for (var j = 1; j < hp.length; j++) ctx.lineTo(hp[j][0], hp[j][1]);
      ctx.closePath(); ctx.clip('evenodd');
      new RK.Painter(ctx, P, lw).draw(f.store);
      ctx.restore();
      new RK.Painter(ctx, P, lw).draw(f.hall);
      var done = window.performance ? performance.now() : Date.now();
      cost = cost ? cost * 0.9 + (done - now) * 0.1 : done - now;
    };
  }

  // A machine at work on its plate (round 45): <canvas data-plate="runner"> on a page that has no room of its own (a
  // role's page: the machine it works beside). robokit's machine by that name through its own round of work
  // (machine.work), with the things it works at (machine.props) and a plate under them; fitted to the canvas by what
  // it reaches over a whole round, so that it never leaves it. It runs while in view, as the rooms do; under reduced
  // motion it stands at rest. In the drawings' tones, and the night's.
  (function () {
    var cvs = slice(document.querySelectorAll('canvas[data-plate]'));
    if (!cvs.length) return;
    machines(function () {
      cvs.forEach(function (cv) {
        var m = RK_MACHINES.M[cv.getAttribute('data-plate')], ctx = cv.getContext && cv.getContext('2d');
        if (!m || !ctx) return;
        var mach = new RK.Machine(m), P0 = RK.iso(1, [0, 0]), T0 = parseFloat(cv.getAttribute('data-t')) || 0, last = 0;
        var props = (m.props || []).map(function (b) { return RK.box(b.at[0], b.at[1], b.at[2], b.at[0] + b.size[0], b.at[1] + b.size[1], b.at[2] + b.size[2], { w: b.w || 0.55, tone: b.tone, link: 'prop' }); }).filter(Boolean);
        var pose = function (t) { return m.work && !mq.matches ? m.work(t + T0) : m.rest; };
        var boxes = function (t) { var q = pose(t); return mach.place(q, RK.move(q.dx || 0, q.dy || 0, q.dz || 0)).concat(props); };
        // what it reaches: in the room's own units (for the plate) and in the picture's
        var lo = [1e9, 1e9], hi = [-1e9, -1e9], N = m.work && !mq.matches ? 32 : 1, per = m.period || 8, e;
        for (var i = 0; i < N; i++) boxes(i * per / N - T0).forEach(function (b) {
          b.c.forEach(function (c) { if (c[0] < lo[0]) lo[0] = c[0]; if (c[1] < lo[1]) lo[1] = c[1]; if (c[0] > hi[0]) hi[0] = c[0]; if (c[1] > hi[1]) hi[1] = c[1]; });
        });
        var plate = RK.box(lo[0] - 14, lo[1] - 14, -1.6, hi[0] + 14, hi[1] + 14, 0, { w: 0.85, tone: 'paper', link: 'plate' });
        e = [[1e9, 1e9], [-1e9, -1e9]];
        for (var k = 0; k < N; k++) { var ex = RK.extent(boxes(k * per / N - T0).concat([plate]), P0); for (var a = 0; a < 2; a++) { e[0][a] = Math.min(e[0][a], ex[0][a]); e[1][a] = Math.max(e[1][a], ex[1][a]); } }
        var draw = function (t) {
          var w = cv.clientWidth, h = cv.clientHeight, d = Math.min(2, window.devicePixelRatio || 1);
          last = t;
          if (!w || !h) return;
          if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
          var sc = Math.min((w - 20) / (e[1][0] - e[0][0]), (h - 20) / (e[1][1] - e[0][1]), 3.6);
          var P = RK.iso(sc, [w / 2 - sc * (e[0][0] + e[1][0]) / 2, h / 2 - sc * (e[0][1] + e[1][1]) / 2]);
          ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
          var pen = new RK.Painter(ctx, P, 1);
          pen.tint = LIGHT.night ? tint : null;
          pen.draw(boxes(t).concat([plate]));
        };
        cv.hidden = false;
        lights(function () { draw(last); });
        if (mq.matches || !m.work) { draw(0); window.addEventListener('resize', function () { draw(0); }); }
        else runner(cv, draw);
      });
    });
  })();

  (function () {
    var pics = slice(document.querySelectorAll('picture[data-live]'));
    if (!pics.length || mq.matches) return;
    var C = Math.cos(Math.PI / 6), live = [];
    // The plant between the rooms (rounds 42 and 43), where the three stand on one page with room beside them (the home,
    // on a desk). Round 42 drew the line from room to room; round 43 makes of the page one works, the rooms its three
    // levels, and puts beside the line what a works has outside its rooms:
    // - two service shafts, Replies down to Certification and Certification down to the records: with the line, two
    //   ducts (34 cm square, a collar every 140 cm; on one a fan unit, a steward on a deck beside it at work at its
    //   head) and a cable tray (a ladder, a rung every 36 cm).
    //   The ducts come out from under Replies' floor, where a main runs along its front; the trays run on the heads of
    //   the walls and from one room's to the next's;
    // - a main along the front of each room under its floor, with its stubs up to the floor's edge; a cabinet on each
    //   end wall's face, its conduit up to the tray;
    // - the yard's flyers (FY-4, round 44: a hull on four rings that lean, robokit's freighter): four of them (three
    //   where the page is narrow) go round from Replies' pad down the first shaft's side to a pad behind
    //   Certification's back wall, on over that room and down to a pad off the records' left wall, and up again by a
    //   lane beside, a case carried down and none up. Each turns to its lane in the air over a pad, leans into every
    //   start and against every stop, lets its legs down for a pad, and has its light lit on one;
    // - two tally flyers (FY-2, the freighter's small kin) along the trays on Replies' and the records' back walls.
    // Every length keeps to the drawings' own three directions (along a room, across it, upright), each from a point of
    // one room to a point of the next, so the whole is one thing in one space with the rooms. What goes in behind a wall
    // stops at the wall (each group is cut by the shape of the room it goes behind). The line's carriers are the rooms'
    // own (what a room has sent out, by that room's clock); the flyers keep the page's clock. Drawn by robokit over the
    // stage, in the drawings' tones and their night: what stands still as one <svg> painted once, what moves on
    // canvases (round 44), a flying machine on a canvas of its own that is moved as a whole.
    var rooms = {}, stage = document.querySelector('.work__stage'), plant = null, linkT = 0;
    function between() { clearTimeout(linkT); linkT = setTimeout(link, 120); }
    function put(out, b) { if (b) out.push(b); }
    // a square duct w across, through points joined one axis at a time; a collar every 140 cm
    function duct(out, pts, w, lw) {
      var h = w / 2;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], ax = a[0] !== b[0] ? 0 : a[1] !== b[1] ? 1 : 2, l = Math.abs(b[ax] - a[ax]), s = b[ax] > a[ax] ? 1 : -1;
        if (l < 0.5) continue;
        var lo = [Math.min(a[0], b[0]) - h, Math.min(a[1], b[1]) - h, Math.min(a[2], b[2]) - h], hi = [Math.max(a[0], b[0]) + h, Math.max(a[1], b[1]) + h, Math.max(a[2], b[2]) + h];
        put(out, RK.box(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2], { w: lw || 0.85, link: 'duct' }));
        for (var n = Math.floor(l / 140), k = 1; k <= n; k++) {
          var c = a.slice(); c[ax] += s * k * l / (n + 1);
          var cl = [c[0] - h - 2.5, c[1] - h - 2.5, c[2] - h - 2.5], ch = [c[0] + h + 2.5, c[1] + h + 2.5, c[2] + h + 2.5];
          cl[ax] = c[ax] - 1.5; ch[ax] = c[ax] + 1.5;
          put(out, RK.box(cl[0], cl[1], cl[2], ch[0], ch[1], ch[2], { w: 0.55, link: 'collar' }));
        }
      }
    }
    // a cable tray w wide: two rails and a rung every 36 cm; up or down, it is wide across wa (0: along a room, 1: across it)
    function ladder(out, pts, w, wa) {
      var h = w / 2;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], ax = a[0] !== b[0] ? 0 : a[1] !== b[1] ? 1 : 2, l = Math.abs(b[ax] - a[ax]), s = b[ax] > a[ax] ? 1 : -1;
        if (l < 0.5) continue;
        var u = ax === 2 ? wa : 1 - ax;                          // the axis it is wide across
        [-1, 1].forEach(function (e) {
          var lo = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], hi = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
          lo[u] += e * h - 1; hi[u] += e * h + 1;
          if (ax === 2) { lo[1 - u] -= 1; hi[1 - u] += 1; } else { hi[2] += 3; lo[ax] -= 1; hi[ax] += 1; }
          put(out, RK.box(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2], { w: 0.55, link: 'tray' }));
        });
        for (var d = 18; d < l - 6; d += 36) {
          var c = a.slice(); c[ax] += s * d;
          var rl = c.slice(), rh = c.slice();
          rl[u] -= h - 1; rh[u] += h - 1; rl[ax] -= 1; rh[ax] += 1;
          if (ax === 2) { rl[1 - u] -= 0.5; rh[1 - u] += 0.5; } else { rl[2] += 0.5; rh[2] += 1.5; }
          put(out, RK.box(rl[0], rl[1], rl[2], rh[0], rh[1], rh[2], { w: 0.55, tone: 'recess', link: 'rung' }));
        }
      }
    }
    function link() {
      if (!stage || !window.RK || !rooms.reply || !rooms.certify || !rooms.records) return;
      var s0 = stage.getBoundingClientRect();
      function at(kind, x, y, z) {
        var R = rooms[kind], r = R.img.getBoundingClientRect(), p = R.T(x, y, z), k = r.width / R.F[4];
        return [r.left - s0.left + p[0] * k, r.top - s0.top + p[1] * k, R.F[2] * k];
      }
      function proj(o, s) { return function (x, y, z) { return [o[0] + (x - y) * C * s, o[1] + ((x + y) / 2 - z) * s]; }; }
      // from S to E on the picture: how far along the axis (1: across the rooms, toward the lower left; 0: along them,
      // toward the lower right), and how far down
      function along(S, E, s, ax) { var dx = (E[0] - S[0]) / s / C, dy = (E[1] - S[1]) / s; return ax ? [-dx, dy + dx / 2] : [dx, dy - dx / 2]; }
      function uniq(pts) { return pts.filter(function (p, i) { return !i || Math.abs(p[0] - pts[i - 1][0]) + Math.abs(p[1] - pts[i - 1][1]) + Math.abs(p[2] - pts[i - 1][2]) > 0.5; }); }
      // a lane from S to E in its own frame (from S): along its axis a1, down, along to the end
      function lane(S, E, s, ax, a1) {
        var l = along(S, E, s, ax), a = l[0], v = l[1];
        a1 = Math.max(0, Math.min(a, a1));
        return { pts: uniq(ax ? [[0, 0, 0], [0, a1, 0], [0, a1, -v], [0, a, -v]] : [[0, 0, 0], [a1, 0, 0], [a1, 0, -v], [a, 0, -v]]), P: proj(S, s), a: a, v: v, a1: a1 };
      }
      var Lr = rooms.reply.L, Lc = rooms.certify.L, Lx = rooms.records.L;
      var FR = Lr.floor, FC = Lc.floor, FX = Lx.floor, ZR = FR + 208, ZC = FC + 236, ZX = FX + 242;
      var WR = Lr.pos[0].slot[1] - 10, WC = Lc.clock[1] - 4, WX = Lx.yf - 76;          // the walls' thickness
      var DR = Lr.wall[4], DC = Lc.wall[4], DX_ = Lx.wall[4], LR = Lr.wall[3], LC = Lc.wall[3], LX = Lx.wall[3];
      var A = at('reply', WR + 4, DR + 12, ZR), B = at('certify', 70, 0, ZC), Cc = at('certify', LC, WC + 4, ZC), D = at('records', 0, WX + 4, ZX);
      var s1 = (A[2] + B[2]) / 2, s2 = (Cc[2] + D[2]) / 2;
      var la = along(A, B, s1, 1), lb = along(Cc, D, s2, 0);
      var ok = la[0] > 60 && lb[0] > 24 && matchMedia('(min-width: 901px)').matches;
      Lr.linked = ok;
      if (plant) { plant.stop(); plant = null; }
      if (!ok) return;
      var A1 = Math.min(110, la[0] * 0.4), B1 = Math.min(70, lb[0] * 0.4);
      // two pictures over the stage: what stands still, drawn once, and what moves, drawn at each frame (so the still
      // one, by far the larger, is painted once). In each, the same groups: what goes behind a room is cut by the room's
      // shape on the page
      function sheet(pre, pts) {
        sheet.n = (sheet.n || 0) + 1;
        var el = mk('svg', { 'class': 'work__line' + (pre === 'm' ? ' work__line--live' : ''), 'aria-hidden': 'true', focusable: 'false' }), defs = mk('defs', {}, el);
        stage.appendChild(el);
        if (pts) {                                               // no larger than what it holds: these points and 190 px round them
          var x0 = Math.min.apply(null, pts.map(function (q) { return q[0]; })) - 190, y0 = Math.min.apply(null, pts.map(function (q) { return q[1]; })) - 190;
          var x1 = Math.max.apply(null, pts.map(function (q) { return q[0]; })) + 190, y1 = Math.max.apply(null, pts.map(function (q) { return q[1]; })) + 190;
          el.style.left = Math.floor(x0) + 'px'; el.style.top = Math.floor(y0) + 'px'; el.style.width = Math.ceil(x1 - x0) + 'px'; el.style.height = Math.ceil(y1 - y0) + 'px';
          el.style.overflow = 'hidden';
          el = mk('g', { transform: 'translate(' + (-Math.floor(x0)) + ' ' + (-Math.floor(y0)) + ')' }, el);
        }
        function behind(kind, Lv) {
          var id = 'pl' + sheet.n + '-' + kind, cp = mk('clipPath', { id: id }, defs), hp = [];
          for (var i = 0; i < 8; i++) { var p = at(kind, i & 1 ? Lv.wall[3] : 0, i & 2 ? Lv.wall[4] : 0, i & 4 ? Lv.wall[5] : Lv.floor - 25); hp.push([p[0], p[1]]); }
          mk('path', { 'clip-rule': 'evenodd', d: 'M-4000 -4000H8000V12000H-4000Z' + poly(hull(hp)) }, cp);
          return mk('g', { 'clip-path': 'url(#' + id + ')' }, el);
        }
        var o = { el: el.ownerSVGElement || el, R0: behind('reply', Lr), L1: behind('certify', Lc) };
        o.C0 = mk('g', {}, o.L1); o.L2 = behind('records', Lx); o.X0 = mk('g', {}, o.L2); o.Top = mk('g', {}, el); o.Fly = mk('g', {}, el);
        return o;
      }
      // What moves is painted on two canvases, one to a shaft, each no larger than what moves in it (round 44: as
      // <svg> it cost the page its evenness). A canvas is cleared only where it was painted; what goes behind the room
      // at a shaft's foot is cut by that room's shape on the page
      // what stands still is an <svg> painted once: its tones are turned in its own attributes
      function retone() {
        var night = LIGHT.night;
        slice(SS.el.querySelectorAll('path')).forEach(function (e) {
          ['fill', 'stroke'].forEach(function (a) {
            var v = e.getAttribute('data-' + a) || e.getAttribute(a);
            if (!v || v === 'none') return;
            if (!e.hasAttribute('data-' + a)) e.setAttribute('data-' + a, v);
            e.setAttribute(a, night ? tint(v) : v);
          });
        });
      }
      // one machine on a canvas of its own, moved over the stage as a whole and painted again only when its pose has
      // changed: reach, up, down (cm): how far its picture goes to either side of its origin, above it, below it
      function sprite(reach, up, down, S0) {
        var w = Math.ceil(2 * reach * S0) + 8, h = Math.ceil((up + down) * S0) + 8, d = 2, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
        var ox = w / 2, oy = up * S0 + 4, pen = new RK.Painter(ctx, null, 1), o;
        cv.className = 'work__spr'; cv.setAttribute('aria-hidden', 'true');
        cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = w * d; cv.height = h * d;
        stage.appendChild(cv);
        return (o = { cv: cv, S0: S0, P: proj([ox, oy], S0), z: -1,
          paint: function (list) {
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(d, 0, 0, d, 0, 0);
            pen.tint = LIGHT.night ? tint : null; pen.paint(list);
          },
          at: function (x, y, k, z) {
            cv.style.transform = 'translate(' + (x - ox * k).toFixed(2) + 'px,' + (y - oy * k).toFixed(2) + 'px) scale(' + k.toFixed(4) + ')';
            if (z !== o.z) { cv.style.zIndex = String(3 + z); o.z = z; }
          } });
      }
      function layer(pts, kind, Lv) {
        var x0 = Math.floor(Math.min.apply(null, pts.map(function (q) { return q[0]; })) - 190), y0 = Math.floor(Math.min.apply(null, pts.map(function (q) { return q[1]; })) - 190);
        var w = Math.ceil(Math.max.apply(null, pts.map(function (q) { return q[0]; })) + 190) - x0, h = Math.ceil(Math.max.apply(null, pts.map(function (q) { return q[1]; })) + 190) - y0;
        var cv = document.createElement('canvas'), ctx = cv.getContext('2d'), d = Math.min(2, window.devicePixelRatio || 1);
        if (w * h * d * d > 6e6) d = Math.max(1, Math.sqrt(6e6 / (w * h)));
        cv.className = 'work__cv'; cv.setAttribute('aria-hidden', 'true');
        cv.style.left = x0 + 'px'; cv.style.top = y0 + 'px'; cv.style.width = w + 'px'; cv.style.height = h + 'px';
        cv.width = Math.round(w * d); cv.height = Math.round(h * d);
        stage.appendChild(cv);
        var hp = [], dirty = [], pen = new RK.Painter(ctx, null, 1);
        for (var i = 0; i < 8; i++) { var p = at(kind, i & 1 ? Lv.wall[3] : 0, i & 2 ? Lv.wall[4] : 0, i & 4 ? Lv.wall[5] : Lv.floor - 25); hp.push([p[0], p[1]]); }
        hp = hull(hp);
        return { cv: cv,
          begin: function () {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            for (var i = 0; i < dirty.length; i++) ctx.clearRect(dirty[i][0], dirty[i][1], dirty[i][2], dirty[i][3]);
            dirty.length = 0;
            ctx.setTransform(d, 0, 0, d, -x0 * d, -y0 * d);
            pen.tint = LIGHT.night ? tint : null;
          },
          // boxes in order, each with its picture; behind: cut by the room at the shaft's foot
          put: function (list, behind) {
            if (!list.length) return;
            var a0 = Infinity, b0 = Infinity, a1 = -Infinity, b1 = -Infinity;
            for (var i = 0; i < list.length; i++) { var r = list[i].r; if (r[0] < a0) a0 = r[0]; if (r[1] < b0) b0 = r[1]; if (r[2] > a1) a1 = r[2]; if (r[3] > b1) b1 = r[3]; }
            dirty.push([Math.floor((a0 - x0 - 3) * d), Math.floor((b0 - y0 - 3) * d), Math.ceil((a1 - a0 + 6) * d) + 1, Math.ceil((b1 - b0 + 6) * d) + 1]);
            if (behind) {
              ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h);
              ctx.moveTo(hp[0][0], hp[0][1]);
              for (var j = 1; j < hp.length; j++) ctx.lineTo(hp[j][0], hp[j][1]);
              ctx.closePath(); ctx.clip('evenodd');
            }
            pen.paint(list);
            if (behind) ctx.restore();
          } };
      }
      // the pads' tops, above each room's floor. Replies' is long enough for two flyers side by side, SIDE apart along
      // the room: one place for those going down, one for those come up, so that in the first shaft the lane up runs
      // beside the lane down all the way. Certification's and the records' have the one place: those coming up go by
      // Certification without setting down (pC.u is where they turn, in the air beside its pad)
      var ZP = 268, SIDE = 150, KR = at('reply', 0, 0, 0)[2], KC = at('certify', 0, 0, 0)[2], KX = at('records', 0, 0, 0)[2];
      var pR = { d: at('reply', -110, 190, FR + ZP), u: at('reply', -110 - SIDE, 190, FR + ZP) }, pX = at('records', -73, 29, FX + ZP);
      var pC = { d: at('certify', 284, -84, FC + ZP), u: at('certify', 284 - SIDE, -84, FC + ZP) };
      // in order up the page's layers: what stands still; what moves along each shaft; the machines that have a canvas
      // each
      var SS = sheet('s'), LY = { L1: layer([A, B], 'certify', Lc), L2: layer([Cc, D], 'records', Lx) }, el = SS.el, sprites = [];
      var gR0 = 'R0', gL1 = 'L1', gC0 = 'C0', gL2 = 'L2', gX0 = 'X0', gTop = 'Top';
      function still(g, P, boxes) { var q = mk('g', { 'class': 'rk' }, SS[g]); new RK.Renderer(q, P, 1).draw(boxes); return q; }
      function show(g, P, boxes) { LY[g].put(RK.order(boxes, P), true); }

      // ---- the first shaft: Replies' front, down, to Certification's back wall (lanes side by side along a room)
      var t1 = lane(at('reply', 6, DR, FR + 253), at('certify', 34, 0, FC + 253), s1, 1, A1 + 12 + 46);
      var l1 = lane(A, B, s1, 1, A1);
      var d1 = lane(at('reply', 66, DR + 3, FR - 26), at('certify', 120, 0, ZC - 40), s1, 1, A1 + 9);
      var d2 = lane(at('reply', 112, DR + 3, FR - 26), at('certify', 166, 0, ZC - 40), s1, 1, A1 + 9);
      var w1 = Way(l1.pts, [1, 0]), o;
      o = []; ladder(o, t1.pts, 20, 0); still(gL1, t1.P, o);
      still(gL1, l1.P, w1.rail([], 0, null, 0.85));
      // on the outer duct's drop a fan unit, its mark lit, and beside it a deck where a steward (ST-6) stands and works
      // at the unit's head, at its own turn of 8 s
      var ST = RK_MACHINES.M.steward, stew = new RK.Machine(ST), tend = [];
      [d1, d2].forEach(function (d, n) {
        o = []; duct(o, d.pts, 34);
        var zm = -d.v * 0.5, fan = n && d.v > 300;
        if (fan) {
          put(o, RK.box(-30, d.a1 - 30, zm - 40, 30, d.a1 + 30, zm + 40, { w: 0.85, link: 'fan' }));
          put(o, RK.box(30, d.a1 - 12, zm + 20, 30.2, d.a1 + 12, zm + 24, { lit: 1, link: 'mark' }));
          put(o, RK.box(30, d.a1 - 46, zm - 22, 148, d.a1 + 46, zm - 18, { w: 0.85, link: 'deck' }));
        }
        still(gL1, d.P, o);
        if (fan) tend.push({ g: gL1, P: d.P, B: RK.mul(RK.move(108, d.a1, zm - 18), RK.rot('z', Math.PI)), t0: 0 });
      });
      // ---- the second: Certification's end wall, down, to the records' left wall (lanes side by side across a room)
      var t2 = lane(at('certify', LC, WC / 2, FC + 253), at('records', 0, WX / 2, FX + 253), s2, 0, B1 + 44);
      var l2 = lane(Cc, D, s2, 0, B1);
      var e1 = lane(at('certify', LC, 52, ZC - 40), at('records', 0, 62, ZX - 40), s2, 0, B1);
      var e2 = lane(at('certify', LC, 92, ZC - 40), at('records', 0, 102, ZX - 40), s2, 0, B1);
      var w2 = Way(l2.pts, [0, 1]);
      o = []; ladder(o, t2.pts, 20, 1); still(gL2, t2.P, o);
      still(gL2, l2.P, w2.rail([], 0, null, 0.85));
      [e1, e2].forEach(function (d, n) {
        o = []; duct(o, d.pts, 34);
        var zm = -d.v * 0.72, fan = n && d.v > 300;              // low on its drop, under the level of Certification's steps
        if (fan) {
          put(o, RK.box(d.a1 - 30, -30, zm - 40, d.a1 + 30, 30, zm + 40, { w: 0.85, link: 'fan' }));
          put(o, RK.box(d.a1 - 12, 30, zm + 20, d.a1 + 12, 30.2, zm + 24, { lit: 1, link: 'mark' }));
          put(o, RK.box(d.a1 - 46, 30, zm - 22, d.a1 + 46, 148, zm - 18, { w: 0.85, link: 'deck' }));
        }
        still(gL2, d.P, o);
        if (fan) tend.push({ g: gL2, P: d.P, B: RK.mul(RK.move(d.a1, 108, zm - 18), RK.rot('z', -Math.PI / 2)), t0: 4 });
      });
      // ---- on the rooms themselves: the trays on the walls' heads, the main along the front under the floor with its
      // stubs, the cabinet on the end wall's face and its conduit up
      function fit(kind, Lv, t, trays, main, stubs) {
        var P = proj(at(kind, 0, 0, 0), rooms[kind].F[2] * rooms[kind].img.getBoundingClientRect().width / rooms[kind].F[4]);
        var F0 = Lv.floor, Dv = Lv.wall[4], Lw = Lv.wall[3], b = [];
        trays.forEach(function (tr) { ladder(b, tr, 20, 0); });
        duct(b, main, 34);
        stubs.forEach(function (x) { put(b, RK.box(x - 8, Dv + 4, F0 - 9, x + 8, Dv + 20, F0 - 1, { w: 0.55, link: 'stub' })); });
        put(b, RK.box(Lw, Dv - 44, F0 + 96, Lw + 12, Dv - 10, F0 + 150, { w: 0.85, link: 'cabinet' }));
        put(b, RK.box(Lw + 12, Dv - 33, F0 + 132, Lw + 12.2, Dv - 21, F0 + 136, { lit: 0.15, link: 'mark' }));
        put(b, RK.box(Lw, Dv - 29, F0 + 150, Lw + 4, Dv - 25, F0 + 250, { w: 0.55, link: 'conduit' }));
        return [P, b];
      }
      var f;
      f = fit('reply', Lr, WR, [[[6, 24, FR + 253], [6, DR, FR + 253]], [[18, WR / 2, FR + 253], [LR - 20, WR / 2, FR + 253]]],
              [[LR - 20, DR + 20, FR - 26], [112, DR + 20, FR - 26]], [200, 400, 600]);
      still(gTop, f[0], f[1]);
      f = fit('certify', Lc, WC, [[[34, WC / 2, FC + 253], [LC, WC / 2, FC + 253]]],
              [[20, DC + 20, FC - 26], [LC - 20, DC + 20, FC - 26]], [120, 270, 420]);
      still(gTop, f[0], f[1]);
      f = fit('records', Lx, WX, [[[0, WX / 2, FX + 253], [LX - 20, WX / 2, FX + 253]]],
              [[40, DX_ + 20, FX - 26], [LX - 40, DX_ + 20, FX - 26]], [150, 430, 700]);
      still(gTop, f[0], f[1]);

      // ---- the flyers' pads (each off a wall's head, on two arms) and their lanes: down (a case carried) and up
      function pad(g, kind, x0, y0, x1, y1, z, arms) {
        var R = rooms[kind], P = proj(at(kind, 0, 0, 0), R.F[2] * R.img.getBoundingClientRect().width / R.F[4]), b = [];
        put(b, RK.box(x0, y0, z - 4, x1, y1, z, { w: 0.85, link: 'pad' }));
        put(b, RK.box(x0 + 8, y0 + 8, z, x1 - 8, y0 + 11, z + 0.3, { w: 0.55, tone: 'recess', link: 'pad' }));
        put(b, RK.box(x0 + 8, y1 - 11, z, x1 - 8, y1 - 8, z + 0.3, { w: 0.55, tone: 'recess', link: 'pad' }));
        arms.forEach(function (a) { put(b, RK.box(a[0], a[1], z - 10, a[2], a[3], z - 4, { w: 0.55, link: 'arm' })); });
        still(g, P, b);
      }
      pad(gR0, 'reply', -200 - SIDE, 136, -22, 244, FR + ZP, [[-22, 150, 6, 156], [-22, 224, 6, 230]]);
      pad(gL1, 'certify', 196, -150, 372, -18, FC + ZP, [[216, -18, 222, 6], [346, -18, 352, 6]]);   // (over the shafts' heads: after them)
      pad(gL2, 'records', -124, -36, -22, 94, FX + ZP, [[-22, 4, 6, 10], [-22, 70, 6, 76]]);
      // (Certification's pad has two places, one for those going down and one for those going up; at the ends of the
      // round a flyer comes in and goes out by the one place)
      // a lane's drop stands beside its shaft, clear of the words: the first's left of the tray, as far as its pad
      // below lets it; the second's right of the tray, short of Certification's words
      var heads = slice(stage.querySelectorAll('.wk__head')), box2 = heads[1] ? heads[1].getBoundingClientRect() : null;
      var x1 = t1.P(0, t1.a1, 0)[0], x2 = t2.P(t2.a1, 0, 0)[0], lim2 = box2 && box2.left - s0.left > x2 ? box2.left - s0.left - 52 : x2 + 70;
      function dropY(S, x) { return (S[0] - x) / (C * s1); }     // for a lane across the rooms: how far along before it drops at x on the page
      function dropX(S, x) { return (x - S[0]) / (C * s2); }
      // The lanes. In the first shaft the lane up is the lane down moved SIDE along the room: two flyers pass with air
      // between them everywhere. In the second the two lanes have the one upright over the records' pad, a single
      // track; from its head the lane up runs back SIDE over the lane down and past Certification's pad to where the
      // first shaft's lane up begins, and a flyer turns there in the air and goes on up. The flyers are few enough
      // that one has gone up the single track before the next comes to it. On Replies' pad a flyer come up hops across
      // to the place it goes down from
      var LIFT = 46, lanes = [
        lane(pR.d, pC.d, s1, 1, dropY(pR.d, x1 - 70)), lane(pC.d, pX, s2, 0, dropX(pC.d, Math.max(x2 + 34, lim2))),
        lane(pC.u, pX, s2, 0, dropX(pC.u, Math.max(x2 + 34, lim2))), lane(pR.u, pC.u, s1, 1, dropY(pR.u, x1 - 70 - SIDE * C * s1)),
        lane(pR.u, pR.d, KR, 0, 1e4)];
      // way from rest to rest over a length l: gathered over ta, held at V, lost over ta (short of V where l is short).
      // At t: how far, and the acceleration
      function run(l, V, ta) {
        var v = Math.min(V, l / ta), tc = l / v - ta, T = 2 * ta + tc;
        return { T: T, at: function (t) {
          var u;
          if (t <= 0) return [0, 0];
          if (t >= T) return [l, 0];
          if (t < ta) { u = t / ta; return [v * ta * u * u * u * (1 - u / 2), v / ta * 6 * u * (1 - u)]; }
          if (t > T - ta) { u = (T - t) / ta; return [l - v * ta * u * u * u * (1 - u / 2), -v / ta * 6 * u * (1 - u)]; }
          return [v * ta / 2 + v * (t - ta), 0];
        } };
      }
      function ease5(e) { e = clamp(e, 0, 1); return e * e * e * (10 + e * (-15 + 6 * e)); }
      // a lane as a flight (FY-4): up off the pad, turning there to the lane's heading (h0 to h1, degrees: 0 along a
      // room, 90 across the rooms); its lengths one after another, each from rest to rest, a pause between; down on the
      // next pad, its legs let down on the way. At u: where it is, its heading, its acceleration along it, its legs
      function flight(ln, back, h0, h1, lt, lb, air) {            // air: 'from' or 'to': it begins, or ends, in the air (no pad there)
        var p = ln.pts.map(function (q) { return [q[0], q[1], q[2] + (q[2] === 0 ? lt : lb)]; });   // lt, lb: how high over its upper end's pad, its lower end's
        var from = air !== 'from', to = air !== 'to';
        if (back ? to : from) p.unshift(ln.pts[0].slice());
        if (back ? from : to) p.push(ln.pts[ln.pts.length - 1].slice());
        p = uniq(p);
        p = p.filter(function (q, i) {                           // a point on the way from the one before to the one after: no stop there
          if (!i || i === p.length - 1) return true;
          var a = p[i - 1], b = p[i + 1], n = 0;
          for (var j = 0; j < 3; j++) if (Math.abs(a[j] - q[j]) > 0.5 || Math.abs(b[j] - q[j]) > 0.5) n++;
          return n !== 1;
        });
        if (back) p.reverse();
        var legs = [], t = 0, Y0 = 0.3, TY = Math.abs(h1 - h0) > 100 ? 1.5 : 1.0;
        for (var i = 1; i < p.length; i++) {
          var a = p[i - 1], b = p[i], ax = a[0] !== b[0] ? 0 : a[1] !== b[1] ? 1 : 2, l = Math.abs(b[ax] - a[ax]);
          var r = ax === 2 ? run(l, 240, 0.6) : run(l, 170, 0.7);
          if (ax !== 2 && !legs.some(function (g) { return g.ax !== 2; })) t = Math.max(t, Y0 + TY - 0.1);   // its first length waits for the turn
          legs.push({ a: a, b: b, ax: ax, l: l, t0: t, r: r }); t += r.T + 0.12;
        }
        t -= 0.12;
        var last = legs.length - 1;
        return { P: ln.P, legs: legs, T: t, from: from, to: to, at: function (u) {
          var k = 0;
          while (k < last && u >= legs[k + 1].t0) k++;
          var g = legs[k], m = g.r.at(u - g.t0), e = g.l ? m[0] / g.l : 1;
          return { p: [g.a[0] + (g.b[0] - g.a[0]) * e, g.a[1] + (g.b[1] - g.a[1]) * e, g.a[2] + (g.b[2] - g.a[2]) * e],
                   yaw: h0 + (h1 - h0) * ease5((u - Y0) / TY), acc: g.ax === 2 ? 0 : m[1],
                   down: k === 0 && from ? 1 - ease5(m[0] / 34) : k === last && to ? ease5(1 - (g.l - m[0] - 6) / 50) : 0 };
        } };
      }
      // the round: from Replies' pad down to Certification's, to the records'; up again by the lanes beside; and across
      // Replies' pad. A case is taken up there (it comes up through the pad under the flyer; the fingers shut on it)
      // and let go on the records' (the fingers open; it goes down through the pad)
      var round = [flight(lanes[0], false, 0, 90, LIFT, LIFT), flight(lanes[1], false, 90, 0, LIFT, LIFT),
                   flight(lanes[2], true, 0, -180, LIFT + SIDE, LIFT, 'to'), flight(lanes[3], true, -180, -90, LIFT, (LIFT + SIDE) * s2 / s1, 'from'),
                   flight(lanes[4], false, -90, 0, LIFT, LIFT)];
      var HOLD = [2.0, 1.4, 0.2, 1.0, 2.6];
      // how near the eye a flyer is, from where it is on its lane (the lanes' own frames set on one: Certification's
      // place for those going down): the farther are painted first, so that one passing before another hides it
      var NEAR = [lanes[0].v - lanes[0].a, 0, -SIDE, lanes[3].v - lanes[3].a - SIDE, lanes[3].v - lanes[3].a - SIDE];
      var SCL = [[KR, KC], [KC, KX], [KX, KC], [KC, KR], [KR, KR]];
      var TR = round.reduce(function (a, f2, k) { return a + f2.T + HOLD[k]; }, 0), NF = 4;
      // the single track: a flyer comes to the upright's head, on its way down, no sooner than 1.8 s after the one
      // before it has gone up past it. Where the round is too short for that with four flyers, they wait a little
      // longer on the two pads before; where that would be long, three go round
      (function () {
        var f1 = round[1], f2 = round[2], k = 0;
        while (k < f1.legs.length - 1 && !(f1.legs[k].ax === 2 && k > 0)) k++;
        var need = f1.T - f1.legs[k].t0 + HOLD[1] + f2.legs[0].t0 + f2.legs[0].r.T + 1.8, more = need * NF - TR;
        if (more > 3) { NF = 3; more = need * NF - TR; }
        if (more > 0) { HOLD[0] += more / 2; HOLD[4] += more / 2; TR += more; }
      })();
      var FY = RK_MACHINES.M.freighter, fym = new RK.Machine(FY), kept = [];
      // one flyer at u of the round: what it is doing
      function doing(u) {
        for (var k = 0; k < round.length; k++) {
          var f2 = round[k], H = HOLD[k];
          if (u < f2.T + H) {
            var hold = u >= f2.T, h = u - f2.T, q = f2.at(hold ? f2.T : u), sc = SCL[k], w = ease5(u / f2.T);
            q.k = k; q.s = sc[0] + (sc[1] - sc[0]) * w; q.lit = (hold && f2.to) || (u < 0.3 && f2.from) ? 1 : 0.15;
            q.load = k === 0 ? 1 : k === 1 ? (hold ? 1 - ease5((h - 0.45) / 0.6) : 1) : k < 4 ? 0 : (hold ? ease5((h - 0.3) / 0.8) : 0);
            q.grip = k === 0 ? 0 : k === 1 ? (hold ? ease5((h - 0.2) / 0.25) : 0) : k < 4 ? 1 : (hold ? 1 - ease5((h - 1.2) / 0.3) : 1);
            q.near = q.p[0] + q.p[1] + q.p[2] + NEAR[k];
            return q;
          }
          u -= f2.T + H;
        }
        return null;
      }
      // A flyer is painted again only when its pose has changed by a step (its heading by 2 degrees, its rings' lean
      // by 2), and its parts put in order again only then: while it only moves, its canvas is moved
      var S0 = Math.max(KR, KC, KX);
      function flyers(t) {
        var all = [], n;
        for (n = 0; n < NF; n++) { var q0 = doing((t + n * TR / NF) % TR); if (q0) { q0.n = n; all.push(q0); } }
        all.sort(function (a, b) { return a.near - b.near; });
        for (var m = 0; m < all.length; m++) {
          var q = all[m], c = kept[q.n] || (kept[q.n] = { sp: sprite(92, 98, 56, S0) });
          if (!c.on) { sprites.push(c.sp); c.on = true; }
          var nav = 0.15 + 0.85 * Math.min(1, Math.abs(q.acc) / 240);
          var pose = FY.pose({ acc: q.acc, down: q.down, load: q.load, grip: q.grip, lit: q.lit, nav: nav });
          var ok = Math.round(q.yaw / 2) + '/' + Math.round(pose.tf / 2) + '/' + Math.round(q.down * 7) + '/' + Math.round(q.load * 5) + '/' + Math.round(q.grip * 2);
          var key = ok + '/' + q.lit + '/' + Math.round(nav * 4) + '/' + plant.lit;
          if (c.key !== key) {
            var boxes = fym.place(pose, RK.rot('z', q.yaw * Math.PI / 180)), list;
            if (c.ok === ok && c.perm.length === boxes.length) { RK.picture(boxes, c.sp.P); list = c.perm.map(function (i) { return boxes[i]; }); }
            else { list = RK.order(boxes, c.sp.P); c.perm = list.map(function (b) { return b.k; }); c.ok = ok; }
            c.sp.paint(list); c.key = key;
          }
          var o = round[q.k].P(q.p[0], q.p[1], q.p[2]);
          c.sp.at(o[0], o[1], q.s / S0, m + 1);
        }
      }

      // the tally flyers (FY-2): one along the tray on Replies' back wall's head, one along the records', each outside
      // the wall and faced to its tray: a length of 150 cm at a time (it leans into the start and against the stop),
      // then its feeler out to read, its light lit
      var SC = RK_MACHINES.M.scout, scm = new RK.Machine(SC), BIG = [1.3, 0, 0, 0, 0, 1.3, 0, 0, 0, 0, 1.3, 0];
      var tal = [{ kind: 'reply', K: KR, x0: 60, x1: LR - 60, y: WR / 2 - 54, z: FR + 255 }, { kind: 'records', K: KX, x0: 70, x1: LX - 70, y: WX / 2 - 54, z: FX + 255 }];
      tal.forEach(function (q, n) {
        var N = Math.max(1, Math.floor((q.x1 - q.x0) / 150)), STEP = 2.1, GO = 0.6, P = proj(at(q.kind, 0, 0, 0), q.K), B0 = RK.mul(RK.rot('z', Math.PI / 2), BIG);
        q.sp = sprite(78, 64, 48, q.K); sprites.push(q.sp);
        q.draw = function (t) {
          var u = (t / STEP + n * 3.5) % (2 * N), i = Math.floor(u), f = u - i, w0 = clamp(f / GO, 0, 1), e = ease5(w0), up = u < N;
          var x = q.x0 + 150 * (up ? i + e : 2 * N - i - e);
          // its acceleration along the wall (the fifth-degree step's), as it feels it: it faces the wall, so a move
          // along the room is to its right
          var acc = w0 > 0 && w0 < 1 ? (up ? 1 : -1) * 150 * w0 * (60 + w0 * (-180 + 120 * w0)) / (GO * STEP * GO * STEP) : 0;
          var rd = clamp((f - GO - 0.06) / 0.1, 0, 1) - clamp((f - 0.9) / 0.08, 0, 1);
          var pose = SC.pose({ side: -acc, probe: 9 * rd, lit: rd > 0.95 ? 1 : 0.15 });
          var key = Math.round(pose.roll * 2) + '/' + Math.round(pose.probe * 2) + '/' + pose.lit + '/' + plant.lit;
          if (key !== q.key) { q.sp.paint(RK.order(scm.place(pose, B0), q.sp.P)); q.key = key; }
          var o = P(x, q.y, q.z);
          q.sp.at(o[0], o[1], 1, 0);
        };
      });
      plant = { svg: el, on: false, raf: 0, t: 0, last: 0, n: 0, k: 0, w0: 0, wn: 0, slow: false, lit: 0, was: -1 };
      var leave = lights(function () { if (plant && plant.draw) { plant.lit++; retone(); if (!plant.on) plant.draw(plant.t); } });
      if (LIGHT.night) retone();
      // each of the line's lengths carries what the room behind it has sent out, by that room's own clock: a carrier
      // leaves a room and is on the line outside in the same moment, and where a room stands still so does what it has sent
      plant.draw = function (t) {
        var x1 = [], x2 = [];
        LY.L1.begin(); LY.L2.begin();
        (Lr.out || []).forEach(function (d) { w1.car(x1, d); });
        (Lc.out || []).forEach(function (d) { w2.car(x2, d); });
        show(gL1, l1.P, x1); show(gL2, l2.P, x2);
        if (!(plant.n++ % 3) || plant.lit !== plant.was) tend.forEach(function (o2) {   // the stewards: every third picture
          if (!o2.sp) {
            var c0 = o2.P(o2.B[3], o2.B[7], o2.B[11]);
            o2.sp = sprite(105, 190, 60, 1); sprites.push(o2.sp);
            o2.sp.at(c0[0], c0[1], 1, 0);
            o2.Q = function (x, y, z) { var q = o2.P(x, y, z); return [q[0] - c0[0] + o2.sp.cv.width / 4, q[1] - c0[1] + 190 + 4]; };
          }
          o2.sp.paint(RK.order(stew.place(ST.work(t + o2.t0), o2.B), o2.Q));
        });
        tal.forEach(function (q) { q.draw(t); });
        flyers(t);
        plant.was = plant.lit;
      };
      var step = function (ts) {
        if (!plant || !plant.on) return;
        if (plant.last) plant.t += Math.min(0.1, (ts - plant.last) / 1000);
        plant.last = ts;
        if (ts - plant.w0 > 2000) { plant.slow = plant.wn < 48; plant.w0 = ts; plant.wn = 0; }   // under 24 frames a second: the plant draws every second one
        plant.wn++; plant.k++;
        if (!plant.slow || plant.k % 2) plant.draw(plant.t);
        plant.raf = requestAnimationFrame(step);
      };
      var sync = function () {
        if (!plant) return;
        var go = plant.seen && !document.hidden && !mq.matches;
        if (go && !plant.on) { plant.on = true; plant.last = 0; plant.w0 = window.performance ? performance.now() : 0; plant.wn = 0; plant.raf = requestAnimationFrame(step); }
        else if (!go && plant.on) { plant.on = false; cancelAnimationFrame(plant.raf); }
      };
      plant.seen = !('IntersectionObserver' in window);
      var io = null;
      if (!plant.seen) { io = new IntersectionObserver(function (es) { if (plant) { plant.seen = es[0].isIntersecting; sync(); } }, { rootMargin: '100px' }); io.observe(stage); }
      document.addEventListener('visibilitychange', sync);
      plant.stop = function () { this.on = false; cancelAnimationFrame(this.raf); if (io) io.disconnect(); document.removeEventListener('visibilitychange', sync); leave(); SS.el.remove(); LY.L1.cv.remove(); LY.L2.cv.remove(); sprites.forEach(function (sp) { sp.cv.remove(); }); };
      plant.draw(plant.t);
      sync();
    }
    pics.forEach(function (pic) {
      var img = pic.querySelector('img'), fig = pic.parentNode, L;
      try { L = JSON.parse(pic.getAttribute('data-live')); } catch (e) { return; }
      if (!img || !(L.canvas || SCENES[L.kind])) return;
      var svg = null, dim = null, run = null, small = null, base = 0;
      function place() {
        if (!svg) return;
        var r = img.getBoundingClientRect(), f = fig.getBoundingClientRect();
        [svg, dim].forEach(function (e) {
          if (!e) return;
          e.style.left = (r.left - f.left) + 'px'; e.style.top = (r.top - f.top) + 'px';
          e.style.width = r.width + 'px'; e.style.height = r.height + 'px';
        });
        (svg._cv || []).forEach(function (o) { o.fit(); });
        between();
      }
      function build() {
        var src = img.currentSrc || img.src, s = /-s(-bare)?\.svg/.test(src);
        if (svg && s === small) { place(); return; }
        if (run) { base += run.now(); run.stop(); }
        var t0 = base;
        gone(svg);
        if (dim) dim.remove();
        small = s;
        var F = L.frames[s ? 's' : 'l'];
        if (L.canvas) {                                   // the seat: the machines on a canvas, from the still moment
          svg = document.createElement('canvas');
          svg.className = 'draw__live'; svg.setAttribute('aria-hidden', 'true');
          dim = null;
          fig.classList.add('is-live');
          fig.appendChild(svg);
          place();
          var draw = canvasScene(L[s ? 's' : 'l'], F, svg, img, s ? 0.7 : 1), still = L[s ? 's' : 'l'].still;
          run = runner(img, function (t) { draw(still + t + t0); });
          if (L.bare) bare(true);
          return;
        }
        var T = function (x, y, z) { return [((x - y) * C - F[0]) * F[2] + F[3], ((x + y) / 2 - z - F[1]) * F[2] + F[3]]; };
        T.k = s ? 0.7 : 1; T.small = s;
        svg = mk('svg', { 'class': 'draw__live', viewBox: '0 0 ' + F[4] + ' ' + F[5], 'aria-hidden': 'true', focusable: 'false' });
        var g = mk('g', {}, svg);
        if (L.kind === 'certify') {             // the night over the whole drawing: its own shape, a little darker
          dim = document.createElement('div');
          dim.className = 'draw__dim';
          dim.style.webkitMaskImage = dim.style.maskImage = 'url("' + src + '")';
        } else dim = null;
        fig.classList.add('is-live');
        fig.appendChild(svg);
        if (dim) fig.appendChild(dim);
        place();
        var frame = SCENES[L.kind](L, T, g, dim, svg);
        run = runner(img, function (t) { frame(t + t0); });
        if (L.bare) bare(true);
        rooms[L.kind] = { img: img, T: T, F: F, L: L };
        between();
      }
      // a picture whose moving parts the page draws over it (the seat, round 26): while they are drawn, the still
      // picture without them, fetched first so the change is not seen; back to the whole picture when they stop
      var isBare = false;
      function bare(on) {
        if (on === isBare) return;
        isBare = on;
        var swap = function (v) { return on ? v.replace(/(-bare)?\.svg$/, '-bare.svg') : v.replace(/-bare\.svg$/, '.svg'); };
        var go = function () {
          slice(pic.querySelectorAll('source')).forEach(function (e) { e.setAttribute('srcset', swap(e.getAttribute('srcset'))); });
          img.setAttribute('src', swap(img.getAttribute('src')));
        };
        if (!on) { go(); return; }
        var pre = new Image();
        pre.onload = function () { if (isBare) go(); };
        pre.src = swap(img.currentSrc || img.src);
      }
      function start() { build(); live.push({ stop: function () { if (run) run.stop(); gone(svg); if (dim) dim.remove(); fig.classList.remove('is-live'); bare(false); } }); }
      var robo = L.canvas || L.kind === 'reply' || L.kind === 'certify' || L.kind === 'records';   // drawn by robokit
      function ready() { if (robo) machines(start); else start(); }
      if (img.complete && img.naturalWidth) ready(); else img.addEventListener('load', ready, { once: true });
      img.addEventListener('load', function () { if (!robo || window.RK_SEAT) build(); });   // a phone's picture and a wider one: each its frame
      if ('ResizeObserver' in window) new ResizeObserver(place).observe(img);
      window.addEventListener('resize', place);
      live.push({ stop: function () { if (plant) { plant.stop(); plant = null; } } });
    });
    var off = function () { if (mq.matches) live.forEach(function (l) { l.stop(); }); };
    if (mq.addEventListener) mq.addEventListener('change', off); else if (mq.addListener) mq.addListener(off);
  })();

  /* ------------------------------------------------------------------------------------------- 12. the map's day */
  // The home's map of the desks keeps a day of the reader's own date (round 24e), a day in 24 s from the hour it is
  // now: the night side goes west over Earth at the sun's even pace, the land in it darker, deeper past six degrees
  // under; the desks keep their marks (a desk's hours are its own), the seat among them. Out of view, or with the page
  // hidden, the day waits. Without the script, and under reduced motion, the map is still, with no night.
  (function () {
    var fig = document.querySelector('[data-dmap]');
    if (!fig || mq.matches) return;
    var svg = fig.querySelector('.dmap__svg'), land = svg && svg.querySelector('.dmap__land');
    if (!land) return;
    var rad = Math.PI / 180, DAY = 24;
    // Equal Earth, as the site draws the map (src/register.py): the viewBox 1000 wide, latitudes 84 N to 56 S
    var A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
    var XMAX = 2 * Math.sqrt(3) * Math.PI / (3 * A1), S = 1000 / (2 * XMAX);
    function ee(lon, lat) {
      var th = Math.asin(M * Math.sin(lat * rad)), t2 = th * th, t6 = t2 * t2 * t2;
      return [2 * Math.sqrt(3) * lon * rad * Math.cos(th) / (3 * (9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1)),
              th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))];
    }
    var YTOP = ee(0, 84)[1], H = svg.viewBox.baseVal.height;
    function at(lon, lat) { var p = ee(lon, lat); return [S * (p[0] + XMAX), S * (YTOP - p[1])]; }
    // the sun on the reader's date: its declination, and where it stands overhead at the reader's present moment
    var now = new Date(), n = now.getTime() / 864e5 + 2440587.5 - 2451545.0;
    var Lm = (280.46 + 0.9856474 * n) % 360, gm = ((357.528 + 0.9856003 * n) % 360) * rad;
    var lam = (Lm + 1.915 * Math.sin(gm) + 0.02 * Math.sin(2 * gm)) * rad, eps = (23.439 - 4e-7 * n) * rad;
    var dec = Math.asin(Math.sin(eps) * Math.sin(lam)) / rad;
    if (Math.abs(dec) < 0.5) dec = dec < 0 ? -0.5 : 0.5;
    var ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / rad;
    var gmst = (280.46061837 + 360.98564736629 * n) % 360;
    var sub0 = ((ra - gmst) % 360 + 540) % 360 - 180;           // the longitude under the sun now
    // the land's dots, each its place on Earth (the map's projection undone, once)
    function unat(px, py) {
      var x = px / S - XMAX, y = YTOP - py / S, th = y / A1, t2, t6;
      for (var k = 0; k < 10; k++) {
        t2 = th * th; t6 = t2 * t2 * t2;
        th -= (th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2)) - y) / (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2));
      }
      t2 = th * th; t6 = t2 * t2 * t2;
      var sp = Math.sin(th) / M;
      if (Math.abs(sp) > 1) return null;
      return [3 * x * (9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1) / (2 * Math.sqrt(3) * Math.cos(th)) / rad, Math.asin(sp)];
    }
    var BANDS = 12, W = svg.viewBox.baseVal.width, dots = [], re = /M(-?[\d.]+) (-?[\d.]+)h0/g, m, ld = land.getAttribute('d');
    while ((m = re.exec(ld))) {
      var ll = unat(+m[1], +m[2]);
      if (ll) dots.push({ s: 'M' + m[1] + ' ' + m[2] + 'h0', lon: ll[0], sp: Math.sin(ll[1]), cp: Math.cos(ll[1]), k: 0,
                          b: Math.max(0, Math.min(BANDS - 1, Math.floor(+m[1] / W * BANDS))) });
    }
    // the night: the land's dots under it drawn again, darker, in two depths (the sun under the horizon; more than six
    // degrees under it), in twelve upright bands of the map, a band redrawn only as its dots change, ten times a
    // second at most
    var NS = 'http://www.w3.org/2000/svg';
    function el(tag, attrs, parent, before) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (before) parent.insertBefore(e, before); else if (parent) parent.appendChild(e);
      return e;
    }
    var after = land.nextSibling, night = el('g', { 'class': 'dmap__night' }, svg, after), bands = [];
    for (var bi = 0; bi < BANDS; bi++) bands.push({ dusk: el('path', { 'class': 'dmap__land dmap__land--dusk', d: '' }, night),
                                                    deep: el('path', { 'class': 'dmap__land dmap__land--night', d: '' }, night), dots: [], dirty: true });
    dots.forEach(function (d) { bands[d.b].dots.push(d); });
    // the desks keep their marks as they are: a desk's hours are its own (the relay's link windows at a reply desk),
    // and the map draws only the sun
    var sinD = Math.sin(dec * rad), cosD = Math.cos(dec * rad), RISE = Math.sin(-0.833 * rad), DEEP = Math.sin(-6 * rad);
    var drawn = -1;
    function frame(t) {
      var sub = sub0 - 360 * t / DAY, fade = Math.max(0.01, Math.min(1, t / 0.8)).toFixed(3);   // drawn from the first, all but unseen
      if (drawn < 0 || t - drawn >= 0.1) {
        drawn = t;
        dots.forEach(function (d) {
          var e = d.sp * sinD + d.cp * cosD * Math.cos((d.lon - sub) * rad), k = e < DEEP ? 2 : e < RISE ? 1 : 0;
          if (k !== d.k) { d.k = k; bands[d.b].dirty = true; }
        });
        bands.forEach(function (bd) {
          if (!bd.dirty) return;
          bd.dirty = false;
          var a = '', b = '';
          bd.dots.forEach(function (d) { if (d.k === 1) a += d.s; else if (d.k === 2) b += d.s; });
          bd.dusk.setAttribute('d', a); bd.deep.setAttribute('d', b);
        });
      }
      night.style.opacity = fade;
    }
    var run = runner(svg, frame);
    fig.classList.add('is-day');
    var off = function () {
      if (!mq.matches) return;
      run.stop(); night.remove(); fig.classList.remove('is-day');
    };
    if (mq.addEventListener) mq.addEventListener('change', off); else if (mq.addListener) mq.addListener(off);
  })();

})();

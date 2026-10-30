/* The house's one script. It requests nothing from anyone, stores nothing and reads nothing back; the pages are
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
    var r = slip.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) return;          // already in view on arrival: it stands, printed
    slip.classList.add('is-ready');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { slip.classList.add('is-printed'); io.disconnect(); } });
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
    var r = { ratio: 0, area: 0, on: false, gone: false }, running = false, t = 0, last = 0, raf = 0;
    function step(ts) {
      if (!running) return;
      if (last) t += Math.min(0.1, (ts - last) / 1000);
      last = ts;
      frame(t);
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

  // The house's machines: purpose-built and as common as the furniture, each drawn over the picture from boxes and
  // bars in the house's tones, the near faces' meeting folded and the outline round what is seen; a dark skirt at its
  // foot, its wheels seen under its side. No face and no eye (the industry code bars the infant schema): a machine's
  // light is where it works, a short mark in the accent on a tool's lock, lit while the tool holds.
  var LIT = '#5b8dd3', SKIRT = '#8e9ba4', WHEEL = '#4f5d68';
  function Box(par, T, tone) {
    tone = tone || {};
    var o = { g: mk('g', {}, par) }, k = T.k || 1;              // a phone's picture: its machines' lines lighter
    o.top = mk('path', { 'class': 'lv-fill', fill: tone.top || INK.top }, o.g);
    o.fy = mk('path', { 'class': 'lv-fill', fill: tone.y || INK.left }, o.g);
    o.fx = mk('path', { 'class': 'lv-fill', fill: tone.x || INK.right }, o.g);
    o.fold = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': (tone.f || 0.55) * k, 'stroke-linejoin': 'round' }, o.g);
    o.sil = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': (tone.w || 0.85) * k, 'stroke-linejoin': 'round' }, o.g);
    o.set = function (x0, x1, y0, y1, z0, z1) {
      if (x1 - x0 < 0.05 || y1 - y0 < 0.05 || z1 - z0 < 0.05) { o.g.style.display = 'none'; return o; }
      o.g.style.display = '';
      var a = T(x0, y0, z1), b = T(x1, y0, z1), c = T(x1, y1, z1), d = T(x0, y1, z1), e = T(x1, y0, z0), f = T(x1, y1, z0), h = T(x0, y1, z0);
      o.top.setAttribute('d', poly([a, b, c, d]));
      o.fy.setAttribute('d', poly([d, c, f, h]));
      o.fx.setAttribute('d', poly([b, e, f, c]));
      o.fold.setAttribute('d', line([d, c, b]) + line([c, f]));
      o.sil.setAttribute('d', poly([a, b, e, f, h, d]));
      return o;
    };
    o.hide = function () { o.g.style.display = 'none'; return o; };
    return o;
  }
  // a flat strip on a box's near face: on the plane y = c from x0 to x1, or on the plane x = c from y0 to y1
  function Strip(par, T, fill) {
    var o = { p: mk('path', { 'class': 'lv-fill', fill: fill }, par) };
    o.y = function (c, x0, x1, z0, z1) { o.p.setAttribute('d', poly([T(x0, c, z0), T(x1, c, z0), T(x1, c, z1), T(x0, c, z1)])); return o; };
    o.x = function (c, y0, y1, z0, z1) { o.p.setAttribute('d', poly([T(c, y0, z0), T(c, y1, z0), T(c, y1, z1), T(c, y0, z1)])); return o; };
    return o;
  }
  // a bar between two points in a plane x = c (a length of an arm): its side toward the eye, its +x face, the end
  // toward the eye, the fold between the first two and its outline; w: half its width (in x), t: half its depth
  function Bar(par, T, tone) {
    tone = tone || {};
    var o = { g: mk('g', {}, par) }, k = T.k || 1;
    o.fs = mk('path', { 'class': 'lv-fill', fill: INK.top }, o.g);
    o.fx = mk('path', { 'class': 'lv-fill', fill: INK.right }, o.g);
    o.fe = mk('path', { 'class': 'lv-fill', fill: INK.left }, o.g);
    o.fold = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': (tone.f || 0.55) * k, 'stroke-linejoin': 'round' }, o.g);
    o.sil = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': (tone.w || 0.85) * k, 'stroke-linejoin': 'round' }, o.g);
    o.set = function (c, a, b, w, t) {
      o.g.style.display = '';
      var dy = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dy, dz) || 1, ny = -dz / l, nz = dy / l;
      if (ny + nz < 0) { ny = -ny; nz = -nz; }
      var A = [a[0] - ny * t, a[1] - nz * t], B = [b[0] - ny * t, b[1] - nz * t], C = [b[0] + ny * t, b[1] + nz * t], D = [a[0] + ny * t, a[1] + nz * t];
      function P(x, q) { return T(x, q[0], q[1]); }
      o.fs.setAttribute('d', poly([P(c - w, D), P(c + w, D), P(c + w, C), P(c - w, C)]));
      o.fs.setAttribute('fill', nz >= Math.abs(ny) ? INK.top : INK.left);
      o.fx.setAttribute('d', poly([P(c + w, A), P(c + w, B), P(c + w, C), P(c + w, D)]));
      o.fx.setAttribute('fill', INK.right);
      var E = dy + dz > 0 ? [B, C] : [A, D], up = Math.abs(dz) > Math.abs(dy);
      o.fe.setAttribute('d', poly([P(c - w, E[0]), P(c + w, E[0]), P(c + w, E[1]), P(c - w, E[1])]));
      o.fe.setAttribute('fill', up ? INK.top : INK.left);
      o.fold.setAttribute('d', line([P(c + w, D), P(c + w, C)]));
      var pts = [];
      [A, B, C, D].forEach(function (q) { pts.push(P(c - w, q), P(c + w, q)); });
      o.sil.setAttribute('d', poly(hull(pts)));
      return o;
    };
    // the same in a plane y = c, its points given as [x, z]; w: half its width (in y)
    o.setY = function (c, a, b, w, t) {
      o.g.style.display = '';
      var dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      if (nx + nz < 0) { nx = -nx; nz = -nz; }
      var A = [a[0] - nx * t, a[1] - nz * t], B = [b[0] - nx * t, b[1] - nz * t], C = [b[0] + nx * t, b[1] + nz * t], D = [a[0] + nx * t, a[1] + nz * t];
      function P(y, q) { return T(q[0], y, q[1]); }
      o.fs.setAttribute('d', poly([P(c - w, D), P(c + w, D), P(c + w, C), P(c - w, C)]));
      o.fs.setAttribute('fill', nz >= Math.abs(nx) ? INK.top : INK.right);
      o.fx.setAttribute('d', poly([P(c + w, A), P(c + w, B), P(c + w, C), P(c + w, D)]));
      o.fx.setAttribute('fill', INK.left);
      var E = dx + dz > 0 ? [B, C] : [A, D], up = Math.abs(dz) > Math.abs(dx);
      o.fe.setAttribute('d', poly([P(c - w, E[0]), P(c + w, E[0]), P(c + w, E[1]), P(c - w, E[1])]));
      o.fe.setAttribute('fill', up ? INK.top : INK.right);
      o.fold.setAttribute('d', line([P(c + w, D), P(c + w, C)]));
      var pts = [];
      [A, B, C, D].forEach(function (q) { pts.push(P(c - w, q), P(c + w, q)); });
      o.sil.setAttribute('d', poly(hull(pts)));
      return o;
    };
    // lying flat, in a plane z = c, its points given as [x, y]; w: half its height (in z)
    o.setZ = function (c, a, b, w, t) {
      o.g.style.display = '';
      var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      if (nx + ny < 0) { nx = -nx; ny = -ny; }
      var A = [a[0] - nx * t, a[1] - ny * t], B = [b[0] - nx * t, b[1] - ny * t], C = [b[0] + nx * t, b[1] + ny * t], D = [a[0] + nx * t, a[1] + ny * t];
      function P(z, q) { return T(q[0], q[1], z); }
      o.fs.setAttribute('d', poly([P(c + w, A), P(c + w, B), P(c + w, C), P(c + w, D)]));        // its top
      o.fs.setAttribute('fill', INK.top);
      o.fx.setAttribute('d', poly([P(c - w, D), P(c - w, C), P(c + w, C), P(c + w, D)]));        // its side toward the eye
      o.fx.setAttribute('fill', nx >= ny ? INK.right : INK.left);
      var E = dx + dy > 0 ? [B, C] : [A, D], ex = Math.abs(dx) > Math.abs(dy);
      o.fe.setAttribute('d', poly([P(c - w, E[0]), P(c - w, E[1]), P(c + w, E[1]), P(c + w, E[0])]));
      o.fe.setAttribute('fill', ex ? INK.right : INK.left);
      o.fold.setAttribute('d', line([P(c + w, D), P(c + w, C)]));
      var pts = [];
      [A, B, C, D].forEach(function (q) { pts.push(P(c - w, q), P(c + w, q)); });
      o.sil.setAttribute('d', poly(hull(pts)));
      return o;
    };
    o.hide = function () { o.g.style.display = 'none'; return o; };
    return o;
  }
  // two lengths l1, l2 from a shoulder s ([y, z]) to a point p: the elbow, on the given side of the line between them
  // (side +1: below it when the arm reaches toward -y, -1: above it)
  function elbow(s, p, l1, l2, side) {
    var dy = p[0] - s[0], dz = p[1] - s[1], d = clamp(Math.hypot(dy, dz), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
    var a = Math.atan2(dz, dy), b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * side;
    return [s[0] + l1 * Math.cos(a + b), s[1] + l1 * Math.sin(a + b)];
  }
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
  // a machine's running gear, the same in each: a plinth set in under its body, 1.6 cm off the floor, its wheels
  // seen under its side (their lower third); the body; a dark skirt round its foot, 3 cm; its light on its near face;
  // a lid let into its top
  function Chassis(par, T) {
    var o = { plinth: Box(par, T, { top: INK.recess, y: INK.recess, x: INK.recess, w: 0.55 }),
              w1: Strip(par, T, WHEEL), w2: Strip(par, T, WHEEL), body: Box(par, T),
              skirt: Strip(par, T, SKIRT), skirtx: Strip(par, T, SKIRT), lamp: Strip(par, T, LIT),
              lid: Box(par, T, { top: INK.paper, w: 0.55 }) };
    // x: its middle; y0, y1: its far and near faces; w: its half width; z0: the floor; h: its height; lit: its
    // light's strength
    o.set = function (x, y0, y1, w, z0, h, lit) {
      o.plinth.set(x - w + 3, x + w - 3, y0 + 3, y1 - 3, z0, z0 + 1.6);
      var wl = Math.min(10, (y1 - y0) * 0.24), xw = x + w - 2.95;
      o.w1.x(xw, y0 + 5, y0 + 5 + wl, z0, z0 + 1.6);
      o.w2.x(xw, y1 - 5 - wl, y1 - 5, z0, z0 + 1.6);
      o.body.set(x - w, x + w, y0, y1, z0 + 1.6, z0 + h);
      o.skirt.y(y1 + 0.02, x - w + 0.3, x + w - 0.3, z0 + 1.9, z0 + 4.6);
      o.skirtx.x(x + w + 0.02, y0 + 0.3, y1 - 0.3, z0 + 1.9, z0 + 4.6);
      o.lamp.p.style.display = 'none';                           // its light is at its tools now
      o.lid.set(x - w + 3, x + w - 3, y0 + 3, y1 - 3, z0 + h, z0 + h + 1.1);
    };
    return o;
  }
  // a machine's light: steady at rest, steady at work, each change 0.18 s
  function lamp(t, on, off) { return 0.4 + 0.6 * (clamp((t - on) / 0.18, 0, 1) - clamp((t - off) / 0.18, 0, 1)); }

  var SCENES = {
    // Replies, a turn of about 30 s, in the house's own causes. The courier works with four arms, none like another,
    // two of them moving at once at most, the others holding: its body 56 by 46 cm and 24 high, a tote of envelopes
    // in its head half, its mast off to its right (140 cm). A, the long arm (44 and 46 cm) on a bracket high on the
    // mast, carries an envelope by its head in a jaw of two plates and sets it in the slot; B, a short arm low on the
    // mast (22 and 20 cm), lifts the next envelope out of the tote and holds it up for A; C, a slide on the tote's left
    // rim, parts the next envelope from the others; D, a strut out of a sleeve on the mast, sets its flat foot against
    // the counter's front edge while A reaches over. The courier keeps its berth at the left end wall, under the
    // supply's hood, where its tote is filled. It backs out, and standing in the room C parts the first envelope, B
    // lifts it out and A takes it from B. At each position in turn, from the left, it runs into the bay and stands
    // (0.25 s); D's foot goes to the counter's edge (0.4 s) while C parts the next envelope; A reaches over the counter
    // (0.65 s) while B lifts that one out, sets the envelope's foot in the slot (12 mm, held 0.25 s) and lets go
    // (0.15 s): A high over the counter, B holding the next low, D braced, the courier still. 0.18 s on the slot draws
    // it in, 21 cm in 0.45 s, and the bezel answers; the record is set on the three displays, the position's own first
    // and its neighbours after, 0.12 s apart. A comes back, D's foot comes off, A takes the next envelope from B, and
    // the courier backs out of the bay. At the window (1.6 s after the third) the bar runs once (0.8 s) and what was
    // held is carried (0.24 s); the displays go back to rest. The courier goes back to its berth, its tote is filled
    // again (1.4 s), and the turn begins again. Its light is the mark on each arm's tool lock, lit while it holds.
    reply: function (L, T, g, dim, svg) {
      var IN = 0.45, ANS = 0.18, STEP = 0.12, BAR = 0.8, CLR = 0.24, F0 = L.floor;
      var order = [0, 1, 2];                                     // the positions in the order they lodge
      var TOP = L.pos[0].slot[4];                                // the counters' top, at the slot
      var XS = L.pos.map(function (p) { return (p.slot[0] + p.slot[2]) / 2; });
      var YS = (L.pos[0].slot[1] + L.pos[0].slot[3]) / 2;
      var EXP = 20.8;                                            // what stands above the slot, its foot 12 mm in
      var W2 = 28, DP = 46, H = 24, RIM = F0 + H + 12;           // the body's half width and depth, its height; the tote's rim
      var LANE = 112, BAYY = 75, EDGE = 78;                      // the body's head: out in the room; in a bay; the counter's edge
      var TOTE = [5, 10, 15], ET = F0 + H + 23;                  // where each envelope stands in the tote, from its head; their heads
      var MX = 12, MY = 34;                                      // the mast: its left face from the body's middle; its far face from the head
      var SA = [37, F0 + 130], LA1 = 44, LA2 = 46;               // A's shoulder (from the head; its height), its lengths
      var SB = [37, F0 + 60], LB1 = 22, LB2 = 20, BXo = 9;       // B's shoulder, its lengths, its plane (from the middle)
      var ZPUT = TOP + 19.8, ZLIFT = TOP + 26;                   // A's jaw: the envelope's foot 12 mm in the slot; over the counter
      var CARRY = [8, F0 + 116];                                 // A's jaw while it carries (from the head; its height)
      var ZH = F0 + 59;                                          // an envelope's head, held up out of the tote by B for A
      var PARK = [20, F0 + 44], BPICK = F0 + H + 20;             // B's grip at rest; at an envelope's head in the tote
      var C0 = 19;                                               // C's slider at rest, from the head
      var BX = 12 + 32 + 2 + W2;                                 // the courier's middle in its berth
      var P = Plan({ x: BX, yb: LANE, ay: CARRY[0], az: CARRY[1], by: PARK[0], bz: PARK[1], cy: C0, d: 0 });
      var put = [], S = [], bGrip = [], aGrip = [];
      // from t: C parts envelope k (0.35 s there, 0.3 s back), then B lifts it out (0.5 s down, 0.12 s, 0.45 s up)
      function ready(k, t) {
        P.also({ cy: TOTE[k] + 4 }, t, 0.35);
        P.also({ cy: C0 }, t + 0.35, 0.3);
        P.also({ by: TOTE[k], bz: BPICK }, t + 0.65, 0.5);
        bGrip[k] = t + 1.27;
        return P.also({ bz: ZH - 3 }, t + 1.27, 0.45);
      }
      // A takes envelope k from B (0.6 s down, 0.15 s), B lets go (0.12 s) and goes back while A lifts it
      function take(k) {
        P.go({ ay: TOTE[k], az: ZH - 1 }, 0.6);
        aGrip[k] = P.wait(0.15);
        P.wait(0.12);
        P.also({ by: PARK[0], bz: PARK[1] }, P.at(), 0.5);
        P.go({ ay: CARRY[0], az: CARRY[1] }, 0.55);
      }
      P.wait(0.4);
      P.run('x', XS[0], 0.8);                                    // out of the berth (it backs out) to the first position
      P.wait(ready(0, P.at()) - P.at());                         // standing in the room: the first envelope readied
      take(0);
      XS.forEach(function (x, p) {
        if (p) P.run('x', x, 1.4);
        P.run('yb', BAYY, 0.6);
        P.wait(0.25);                                            // stood still before an arm moves
        var t0 = P.at(), rdy = p < 2 ? ready(p + 1, t0) : 0;
        P.also({ d: 1 }, t0, 0.4);                               // D's foot to the counter's edge
        P.wait(0.4);
        P.go({ ay: YS - BAYY, az: ZLIFT }, 0.65);                // A over the counter
        P.go({ az: ZPUT }, 0.3);                                 // the envelope's foot into the slot
        P.wait(0.25);
        put[p] = P.wait(0.15);                                   // the jaw opens
        S[p] = P.wait(0.18);                                     // the slot draws it in from here
        P.wait(0.1);
        P.go({ az: ZLIFT }, 0.3);
        P.go({ ay: CARRY[0], az: CARRY[1] }, 0.45);              // A back
        P.also({ d: 0 }, P.at(), 0.4);                           // D's foot off
        if (p < 2) { if (P.at() < rdy) P.wait(rdy - P.at()); take(p + 1); } else P.wait(0.4);
        P.run('yb', LANE, 0.6);
      });
      P.run('x', BX, 2.6);                                       // back to the berth
      var berth = P.at();
      var TURN = P.wait(1.4), WIN = S[2] + 1.6;                  // filled under the hood
      var fill = [berth + 0.3, berth + 0.6, berth + 0.9];        // the envelopes set in the tote: the far one first

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
      // an envelope standing, as a thin box: its face (to the room), its head and its edge
      function envelope(par) {
        var o = { g: mk('g', {}, par) };
        o.f = mk('path', { 'class': 'lv-fill', fill: INK.paper }, o.g);
        o.t = mk('path', { 'class': 'lv-fill', fill: INK.top }, o.g);
        o.r = mk('path', { 'class': 'lv-fill', fill: INK.right }, o.g);
        o.o = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': 0.85 * (T.k || 1), 'stroke-linejoin': 'round' }, o.g);
        o.set = function (x, y, za, zb) {
          if (zb - za < 0.3) { o.g.style.display = 'none'; return; }
          o.g.style.display = '';
          var xa = x - 5.5, xb = x + 5.5, ya = y - 0.25, yb = y + 0.25;
          o.f.setAttribute('d', poly([T(xa, yb, za), T(xb, yb, za), T(xb, yb, zb), T(xa, yb, zb)]));
          o.t.setAttribute('d', poly([T(xa, ya, zb), T(xb, ya, zb), T(xb, yb, zb), T(xa, yb, zb)]));
          o.r.setAttribute('d', poly([T(xb, ya, za), T(xb, yb, za), T(xb, yb, zb), T(xb, ya, zb)]));
          o.o.setAttribute('d', poly([T(xa, yb, za), T(xa, yb, zb), T(xa, ya, zb), T(xb, ya, zb), T(xb, ya, za)]) + line([T(xb, yb, za), T(xb, yb, zb), T(xa, yb, zb)]));
        };
        return o;
      }
      // the courier and its berth, drawn after the positions: they stand before them; its parts from the far to the
      // near: the body and the tote, C, the envelopes, the hood; then A (in the body's middle), B (to its right), D and
      // the mast (further right)
      var rb = mk('g', {}, g);
      behindWall(svg, rb, T, L.wall);
      Box(rb, T).set(12, 44, LANE - 8, LANE + DP + 2, F0, F0 + 118);                 // the supply, against the end wall
      var ch = Chassis(rb, T);
      var tote = Box(rb, T, { top: INK.recess });
      var cRail = Box(rb, T, { w: 0.55 }), cSlide = Box(rb, T);
      var env = [envelope(rb), envelope(rb), envelope(rb)];      // from the tote's head: 0, 1, 2
      var hood = Box(rb, T), lip = Box(rb, T, { w: 0.55 });      // the supply's hood over the berth, its lip
      var firm = { w: 1.4, f: 0.85 };
      var aBracket = Box(rb, T), aUp = Bar(rb, T, firm), aElbow = Box(rb, T), aFore = Bar(rb, T, firm);
      var aWrist = Box(rb, T), aLock = Strip(rb, T, LIT), jaw = Box(rb, T), jaw2 = Box(rb, T, { w: 0.55 });
      var bShoulder = Box(rb, T), bUp = Bar(rb, T), bElbow = Box(rb, T), bFore = Bar(rb, T), bGripper = Box(rb, T), bLock = Strip(rb, T, LIT);
      var dSleeve = Box(rb, T), dRod = Box(rb, T, { w: 0.55 }), dFoot = Box(rb, T);
      var mast = Box(rb, T);
      // when the record of position p reaches the display of position q: the own display first, then the nearer
      function at(p, q) {
        var n = [0, 1, 2].sort(function (a, b) { return Math.abs(a - p) - Math.abs(b - p) || a - b; }).indexOf(q);
        return S[p] + IN + ANS + STEP * n;
      }
      function holds(k, t) { return t >= aGrip[k] && t < put[k]; }
      return function (t) {
        t = t % TURN;
        var x = P.val('x', t), yb = P.val('yb', t);
        ch.set(x, yb, yb + DP, W2, F0, H, 0);
        tote.set(x - 15, x + 15, yb + 1, yb + 23, F0 + H, RIM);
        // C: its rail on the tote's left rim, its slider
        var cy = yb + P.val('cy', t);
        cRail.set(x - 15, x - 12, yb + 2, yb + 22, RIM, RIM + 1.5);
        cSlide.set(x - 16, x - 11, cy - 3, cy + 3, RIM + 1.5, RIM + 5);
        // A's jaw and B's grip
        var ay = yb + P.val('ay', t), az = P.val('az', t), by = yb + P.val('by', t), bz = P.val('bz', t);
        // the envelopes: in the tote, held up by B, carried by A, gone to the slot; filled again in the berth
        for (var k = 2; k >= 0; k--) {
          var tf = fill[2 - k], drop = t >= tf ? 1 - out3((t - tf) / 0.25) : 0;
          if (t < bGrip[k] || t >= tf) env[k].set(x, yb + TOTE[k], Math.max(RIM, F0 + H + 1 + 10 * drop), ET + 10 * drop);
          else if (t < aGrip[k]) env[k].set(x, by, Math.max(RIM, bz + 3 - 22), bz + 3);
          else if (t < put[k]) env[k].set(x, ay, Math.max(ay > yb + 23 ? 0 : RIM, az - 21), az + 1);
          else env[k].set(0, 0, 0, 0);
        }
        hood.set(12, 78, LANE - 4, LANE + 26, F0 + H + 27, F0 + H + 33);
        lip.set(44, 78, LANE + 24.5, LANE + 26, F0 + H + 24, F0 + H + 27);
        // A: the bracket from the mast, the upper length, the elbow, the lower, the wrist, the jaw
        var sa = [yb + SA[0], SA[1]], wa = [ay, az + 6], ea = elbow(sa, wa, LA1, LA2, 1);
        aBracket.set(x - 3, x + MX, yb + MY, yb + MY + 6, SA[1] - 3.5, SA[1] + 3.5);
        aUp.set(x, sa, ea, 2.6, 2.6);
        aElbow.set(x - 3.4, x + 3.4, ea[0] - 3.4, ea[0] + 3.4, ea[1] - 3.4, ea[1] + 3.4);
        aFore.set(x, ea, wa, 2.1, 2.1);
        aWrist.set(x - 3, x + 3, ay - 3, ay + 3, az + 2.5, az + 8);
        var hA = [0, 1, 2].some(function (k) { return holds(k, t); });
        aLock.y(ay + 3.04, x - 2, x + 2, az + 4.6, az + 6.2);
        aLock.p.style.opacity = hA ? '1' : '0.25';
        var op = 1;                                              // the jaw: shut on an envelope's head, open between
        [0, 1, 2].forEach(function (k) {
          var c = clamp((t - aGrip[k] + 0.12) / 0.12, 0, 1) * (1 - clamp((t - put[k] + 0.15) / 0.15, 0, 1));
          op = Math.min(op, 1 - c);
        });
        jaw.set(x - 7, x + 7, ay - 1.6 - 1.2 * op, ay - 0.1 - 1.2 * op, az - 1.5, az + 2.5);
        jaw2.set(x - 7, x + 7, ay + 0.1 + 1.2 * op, ay + 1.6 + 1.2 * op, az - 1.5, az + 2.5);
        // B: low on the mast, to the right of the middle; its grip at an envelope's right edge
        var xb = x + BXo, sb = [yb + SB[0], SB[1]], wb = [by, bz + 4], eb = elbow(sb, wb, LB1, LB2, -1);
        bShoulder.set(xb - 3, x + MX, yb + MY, yb + MY + 6, SB[1] - 3, SB[1] + 3);
        bUp.set(xb, sb, eb, 1.9, 1.9);
        bElbow.set(xb - 2.6, xb + 2.6, eb[0] - 2.6, eb[0] + 2.6, eb[1] - 2.6, eb[1] + 2.6);
        bFore.set(xb, eb, wb, 1.6, 1.6);
        bGripper.set(x + 4, xb + 2.5, by - 2, by + 2, bz - 1, bz + 4);
        var hB = [0, 1, 2].some(function (k) { return t >= bGrip[k] && t < aGrip[k] + 0.12; });
        bLock.y(by + 2.04, xb - 1.6, xb + 1.6, bz + 1.6, bz + 3);
        bLock.p.style.opacity = hB ? '1' : '0.25';
        // D: the sleeve on the mast's far face, the rod out of it, its flat foot
        var dEnd = yb + MY - 10 - (yb + MY - 10 - EDGE - 1.5) * std(P.val('d', t)) * (yb < BAYY + 1 ? 1 : 0);
        dSleeve.set(x + MX + 1, x + MX + 7, yb + MY - 10, yb + MY, TOP - 6.5, TOP - 1.5);
        dRod.set(x + MX + 2.6, x + MX + 5.4, dEnd, yb + MY - 10, TOP - 5.4, TOP - 2.6);
        dFoot.set(x + MX, x + MX + 8, dEnd - 1.5, dEnd, TOP - 10, TOP + 0.5);
        mast.set(x + MX, x + MX + 8, yb + MY, yb + MY + 6, F0 + H + 1.1, F0 + 140);
        // the positions
        pos.forEach(function (o, q) {
          var d = o.d, y = d[4];
          // the envelope in the slot: set there by the courier, drawn in once the jaw has let it go
          var e2 = t - S[q], exp = e2 < 0 ? EXP : EXP * (1 - std(e2 / IN));
          if (t < put[q] || exp <= 0.2) o.env.style.opacity = '0';
          else {
            o.env.style.opacity = '1';
            var xa = o.ex - 5.5, xb2 = o.ex + 5.5, ya = o.ey - 0.25, yb2 = o.ey + 0.25, z0 = o.ez, z1 = o.ez + exp;
            o.ef.setAttribute('d', poly([T(xa, yb2, z0), T(xb2, yb2, z0), T(xb2, yb2, z1), T(xa, yb2, z1)]));
            o.et.setAttribute('d', poly([T(xa, ya, z1), T(xb2, ya, z1), T(xb2, yb2, z1), T(xa, yb2, z1)]));
            o.er.setAttribute('d', poly([T(xb2, ya, z0), T(xb2, yb2, z0), T(xb2, yb2, z1), T(xb2, ya, z1)]));
            o.eo.setAttribute('d', poly([T(xa, yb2, z0), T(xa, yb2, z1), T(xa, ya, z1), T(xb2, ya, z1), T(xb2, ya, z0)]) + line([T(xb2, yb2, z0), T(xb2, yb2, z1), T(xa, yb2, z1)]));
          }
          // the bezel answers once the envelope is in
          var a = e2 - IN;
          o.flash.style.opacity = a >= 0 && a < ANS ? (0.75 * Math.sin(Math.PI * a / ANS)).toFixed(3) : '0';
          // the display: lit from the first record set on it until what was held is carried
          var first = Math.min(at(0, q), at(1, q), at(2, q)) - 0.15, gone = clamp((t - WIN - BAR) / CLR, 0, 1);
          var on = t < first ? 0 : t < first + 0.2 ? (t - first) / 0.2 : t < WIN + BAR + CLR ? 1 : 1 - clamp((t - WIN - BAR - CLR) / 0.3, 0, 1);
          o.scr.style.opacity = on.toFixed(3); o.edge.style.opacity = on.toFixed(3);
          order.forEach(function (p, k) {
            var u = clamp((t - at(p, q)) / 0.12, 0, 1);
            o.lines[k].style.opacity = (u * on * (1 - gone)).toFixed(3);
          });
          var bu = clamp((t - WIN) / BAR, 0, 1);
          if (bu > 0 && gone < 1) {
            var x0 = d[0] + 5, w = d[1] - d[0] - 10;
            o.bar.setAttribute('d', line([T(x0, y, d[2] + 5), T(x0 + w * std(bu), y, d[2] + 5)]));
            o.bar.style.opacity = (on * (1 - gone)).toFixed(3);
          } else o.bar.style.opacity = '0';
        });
      };
    },

    // Certification, a day of 20 s from ten in the morning: the day at about an hour and a fifth a second (ten
    // seconds of it), an hour a second at night (eight), dusk and dawn a second each, the changes of pace eased over a
    // quarter of a second; the clock's one hand goes on with it, always forward; the high window's glass from the
    // day's #DDE5E5 to dusk and night; the room's faces a little darker at night, at most six in a hundred, the lines
    // as they are. The floor's unit keeps its dock at the back wall, under the high window, by day; with the night it
    // comes out (0.5 s) and goes along the bench, its edge module swung out square to its side (0.45 s) so its shoe
    // runs under the bench's edge, the unit going straight on, and folded again (0.45 s) before it turns; out to the
    // front and along it (4.4 s in all), its corners round (20 cm); back (2 s), and into its dock (0.7 s) before dawn.
    certify: function (L, T, g, dim, svg) {
      var c = L.clock, cx = c[0], cy = c[1], cz = c[2], r = c[3], hand = c[4], gl = L.glass, F0 = L.floor;
      var face = [];
      for (var i = 0; i < 48; i++) { var an = 2 * Math.PI * i / 48; face.push(T(cx + 0.87 * r * Math.cos(an), cy, cz + 0.87 * r * Math.sin(an))); }
      var glass = mk('path', { 'class': 'lv-fill', d: poly([T(gl[0], gl[4], gl[2]), T(gl[1], gl[4], gl[2]), T(gl[1], gl[4], gl[3]), T(gl[0], gl[4], gl[3])]) }, g);
      var frame = L.lines.map(function (ln) { return mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.detail, 'stroke-width': 0.55, d: line(ln.map(function (p) { return T(p[0], p[1], p[2]); })) }, g); });
      mk('path', { 'class': 'lv-fill', fill: INK.paper, d: poly(face) }, g);
      var hd = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': 1.4, 'stroke-linecap': 'round' }, g);
      var DAY = 20, N = 2000, HR = [];
      // the hour at each moment of the turn: the day's pace (10:00 to 19:00, 07:00 to 10:00), dusk's and dawn's
      // (19:00 to 21:00, 05:00 to 07:00) and the night's (21:00 to 05:00), each change eased over a quarter second,
      // the whole made to come round in exactly twenty-four hours
      (function () {
        function sm(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
        var edges = [[7.5, 2], [8.5, 1], [16.5, 2], [17.5, 1.2]], dt = DAY / N, rate = [], sum = 0;
        for (var k = 0; k < N; k++) {
          var tt = (k + 0.5) * dt, v = 1.2, prev = 1.2;
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
      // the floor's unit, 48 by 40 cm and 10 high, its equipment bay at its back (24 by 14, 4.5 above it), and its
      // dock: a plate on the floor, its contacts on the back wall. Its runs keep to the floor that nothing in the room
      // stands before: between the bench and the standing desk (the desk's top passes over what is that far from it)
      // and along the front, short of the desk's near legs.
      var X0 = L.glass[0] + 18, Y0 = cy + 24, wy = cy - 4, YO = Y0 + 30;
      var rb = mk('g', {}, g);
      behindWall(svg, rb, T, L.wall);
      Box(rb, T, { top: '#e7ecea', w: 0.55 }).set(X0 - 30, X0 + 30, wy + 0.5, wy + 58, F0, F0 + 0.5);
      Box(rb, T).set(X0 - 9, X0 + 9, wy, wy + 4, F0 + 0.5, F0 + 15);
      // its edge module, folded along its left side: two lengths (12 and 10 cm) lying flat and a flat shoe 14 cm long;
      // out in the room it swings them out square to its side (0.45 s) and the shoe goes along under the bench's edge,
      // the unit going straight on, its sweep 22 cm wider; it folds them again (0.45 s) before it turns
      var mHinge = Box(rb, T, { w: 0.55 }), mLo = Bar(rb, T, { w: 0.55 }), mUp = Bar(rb, T, { w: 0.55 });
      var mShoe = Box(rb, T, { w: 0.55 }), mLock = Strip(rb, T, LIT);
      var ch = Chassis(rb, T), bay = Box(rb, T, { w: 0.55 });
      var out = Route([[X0, YO], [X0, 300], [X0 + 108, 300]], 20), home = Route([[X0 + 108, 300], [X0, 300], [X0, YO]], 20);
      var T0 = 8.5, T1 = T0 + 0.5, T2 = T1 + 4.4, T3 = T2 + 0.2, T4 = T3 + 2.0, T5 = T4 + 0.7;
      var dOut = drive(out.len, 4.4), dHome = drive(home.len, 2.0);
      function where(u) {
        if (u < T0 || u >= T5) return [X0, Y0];
        if (u < T1) return [X0, Y0 + 30 * std((u - T0) / 0.5)];
        if (u < T2) return out.at(out.len * dOut((u - T1) / 4.4));
        if (u < T3) return out.at(out.len);
        if (u < T4) return home.at(home.len * dHome((u - T3) / 2.0));
        return [X0, YO - 30 * std((u - T4) / 0.7)];
      }
      function sm(v, a, b) { v = clamp((v - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); }
      return function (t) {
        var h = hourAt(t), dk = inout(dark(h));
        glass.setAttribute('fill', sky(h));
        frame.forEach(function (e) { e.setAttribute('stroke', mix(INK.detail, '#b4bfca', dk)); });
        var a = (90 - 30 * h) * Math.PI / 180;
        hd.setAttribute('d', line([T(cx, cy, cz), T(cx + hand * r * Math.cos(a), cy, cz + hand * r * Math.sin(a))]));
        if (dim) dim.style.opacity = dk.toFixed(3);
        var u = t % DAY, p = where(u), x = p[0], y = p[1];
        // the edge module: out along the bench, by where the unit is on its way out
        var m = u >= T1 && u < T2 && Math.abs(x - X0) < 0.5 ? sm(y, 112, 146) * (1 - sm(y, 236, 270)) : 0;
        var th = Math.PI / 2 * m, hx = x - 24, hy = y + 4, ex = hx - 12 * Math.sin(th), ey = hy - 12 * Math.cos(th);
        var sx = ex - 10 * Math.sin(th), sy = ey + 10 * Math.cos(th), zm = F0 + 3.2;
        mLo.setZ(zm, [hx - 1.2, hy], [ex, ey], 1, 1.4);
        mUp.setZ(zm + 0.2, [ex, ey], [sx, sy], 1, 1.2);
        mHinge.set(hx - 2.4, hx, hy - 3, hy + 3, F0 + 1.8, F0 + 6);
        mShoe.set(sx - 3, sx, sy - 7, sy + 7, F0 + 0.2, F0 + 2.4);
        mLock.y(sy + 7.04, sx - 2.6, sx - 0.4, F0 + 0.8, F0 + 1.8);
        mLock.p.style.opacity = m > 0.98 ? '1' : '0.25';
        ch.set(x, y - 20, y + 20, 24, F0, 10, 0);
        bay.set(x - 12, x + 12, y - 18, y - 4, F0 + 11.1, F0 + 14.5);
      };
    },

    // Records, a turn of about 45 s: the store's runner (its body 56 by 50 cm and 28 high, a guide 12 cm wide at its
    // back, a carriage on a shoe in the guide) works with three arms on the carriage, the carriage set at the marked
    // row's height: the drawer arm (14 and 12 cm, low on the carriage's left, a hook at its end), the carrier (a slide
    // under a tray, out 11 cm) and the third arm (12 and 10 cm, on the carriage's right, a small block at its end) that
    // keeps the tray's side stop. It goes along the racks from the left, to each drawer of the marked row in turn, the
    // two of a rack together: the drawer arm's hook takes the pull (0.3 s; the drawer's sealed edge lights as it is
    // called) and draws the drawer out on its slides 11 cm (0.6 s), where it holds it; the tray goes out to the drawer's
    // front while the third arm comes to its side stop (0.65 s) and opens it (0.2 s); at the rack's first drawer a card
    // is lifted out (4 cm clear of the drawer) onto the tray (0.45 s), at the second it is set in; the stop is shut
    // (0.3 s), the tray and the third arm come back (0.65 s), and only then is the drawer run back (0.55 s) and let go.
    // The card rides on the tray between them. After the eighth the runner goes back to its place at the left of the
    // racks, its carriage let down to 55 cm, and stands. Its lights are on the hook's lock and the third arm's block.
    records: function (L, T, g, dim, svg) {
      var yf = L.yf, BAY = L.bay, MOD = L.mod, OUT = 11, F0 = L.floor;
      behindWall(svg, g, T, L.wall);
      var ds = L.drawers.map(function (dw) {
        var o = { x0: dw[0], z0: dw[1] }, sz = dw[1] + MOD - 0.6, sy = yf + 2.3;
        o.sig = mk('path', { 'class': 'lv-fill', fill: LIT, d: poly([T(dw[0] + 0.8, sy, sz - 3.4), T(dw[0] + BAY - 0.8, sy, sz - 3.4),
                                                                      T(dw[0] + BAY - 0.8, sy, sz), T(dw[0] + 0.8, sy, sz)]) }, g);
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
      });
      var CIN = yf + 3.5, HOFF = yf + 21;                        // the hook: at a closed drawer's pull; off, clear of it
      var XD = L.drawers.map(function (dw) { return dw[0] + BAY / 2; });
      var DOCK = XD[0] - 39, ZW = L.drawers[0][1] + 1, ZR = F0 + 55;
      var YB = yf + 32, YS = YB + 4, YC = yf + 29;               // the body's far face; the guide's face; the carriage's face
      var YT0 = yf + 25, YT1 = yf + 14;                          // the tray's far edge: in, on the carriage; out, at the drawer's front
      var P = Plan({ x: DOCK, cz: ZR, cf: HOFF, ce: 0, ua: 0, so: 0 }), held = [], lift = [], MOVE = 0.45;
      P.wait(0.5);
      P.go({ cz: ZW }, 0.7);
      XD.forEach(function (x, i) {
        if (i) P.run('x', x, i % 2 ? 1.1 : 1.2); else P.run('x', x, 0.9);
        var tc = P.go({ cf: CIN }, 0.3);                         // the hook to the pull
        P.go({ cf: CIN + OUT }, 0.6);                            // the drawer drawn out, and held
        P.go({ ce: 1, ua: 1 }, 0.65);                            // the tray out to it; the third arm to the tray's side stop
        P.go({ so: 1 }, 0.2);                                    // the stop opened
        lift.push(P.at());
        P.wait(MOVE);                                            // the card onto the tray, or into the drawer
        P.go({ so: 0 }, 0.3);                                    // the stop shut
        P.go({ ce: 0, ua: 0 }, 0.65);                            // the tray back, the third arm back
        var tr = P.go({ cf: CIN }, 0.55);                        // the drawer run back
        P.go({ cf: HOFF }, 0.25);                                // the hook off
        held.push([tc, tr]);
      });
      P.go({ cz: ZR }, 0.7);
      P.run('x', DOCK, 3.4);
      var TURN = P.wait(2.6);
      var rb = mk('g', {}, g);
      // its parts from the far to the near: the body, the drawer arm (low on the left, its hook across to the pull),
      // the carriage, the carrier's slide and its tray, the card, the tray's stops; the guide, the shoe; the third arm
      // on the right
      var ch = Chassis(rb, T);
      var dUp = Bar(rb, T), dEl = Box(rb, T), dLo = Bar(rb, T), hook = Box(rb, T), hLock = Strip(rb, T, LIT);
      var car = Box(rb, T), link = Box(rb, T, { w: 0.55 }), tray = Box(rb, T, { top: INK.paper, w: 0.55 }),
          card = Box(rb, T, { y: INK.paper, w: 0.55 }), back = Box(rb, T, { w: 0.55 }), side = Box(rb, T, { w: 0.55 }),
          guide = Box(rb, T), slot = Strip(rb, T, INK.recess), shoe = Box(rb, T), cap = Box(rb, T, { w: 0.55 });
      var uSh = Box(rb, T), uUp = Bar(rb, T), uEl = Box(rb, T), uLo = Bar(rb, T), uBlock = Box(rb, T), uLock = Strip(rb, T, LIT);
      var CH = 9, CW = 13;                                       // the card: 26 by 9 cm, standing
      // where the card is as it goes from a drawer to the tray (u from 0 to MOVE; the other way for a drawer it is
      // set in): up 4 cm clear of the drawer, over its front, down onto the tray against its stop
      function cardMove(u, yIn, zIn, zTop, yOn, zOn) {
        var z = u < 0.18 ? zIn + (zTop - zIn) * std(u / 0.18) : u < 0.33 ? zTop : zTop + (zOn - zTop) * std((u - 0.33) / 0.12);
        return [yIn + (yOn - yIn) * std((u - 0.18) / 0.15), z];
      }
      return function (t) {
        t = t % TURN;
        var x = P.val('x', t), cz = P.val('cz', t), cf = P.val('cf', t);
        ds.forEach(function (o, i) {
          var h = held[i], d = t >= h[0] && t <= h[1] ? clamp(cf - CIN, 0, OUT) : 0;
          // its sealed edge lights as the runner reaches it, and goes out after it is let go
          o.sig.style.opacity = (t < h[0] - 0.3 ? 0 : t < h[0] ? out3((t - h[0] + 0.3) / 0.3) : t < h[1] ? 1 : 1 - clamp((t - h[1]) / 0.5, 0, 1)).toFixed(3);
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
          // the cards standing in the tray, their heads seen from above (the one to be lifted, or set in, the nearest)
          var sh = '', inCard = i % 2 ? t > lift[i] + MOVE : t < lift[i];
          for (var k = inCard ? 0.5 : 1; k <= 3; k += k < 1 ? 0.5 : 1) { var ys = yp - 5.5 * k; if (ys > y1 + 0.5) sh += line([T(xa + 2.5, ys, zb), T(xb - 2.5, ys, zb)]); }
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
        ch.set(x, YB, YB + 50, 28, F0, 28, 0);
        // the drawer arm: from low on the carriage's face, its elbow below, its hook at the pull
        var xd = x - 15, sd2 = [YC, cz + 6], hp = [cf, cz + 4.2], de = elbow(sd2, hp, 14, 12, 1);
        dUp.set(xd, sd2, de, 1.9, 1.9);
        dEl.set(xd - 2.4, xd + 2.4, de[0] - 2.4, de[0] + 2.4, de[1] - 2.4, de[1] + 2.4);
        dLo.set(xd, de, hp, 1.6, 1.6);
        hook.set(xd - 2.2, x - 3.5, cf - 1.2, cf + 1.6, cz + 2.6, cz + 6.4);       // across to the pull's left end
        var hold = held.some(function (h) { return t >= h[0] && t <= h[1]; });
        hLock.y(cf + 1.64, xd - 1.4, xd + 2.6, cz + 4.6, cz + 5.8);
        hLock.p.style.opacity = hold ? '1' : '0.25';
        // the carriage, the carrier's slide out of its face, the tray on it
        var yt = YT0 + (YT1 - YT0) * P.val('ce', t);
        car.set(x - 20, x + 20, YC, YS, cz, cz + 10);
        link.set(x - 3, x + 3, yt + 8.5, YC, cz + 9.4, cz + 11);
        tray.set(x - 14, x + 14, yt, yt + 8.5, cz + 11, cz + 12.2);
        // the card: lifted from the rack's first drawer onto the tray, carried, set into the second
        var shown = false, yOn = yt + 6.1, zOn = cz + 12.2;
        for (var j = 0; j < 4; j++) {
          var a = lift[2 * j], b = lift[2 * j + 1];
          if (t < a || t >= b + MOVE) continue;
          var dw = L.drawers[t < b ? 2 * j : 2 * j + 1], zb2 = dw[1] + MOD - 0.6, zIn = dw[1] + 1.4;
          var yIn = yf + OUT - 2.75, zTop = zb2 + 4, c;
          c = t < a + MOVE ? cardMove(t - a, yIn, zIn, zTop, yOn, zOn) : t < b ? [yOn, zOn] : cardMove(MOVE - (t - b), yIn, zIn, zTop, yOn, zOn);
          var over = c[0] < yf + OUT + 2.2;                      // over the drawer: what is below its top is in it
          card.set(x - CW, x + CW, c[0] - 0.25, c[0] + 0.25, over ? Math.max(c[1], zb2) : c[1], c[1] + CH);
          shown = true;
        }
        if (!shown) card.hide();
        back.set(x - 14, x + 14, yt + 7.4, yt + 8.5, cz + 12.2, cz + 13.7);
        var so = P.val('so', t);
        side.set(x + 13, x + 14.2, yt + 3, yt + 8, cz + 12.2, cz + 12.6 + 1.8 * (1 - so));
        guide.set(x - 6, x + 6, YS, YB + 10, F0 + 29.1, F0 + 156);
        slot.y(YB + 10.02, x - 2, x + 2, F0 + 32, F0 + 153);
        shoe.set(x - 8, x + 8, YS - 1, YB + 11, cz - 1, cz + 12);
        cap.set(x - 6.5, x + 6.5, YS - 0.5, YB + 10.5, F0 + 156, F0 + 158);
        // the third arm: on the carriage's right, its block at the tray's side stop
        var xu = x + 19, su = [YC + 4, cz + 13], ua = P.val('ua', t);
        var up = [YC + 2 + (yt + 5.5 - YC - 2) * ua, cz + 21 + (cz + 15.4 - cz - 21) * ua], ue = elbow(su, up, 12, 10, -1);
        uSh.set(xu - 2.5, xu + 2.5, YC + 1, YC + 7, cz + 10, cz + 13);
        uUp.set(xu, su, ue, 1.6, 1.6);
        uEl.set(xu - 2.2, xu + 2.2, ue[0] - 2.2, ue[0] + 2.2, ue[1] - 2.2, ue[1] + 2.2);
        uLo.set(xu, ue, up, 1.4, 1.4);
        uBlock.set(x + 13, xu + 1.5, up[0] - 2, up[0] + 2, up[1] - 3 + 0.8 * so, up[1] + 0.8 * so);
        uLock.y(up[0] + 2.04, xu - 1.2, xu + 1.2, up[1] - 1.8, up[1] - 0.6);
        uLock.p.style.opacity = ua > 0.98 ? '1' : '0.25';
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
  function canvasScene(M, F, cv, img, k0) {
    var C = Math.cos(Math.PI / 6), ctx = cv.getContext('2d'), seat = new RK_SEAT.Seat(M), d = 1, kd = 1;
    var P = function (x, y, z) { return [((x - y) * C - F[0]) * F[2] + F[3], ((x + y) / 2 - z - F[1]) * F[2] + F[3]]; };
    var hp = [];
    for (var i = 0; i < 8; i++) hp.push(P(i & 1 ? M.x1 : 0, i & 2 ? M.ys : 0, i & 4 ? M.slab[1] : M.slab[0]));
    hp = hull(hp);
    var last = 0;
    return function (t) {
      var now = window.performance ? performance.now() : Date.now();
      if (last && now - last < 30) return;                // thirty pictures a second are enough for its pace
      last = now;
      var r = img.getBoundingClientRect();
      d = Math.min(2, window.devicePixelRatio || 1); kd = r.width / F[4];
      var w = Math.round(r.width * d), h = Math.round(r.height * d);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      ctx.setTransform(kd * d, 0, 0, kd * d, 0, 0);
      ctx.clearRect(-2, -2, F[4] + 4, F[5] + 4);
      var f = seat.frame(t), lw = k0 / kd;
      ctx.save();
      ctx.beginPath(); ctx.rect(-10, -10, F[4] + 20, F[5] + 20);
      ctx.moveTo(hp[0][0], hp[0][1]);
      for (var j = 1; j < hp.length; j++) ctx.lineTo(hp[j][0], hp[j][1]);
      ctx.closePath(); ctx.clip('evenodd');
      new RK.Painter(ctx, P, lw).draw(f.store);
      ctx.restore();
      new RK.Painter(ctx, P, lw).draw(f.hall);
    };
  }

  (function () {
    var pics = slice(document.querySelectorAll('picture[data-live]'));
    if (!pics.length || mq.matches) return;
    var C = Math.cos(Math.PI / 6), live = [];
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
      }
      function build() {
        var src = img.currentSrc || img.src, s = /-s(-bare)?\.svg/.test(src);
        if (svg && s === small) { place(); return; }
        if (run) { base += run.now(); run.stop(); }
        var t0 = base;
        if (svg) svg.remove();
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
      function start() { build(); live.push({ stop: function () { if (run) run.stop(); if (svg) svg.remove(); if (dim) dim.remove(); fig.classList.remove('is-live'); bare(false); } }); }
      function ready() { if (L.canvas) machines(start); else start(); }
      if (img.complete && img.naturalWidth) ready(); else img.addEventListener('load', ready, { once: true });
      img.addEventListener('load', function () { if (!L.canvas || window.RK_SEAT) build(); });   // a phone's picture and a wider one: each its frame
      if ('ResizeObserver' in window) new ResizeObserver(place).observe(img);
      window.addEventListener('resize', place);
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

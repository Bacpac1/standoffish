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
   12. The map's day. The home's map keeps a day of the reader's date: the night side, the desks shut and open. */
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

  // one loop's clock: it runs while its picture is at least a third in view and the page is shown
  function runner(watch, frame) {
    var seen = false, hidden = document.hidden, running = false, t = 0, last = 0, raf = 0;
    function step(ts) {
      if (!running) return;
      if (last) t += Math.min(0.1, (ts - last) / 1000);
      last = ts;
      frame(t);
      raf = requestAnimationFrame(step);
    }
    function sync() {
      var go = seen && !hidden;
      if (go && !running) { running = true; last = 0; raf = requestAnimationFrame(step); }
      else if (!go && running) { running = false; cancelAnimationFrame(raf); }
    }
    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.intersectionRatio >= 0.3) seen = true;
          else if (e.intersectionRatio < 0.1) seen = false;
        });
        sync();
      }, { threshold: [0, 0.1, 0.3] });
      io.observe(watch);
    } else { seen = true; sync(); }
    function vis() { hidden = document.hidden; sync(); }
    document.addEventListener('visibilitychange', vis);
    frame(0);
    return { now: function () { return t; },
             stop: function () { running = false; cancelAnimationFrame(raf); if (io) io.disconnect(); document.removeEventListener('visibilitychange', vis); } };
  }

  var SCENES = {
    // Replies, a turn of 12 s: lodged at the first position (0.8 s), the third (3.0 s), the second (5.9 s); each is
    // written on the position's own display, then on its neighbours' (0.14 s a position); the window at 8.2 s: a bar
    // runs under the lines on every display (1 s), the lines go up and out (0.5 s), the displays go dark (0.5 s)
    reply: function (L, T, g) {
      var AT = [0.8, 5.9, 3.0], RIP = 0.14, TYPE = 0.45, WIN = 8.2, BAR = 1.0, GO = 0.5, OFF = 0.5;
      var order = [0, 2, 1];                                     // the positions in the order they lodge
      var pos = L.pos.map(function (p) {
        var d = p.disp, y = d[4], b = p.bezel;
        var o = { g: mk('g', {}, g) };
        var sl = p.slot;
        o.flash = mk('path', { 'class': 'lv-fill', fill: '#7d9fce', 'fill-rule': 'evenodd',
                               d: poly([T(b[0], b[1], b[4]), T(b[2], b[1], b[4]), T(b[2], b[3], b[4]), T(b[0], b[3], b[4])]) +
                                  poly([T(sl[0], sl[1], sl[4]), T(sl[2], sl[1], sl[4]), T(sl[2], sl[3], sl[4]), T(sl[0], sl[3], sl[4])]) }, o.g);
        o.scr = mk('path', { 'class': 'lv-fill', fill: '#f4f8fb', d: poly([T(d[0], y, d[2]), T(d[1], y, d[2]), T(d[1], y, d[3]), T(d[0], y, d[3])]) }, o.g);
        o.edge = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.detail, 'stroke-width': 0.55, d: poly([T(d[0], y, d[2]), T(d[1], y, d[2]), T(d[1], y, d[3]), T(d[0], y, d[3])]) }, o.g);
        o.lines = [0.74, 0.52, 0.64].map(function () { return mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.accent, 'stroke-width': 0.85, 'stroke-linecap': 'round' }, o.g); });
        o.bar = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.accent, 'stroke-width': 1.4, 'stroke-linecap': 'round' }, o.g);
        o.d = d;
        return o;
      });
      var W = [0.74, 0.52, 0.64];
      return function (t) {
        t = t % 12;
        pos.forEach(function (o, q) {
          var d = o.d, y = d[4], x0 = d[0] + 5, w = d[1] - d[0] - 10;
          // the bezel answers when its own position lodges
          var a = t - AT[q], fl = a >= 0 && a < 0.7 ? Math.sin(Math.PI * clamp(a / 0.6, 0, 1)) : 0;
          o.flash.style.opacity = (0.75 * fl).toFixed(3);
          // the display: on from the first reply written on it until the window has carried them
          var first = Math.min.apply(null, AT.map(function (at, p) { return at + RIP * Math.abs(p - q); })) - 0.25;
          var on = t < first ? 0 : t < first + 0.3 ? (t - first) / 0.3 : t < WIN + BAR + GO ? 1 : 1 - (t - WIN - BAR - GO) / OFF;
          on = clamp(on, 0, 1);
          o.scr.style.opacity = on.toFixed(3); o.edge.style.opacity = on.toFixed(3);
          // the lines, one for each reply lodged, in the order they were lodged
          var gone = clamp((t - WIN - BAR) / GO, 0, 1), lift = 6 * inout(gone);
          order.forEach(function (p, k) {
            var st = AT[p] + RIP * Math.abs(p - q), u = clamp((t - st) / TYPE, 0, 1), el = o.lines[k];
            var z = d[3] - 6 - 7 * k + lift;
            if (u <= 0 || z > d[3] - 2) { el.style.opacity = '0'; return; }
            el.setAttribute('d', line([T(x0, y, z), T(x0 + w * W[k] * out3(u), y, z)]));
            el.style.opacity = (on * (1 - gone)).toFixed(3);
          });
          var bu = clamp((t - WIN) / BAR, 0, 1);
          if (bu > 0 && gone < 1) {
            o.bar.setAttribute('d', line([T(x0, y, d[2] + 5), T(x0 + w * inout(bu), y, d[2] + 5)]));
            o.bar.style.opacity = (on * (1 - gone)).toFixed(3);
          } else o.bar.style.opacity = '0';
        });
      };
    },

    // Certification, a day of 16 s from ten in the morning, slower by day and quicker by night: the clock's one hand
    // goes round twice; the glass of the high window keeps the day's grey until dusk (19:00 to 20:30), then night (to
    // 05:30), then dawn (to 07:00); the room dims a little with the night
    certify: function (L, T, g, dim) {
      var c = L.clock, cx = c[0], cy = c[1], cz = c[2], r = c[3], hand = c[4], gl = L.glass;
      var face = [];
      for (var i = 0; i < 48; i++) { var a = 2 * Math.PI * i / 48; face.push(T(cx + 0.87 * r * Math.cos(a), cy, cz + 0.87 * r * Math.sin(a))); }
      var glass = mk('path', { 'class': 'lv-fill', d: poly([T(gl[0], gl[4], gl[2]), T(gl[1], gl[4], gl[2]), T(gl[1], gl[4], gl[3]), T(gl[0], gl[4], gl[3])]) }, g);
      var frame = L.lines.map(function (ln) { return mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.detail, 'stroke-width': 0.55, d: line(ln.map(function (p) { return T(p[0], p[1], p[2]); })) }, g); });
      mk('path', { 'class': 'lv-fill', fill: INK.paper, d: poly(face) }, g);
      var hd = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': 1.4, 'stroke-linecap': 'round' }, g);
      var DAY = 16;
      // the glass through the day: [hour, colour]
      var SKY = [[0, '#3f4d63'], [5.5, '#3f4d63'], [6.25, '#c9c3bd'], [7, INK.recess], [19, INK.recess], [19.75, '#cfc4b8'],
                 [20.5, '#3f4d63'], [24, '#3f4d63']];
      function sky(h) {
        for (var i = 1; i < SKY.length; i++) if (h <= SKY[i][0]) { var a = SKY[i - 1], b = SKY[i]; return [a, b, (h - a[0]) / (b[0] - a[0])]; }
        return [SKY[0], SKY[0], 0];
      }
      function dark(h) { return h < 5.5 || h > 20.5 ? 1 : h < 7 ? 1 - (h - 5.5) / 1.5 : h > 19 ? (h - 19) / 1.5 : 0; }
      return function (t) {
        var u = (t % DAY) / DAY, h = (10 + 24 * (u - 0.5 * Math.sin(2 * Math.PI * u) / (2 * Math.PI))) % 24;
        var s = sky(h), k = inout(s[2]);
        glass.setAttribute('fill', mix(s[0][1], s[1][1], k));
        var dk = inout(dark(h));
        frame.forEach(function (e) { e.setAttribute('stroke', mix(INK.detail, '#9aa6b4', dk)); });
        var a = (90 - 30 * h) * Math.PI / 180;
        hd.setAttribute('d', line([T(cx, cy, cz), T(cx + hand * r * Math.cos(a), cy, cz + hand * r * Math.sin(a))]));
        if (dim) dim.style.opacity = (0.8 * dk).toFixed(3);
      };
    },

    // Records, a turn of 12 s: the marked row's eight drawers, from the left, as the sendings come in (unevenly, eight
    // in 10 s): each drawn out 24 cm (0.6 s), held (0.5 s) and closed (0.6 s), the sheets in its tray seen while it is
    // out
    records: function (L, T, g, dim, svg) {
      var yf = L.yf, BAY = L.bay, MOD = L.mod, w = L.wall, OUT = 24, MOVE = 0.6, HOLD = 0.5;
      var AT = [0.4, 1.7, 3.3, 4.2, 6.0, 7.3, 8.1, 9.7];          // the sendings as they come in, unevenly
      // the right end wall stands before the far end of the racks: what is behind it stays hidden
      var cp = mk('clipPath', { id: 'lv-rec-' + Math.random().toString(36).slice(2, 8) }, svg);
      var hp = [];
      for (var i = 0; i < 8; i++) hp.push(T(i & 1 ? w[3] : w[0], i & 2 ? w[4] : w[1], i & 4 ? w[5] : w[2]));
      var vb = svg.viewBox.baseVal;
      mk('path', { 'clip-rule': 'evenodd', d: 'M-10 -10H' + f1(vb.width + 10) + 'V' + f1(vb.height + 10) + 'H-10Z' + poly(hull(hp)) }, cp);
      g.setAttribute('clip-path', 'url(#' + cp.id + ')');
      var ds = L.drawers.map(function (dw) {
        var o = { x0: dw[0], z0: dw[1], g: mk('g', {}, g) };
        o.right = mk('path', { 'class': 'lv-fill', fill: INK.right }, o.g);
        o.tray = mk('path', { 'class': 'lv-fill', fill: INK.paper }, o.g);
        o.top = mk('path', { 'class': 'lv-fill', fill: INK.top }, o.g);
        o.front = mk('path', { 'class': 'lv-fill', fill: INK.left }, o.g);
        o.seal = mk('path', { 'class': 'lv-fill', fill: INK.accent }, o.g);
        o.pull = mk('path', { 'class': 'lv-line', fill: INK.left, stroke: INK.ink, 'stroke-width': 0.55, 'stroke-linejoin': 'round' }, o.g);
        o.sheets = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.detail, 'stroke-width': 0.55 }, o.g);
        o.folds = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': 0.55, 'stroke-linejoin': 'round' }, o.g);
        o.sil = mk('path', { 'class': 'lv-line', fill: 'none', stroke: INK.ink, 'stroke-width': 0.85, 'stroke-linejoin': 'round' }, o.g);
        return o;
      });
      return function (t) {
        t = t % 12;
        ds.forEach(function (o, i) {
          var a = t - AT[i], d;
          if (a <= 0 || a >= 2 * MOVE + HOLD) d = 0;
          else d = OUT * (a < MOVE ? inout(a / MOVE) : a < MOVE + HOLD ? 1 : 1 - inout((a - MOVE - HOLD) / MOVE));
          if (d < 0.3) { o.g.style.display = 'none'; return; }
          o.g.style.display = '';
          var xa = o.x0 + 0.8, xb = o.x0 + BAY - 0.8, za = o.z0 + 0.6, zb = o.z0 + MOD - 0.6, yb = yf + 2.2 + d, yp = yf + d;
          var y1 = yf + 1.0, y3 = yf + 3.5, side = yb > y3;
          o.right.setAttribute('d', side ? poly([T(xb, y3, za), T(xb, yb, za), T(xb, yb, zb), T(xb, y3, zb)]) : '');
          o.tray.setAttribute('d', yp > y1 ? poly([T(xa, y1, zb), T(xb, y1, zb), T(xb, yp, zb), T(xa, yp, zb)]) : '');
          o.top.setAttribute('d', poly([T(xa, Math.max(y1, yp), zb), T(xb, Math.max(y1, yp), zb), T(xb, yb, zb), T(xa, yb, zb)]));
          o.front.setAttribute('d', poly([T(xa, yb, za), T(xb, yb, za), T(xb, yb, zb), T(xa, yb, zb)]));
          o.seal.setAttribute('d', poly([T(xa, yb + 0.05, zb - 3.4), T(xb, yb + 0.05, zb - 3.4), T(xb, yb + 0.05, zb), T(xa, yb + 0.05, zb)]));
          var xm = o.x0 + BAY / 2, zm = o.z0 + MOD / 2 - 0.8;
          o.pull.setAttribute('d', poly([T(xm - 6, yb + 1.2, zm - 0.6), T(xm + 6, yb + 1.2, zm - 0.6), T(xm + 6, yb + 1.2, zm + 0.6), T(xm - 6, yb + 1.2, zm + 0.6)]));
          // the sheets standing in the tray, their heads seen from above
          var sh = '';
          for (var k = 1; k <= 3; k++) { var ys = yp - 5.5 * k; if (ys > y1 + 0.5) sh += line([T(xa + 2.5, ys, zb), T(xb - 2.5, ys, zb)]); }
          o.sheets.setAttribute('d', sh);
          // the folds: the front's head and its side; the panel's back, on the top and on the side; the tray's rim
          o.folds.setAttribute('d', line([T(xa, yb, zb), T(xb, yb, zb)]) +
            (side ? line([T(xb, yb, zb), T(xb, yb, za)]) + line([T(xb, y3, zb), T(xb, yb, zb)]) : '') +
            (yp > y1 ? line([T(xa, yp, zb), T(xb, yp, zb)]) + line([T(xa + 1.2, y1, zb), T(xa + 1.2, yp, zb)]) : '') +
            (yp > y3 ? line([T(xb, yp, zb), T(xb, yp, za)]) : ''));
          // the outline of what is seen of it
          o.sil.setAttribute('d', side
            ? poly([T(xa, y1, zb), T(xb, y1, zb), T(xb, y3, zb), T(xb, y3, za), T(xb, yb, za), T(xa, yb, za), T(xa, yb, zb)])
            : poly([T(xa, y1, zb), T(xb, y1, zb), T(xb, yb, zb), T(xb, yb, za), T(xa, yb, za), T(xa, yb, zb)]));
        });
      };
    }
  };

  (function () {
    var pics = slice(document.querySelectorAll('picture[data-live]'));
    if (!pics.length || mq.matches) return;
    var C = Math.cos(Math.PI / 6), live = [];
    pics.forEach(function (pic) {
      var img = pic.querySelector('img'), fig = pic.parentNode, L;
      try { L = JSON.parse(pic.getAttribute('data-live')); } catch (e) { return; }
      if (!img || !SCENES[L.kind]) return;
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
        var src = img.currentSrc || img.src, s = /-s\.svg/.test(src);
        if (svg && s === small) { place(); return; }
        if (run) { base += run.now(); run.stop(); }
        var t0 = base;
        if (svg) svg.remove();
        if (dim) dim.remove();
        small = s;
        var F = L.frames[s ? 's' : 'l'];
        var T = function (x, y, z) { return [((x - y) * C - F[0]) * F[2] + F[3], ((x + y) / 2 - z - F[1]) * F[2] + F[3]]; };
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
      }
      function start() { build(); live.push({ stop: function () { if (run) run.stop(); if (svg) svg.remove(); if (dim) dim.remove(); fig.classList.remove('is-live'); } }); }
      if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start, { once: true });
      img.addEventListener('load', build);                       // a phone's picture and a wider one: each its frame
      if ('ResizeObserver' in window) new ResizeObserver(place).observe(img);
      window.addEventListener('resize', place);
    });
    var off = function () { if (mq.matches) live.forEach(function (l) { l.stop(); }); };
    if (mq.addEventListener) mq.addEventListener('change', off); else if (mq.addListener) mq.addListener(off);
  })();

  /* ------------------------------------------------------------------------------------------- 12. the map's day */
  // The home's map of the desks keeps a day of the reader's own date (round 24e), a day in 24 s from the hour it is
  // now: the night side goes west over Earth, the land in it darker, deepest where the sun is furthest under; the
  // desks shut at their sunset and open at their sunrise, each opening a ring; the seat stands as it is. Out of view,
  // or with the page hidden, the day waits. Without the script, and under reduced motion, the map is still: every desk
  // open, no night.
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
    // the night: the land under it drawn again, darker, in two depths
    var td = Math.tan(dec * rad);
    function night(sub) {                                        // the side of Earth where the sun is under the horizon
      var pts = [];
      for (var lon = -180; lon <= 180; lon += 3) pts.push(at(lon, Math.atan(-Math.cos((lon - sub) * rad) / td) / rad));
      var yE = dec < 0 ? -30 : H + 30;
      pts.push([1030, pts[pts.length - 1][1]], [1030, yE], [-30, yE], [-30, pts[0][1]]);
      return 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L') + 'Z';
    }
    var NS = 'http://www.w3.org/2000/svg', id = 'dmn' + Math.random().toString(36).slice(2, 7);
    function el(tag, attrs, parent, before) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (before) parent.insertBefore(e, before); else if (parent) parent.appendChild(e);
      return e;
    }
    var defs = el('defs', {}, svg, svg.firstChild);
    var clips = ['a', 'b', 'c'].map(function (k) { return el('path', {}, el('clipPath', { id: id + k }, defs)); });
    var after = land.nextSibling;
    var dusk = land.cloneNode(false); dusk.setAttribute('class', 'dmap__land dmap__land--dusk');
    dusk.setAttribute('clip-path', 'url(#' + id + 'a)');
    svg.insertBefore(dusk, after);
    var deep = el('g', { 'clip-path': 'url(#' + id + 'b)', 'class': 'dmap__night' }, svg, after);
    var dk = land.cloneNode(false); dk.setAttribute('class', 'dmap__land dmap__land--night');
    dk.setAttribute('clip-path', 'url(#' + id + 'c)');
    deep.appendChild(dk);
    // the desks (the seat aside): each its place, and a ring for its sunrise
    var desks = Array.prototype.slice.call(svg.querySelectorAll('a.dm[data-ll]')).filter(function (a) {
      return !a.classList.contains('dm--seat');
    }).map(function (a) {
      var ll = a.getAttribute('data-ll').split(' ').map(Number), g = a.querySelector('.dm__at');
      return { a: a, lat: ll[0] * rad, lon: ll[1], open: true, dawn: -9,
               ring: el('circle', { 'class': 'dm__dawn', r: 7 }, g, g.firstChild) };
    });
    var sinD = Math.sin(dec * rad), cosD = Math.cos(dec * rad), RISE = Math.sin(-0.833 * rad);
    function frame(t) {
      var sub = sub0 - 360 * t / DAY, fade = Math.min(1, t / 0.8).toFixed(3);
      clips[0].setAttribute('d', night(sub));
      clips[1].setAttribute('d', night(sub + 12));
      clips[2].setAttribute('d', night(sub - 12));
      dusk.style.opacity = fade; deep.style.opacity = fade;
      desks.forEach(function (d) {
        var e = Math.sin(d.lat) * sinD + Math.cos(d.lat) * cosD * Math.cos((d.lon - sub) * rad), open = e > RISE;
        if (open !== d.open) {
          d.open = open; d.a.classList.toggle('is-shut', !open);
          if (open && t > 0) d.dawn = t;
        }
        var p = (t - d.dawn) / 1.4;
        if (p >= 0 && p < 1) {
          var q = 1 - Math.pow(1 - p, 3);
          d.ring.setAttribute('r', (7 + 13 * q).toFixed(2));
          d.ring.style.opacity = (0.75 * (1 - p)).toFixed(3);
        } else d.ring.style.opacity = '0';
      });
    }
    var run = runner(svg, frame);
    fig.classList.add('is-day');
    var off = function () {
      if (!mq.matches) return;
      run.stop(); dusk.remove(); deep.remove(); defs.remove(); fig.classList.remove('is-day');
      desks.forEach(function (d) { d.ring.remove(); d.a.classList.remove('is-shut'); });
    };
    if (mq.addEventListener) mq.addEventListener('change', off); else if (mq.addListener) mq.addListener(off);
  })();

})();

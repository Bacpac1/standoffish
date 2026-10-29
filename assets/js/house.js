/* The house's one script. It requests nothing from anyone, stores nothing and reads nothing back; the pages are
   whole without it.
   1. The rooms. Each of the Register's photographs has a depth (near = white). As the page is read, the camera
      passes the room by a few millimetres: the act at the centre of the picture stays where it is, the room
      opens around it. The picture's frame and its stamp stay put. WebGL2 only; never under reduced motion.
   2. The seat. The time in Longyearbyen, and whether the sun rises there today.
   3. The desks. Find a desk: the atlas's views as tabs with their counts, a search and a filter by service over the
      map, its list and the directory; a desk opens beside the map; Earth zooms and pans. Whole without it.
   4. The carriers. Each node of the network's drawing gives its card and lights what it works with; the day of link
      windows marks the hour in TCB.
   5. The slip. The lodging slip on /reply/ rises out of the desk's printer as the page reaches it.
   6. The year's light. On /visit/, the reader's today and now on the year of light at the seat; any day read out.
   7. The statement. One year for every card of the annual statement, chosen above or under the pointer.
   8. The clock. On /service-standards/, the clock runs once across its six weeks as the page reaches it. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var saveData = navigator.connection && navigator.connection.saveData;

  /* ------------------------------------------------------------------------------------------- 1. the rooms */
  var VS = '#version 300 es\nin vec2 a;out vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
  var FS = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uImg,uDepth;uniform vec2 uShift,uCentre;uniform float uFocus,uDolly,uAR,uStampX,uStampS;',
    'in vec2 v;out vec4 o;',
    'void main(){',
    '  vec2 p=vec2(v.x,1.-v.y);',
    // the frame stays: the pass fades out toward every edge, and around the stamp at the top left
    '  float m=smoothstep(0.,.06,p.x)*smoothstep(0.,.06,1.-p.x)*smoothstep(0.,.09,p.y)*smoothstep(0.,.09,1.-p.y);',
    '  vec2 sc=vec2(uStampX+uStampS*.5,(uStampX+uStampS*.5)*uAR);',
    '  float ds=length((p-sc)*vec2(1.,1./uAR));',
    '  m*=smoothstep(uStampS*1.4,uStampS*5.,ds);',
    '  vec2 off=(vec2(uShift.x,uShift.y*uAR)+(p-uCentre)*uDolly)*m;',
    // march from near to far: the first surface the shifted ray meets is the one that shows
    '  float d=1.,prev=1.;const int N=26;',
    '  for(int i=0;i<=N;i++){vec2 q=p-off*(d-uFocus);if(texture(uDepth,q).r>=d)break;prev=d;d-=1./float(N);}',
    '  float lo=max(d,0.),hi=prev;',
    '  for(int j=0;j<6;j++){float mid=.5*(lo+hi);if(texture(uDepth,p-off*(mid-uFocus)).r>=mid)lo=mid;else hi=mid;}',
    '  o=texture(uImg,clamp(p-off*(lo-uFocus),0.,1.));',
    '}'].join('\n');

  var rooms = [], ticking = false;

  function progressOf(el) {
    if (typeof el._tour === 'number') return { p: el._tour, on: !!el._tourOn };   // held in the tour (1b)
    var r = el.getBoundingClientRect(), vh = window.innerHeight || 1;
    var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
    return { p: Math.max(-1, Math.min(1, p)), on: r.bottom > -40 && r.top < vh + 40 };
  }

  function loadImage(src) {
    return new Promise(function (ok, no) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { ok(im); }; im.onerror = no; im.src = src;
    });
  }

  function shader(gl, type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function texture(gl, unit, img, mip) {
    var t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mip) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return t;
  }

  function wake(el) {
    if (el._room) return;
    el._room = 'waking';
    var img = el.querySelector('img');
    var ready = img.complete && img.naturalWidth ? Promise.resolve() : new Promise(function (ok, no) {
      img.addEventListener('load', ok, { once: true }); img.addEventListener('error', no, { once: true });
    });
    Promise.all([ready.then(function () { return img.decode ? img.decode().catch(function () {}) : null; }),
                 loadImage(el.getAttribute('data-depth'))]).then(function (got) {
      var cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      var gl = cv.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false,
                                         preserveDrawingBuffer: false, powerPreference: 'low-power' });
      if (!gl) { el._room = 'none'; return; }
      var pr = gl.createProgram();
      gl.attachShader(pr, shader(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(pr, shader(gl, gl.FRAGMENT_SHADER, FS));
      gl.bindAttribLocation(pr, 0, 'a'); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      texture(gl, 0, img, true); texture(gl, 1, got[1], false);
      var U = {}; ['uImg', 'uDepth', 'uShift', 'uCentre', 'uFocus', 'uDolly', 'uAR', 'uStampX', 'uStampS'].forEach(function (n) {
        U[n] = gl.getUniformLocation(pr, n);
      });
      gl.uniform1i(U.uImg, 0); gl.uniform1i(U.uDepth, 1);
      var nw = img.naturalWidth, nh = img.naturalHeight;
      gl.uniform1f(U.uAR, nw / nh);
      gl.uniform1f(U.uFocus, parseFloat(el.getAttribute('data-focus')) || 0.5);
      gl.uniform1f(U.uStampX, 40 / 1440); gl.uniform1f(U.uStampS, 22 / 1440);
      var c = (el.getAttribute('data-centre') || '0.5,0.5').split(',').map(parseFloat);
      gl.uniform2f(U.uCentre, c[0], c[1]);
      cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); el.classList.remove('is-live'); el._room = 'lost'; });
      el.appendChild(cv);
      el._room = { cv: cv, gl: gl, U: U, last: null };
      fit(el); draw(el, true);
      requestAnimationFrame(function () { el.classList.add('is-live'); });
    }).catch(function () { el._room = 'none'; });
  }

  function fit(el) {
    var R = el._room; if (!R || !R.gl) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = el.clientWidth, h = el.clientHeight;
    var cw = Math.round(w * dpr), ch = Math.round(h * dpr);
    if (R.cv.width !== cw || R.cv.height !== ch) { R.cv.width = cw; R.cv.height = ch; R.gl.viewport(0, 0, cw, ch); R.last = null; }
  }

  var K = 0.013, KY = 0.32, DOLLY = 0.010;
  function draw(el, force) {
    var R = el._room; if (!R || !R.gl) return;
    var st = progressOf(el);
    if (!st.on && !force) return;
    var p = st.p;
    if (!force && R.last !== null && Math.abs(R.last - p) < 0.0004) return;
    R.last = p;
    var gl = R.gl;
    gl.uniform2f(R.U.uShift, -p * K, -p * K * KY);
    gl.uniform1f(R.U.uDolly, -p * DOLLY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function tick() {
    ticking = false;
    if (tour) tourTick();
    rooms.forEach(function (el) { draw(el, false); });
  }

  /* ------------------------------------------------------------------------------------------- 1b. the tour
     On the home the three rooms are held in one frame while the reader goes on: the words change, Replies, then
     Certification, then Records, and the camera passes each room in its turn, as it passes them on their pages.
     Without the script, or under reduced motion, the three stand one after another as before. */
  var tour = null, arts = [], marks = [];
  function tourTick() {
    var r = tour.getBoundingClientRect(), vh = window.innerHeight || 1, span = r.height - vh;
    var P = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    var n = arts.length, x = Math.min(P * n, n - 1e-6), k = Math.floor(x), q = x - k;
    var near = r.bottom > -40 && r.top < vh + 40;
    arts.forEach(function (a, i) {
      a.classList.toggle('is-on', i === k);
      var room = a.querySelector('.room');
      if (room) { room._tour = i < k ? 1 : i > k ? -1 : q * 2 - 1; room._tourOn = near && Math.abs(i - k) <= 1; }
    });
    marks.forEach(function (m, i) { m.classList.toggle('is-on', i === k); });
  }
  function startTour() {
    tour = document.querySelector('[data-tour]');
    if (!tour || mq.matches) { tour = null; return; }
    arts = Array.prototype.slice.call(tour.querySelectorAll('.wk'));
    marks = Array.prototype.slice.call(tour.querySelectorAll('.tour__marks li'));
    if (arts.length < 2) { tour = null; return; }
    tour.classList.add('is-tour');
    tourTick();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  function stopTour() {
    if (!tour) return;
    tour.classList.remove('is-tour');
    arts.forEach(function (a) { a.classList.remove('is-on'); var r = a.querySelector('.room'); if (r) delete r._tour; });
    tour = null;
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }
  function onResize() { rooms.forEach(function (el) { fit(el); draw(el, true); }); }

  function startRooms() {
    if (mq.matches || saveData || !window.WebGL2RenderingContext || !window.Promise) return;
    rooms = Array.prototype.slice.call(document.querySelectorAll('.room[data-depth]'));
    if (!rooms.length) return;
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) wake(e.target); });
    }, { rootMargin: '300px 0px' }) : null;
    rooms.forEach(function (el) { if (io) io.observe(el); else wake(el); });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
  }
  function stopRooms() {
    rooms.forEach(function (el) { el.classList.remove('is-live'); });
    window.removeEventListener('scroll', onScroll);
  }
  startTour();
  startRooms();
  if (mq.addEventListener) mq.addEventListener('change', function () {
    if (mq.matches) { stopTour(); stopRooms(); } else { startTour(); startRooms(); }
  });

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
    var inArea = function (d) { return d.view !== 'earth' || words.length || area === 'all' || (area === 'view' ? inside(d) : d.c === area); };
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
        var vis = on && d.view === cur && inArea(d);
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
    /* the lodging slip rises out of the desk's printer, its first line first, as the page reaches it; under the pointer,
       a part of the slip and its name beside it light each other */
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

  /* ------------------------------------------------------------------------------------------- 4. the carriers */
  var netw = document.querySelector('[data-netw]');
  if (netw) (function () {
    /* every station, relay and vessel of the drawing gives its card (the gazetteer's facts, and its windows) and lights
       what it works with; the day of windows below marks the hour in TCB on the reader's clock, and the windows open
       at it. TCB runs ahead of UTC by the leap seconds, 32.184 s and the rate of the barycentre. */
    var nodes = {}; try { nodes = JSON.parse(netw.getAttribute('data-netw')); } catch (e) {}
    var stage = netw.querySelector('.netw__stage'), card = netw.querySelector('[data-netw-card]');
    var nn = slice(netw.querySelectorAll('.nn')), links = slice(netw.querySelectorAll('[data-link]'));
    var rows = slice(netw.querySelectorAll('[data-node-row]'));
    var pinned = null;
    var esc = function (t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
    function light(code) {
      var n = nodes[code]; netw.classList.toggle('is-lit', !!n);
      var withs = n ? n.with_ : [];
      nn.forEach(function (a) { var c = a.getAttribute('data-node'); a.classList.toggle('is-on', c === code); a.classList.toggle('is-with', withs.indexOf(c) >= 0); });
      links.forEach(function (l) { l.classList.toggle('is-with', !!code && (' ' + l.getAttribute('data-link') + ' ').indexOf(' ' + code + ' ') >= 0); });
      rows.forEach(function (r) { r.classList.toggle('is-on', !!code && (' ' + r.getAttribute('data-node-row') + ' ').indexOf(' ' + code + ' ') >= 0); });
      if (!n) { card.classList.remove('is-on'); card.hidden = true; return; }
      card.innerHTML = '<h3>' + esc(n.name) + '</h3><p class="c">' + esc(n.code) + '</p><dl>' +
        n.rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>';
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
      a.addEventListener('click', function (e) { e.preventDefault(); pinned = pinned === c ? null : c; light(pinned); });
    });
    rows.forEach(function (r) {
      var c = r.getAttribute('data-node-row').split(' ')[0];
      r.addEventListener('mouseenter', function () { light(c); });
      r.addEventListener('mouseleave', function () { light(pinned); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pinned) { pinned = null; light(null); } });
    document.addEventListener('click', function (e) { if (pinned && !e.target.closest('.nn')) { pinned = null; light(null); } });
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
        now.removeAttribute('hidden');
        setTimeout(tick, 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50);
      };
      tick();
    }
  })();

})();

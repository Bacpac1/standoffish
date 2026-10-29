/* The house's one script. It requests nothing from anyone, stores nothing and reads nothing back; the pages are
   whole without it.
   1. The rooms. Each of the Register's photographs has a depth (near = white). As the page is read, the camera
      passes the room by a few millimetres: the act at the centre of the picture stays where it is, the room
      opens around it. The picture's frame and its stamp stay put. WebGL2 only; never under reduced motion.
   2. The seat. The time in Longyearbyen, and whether the sun rises there today.
   3. The desks. A filter by service over the list of desks, which is whole without it. */
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
  var filt = document.querySelector('[data-desk-filter]');
  if (filt) {
    var all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
    var desks = all('.desk[data-f]'), boxes = all('[data-group], .dcont, .dregion');
    var count = filt.querySelector('[data-desk-count]');
    var buttons = Array.prototype.slice.call(filt.querySelectorAll('button[data-f]'));
    var apply = function (f) {
      var n = 0;
      desks.forEach(function (d) {
        var on = f === 'all' || (' ' + d.getAttribute('data-f') + ' ').indexOf(' ' + f + ' ') >= 0;
        d.hidden = !on; if (on) n++;
      });
      boxes.forEach(function (b) { b.hidden = !b.querySelector('.desk:not([hidden])'); });
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === f ? 'true' : 'false'); });
      count.textContent = n + (n === 1 ? ' desk' : ' desks');
    };
    buttons.forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-f')); }); });
    filt.hidden = false;
    apply('all');
  }
})();

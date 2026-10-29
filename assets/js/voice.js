/* STANDOFFISH · NOSLEN's voice as light, drawn live (the films' own band model, ported from siriglow.py: four soft
   bands under a pinched envelope, each band's weight (thick / (dist + 0.32 thick))^1.5, running to white where three
   or more overlap). At rest it breathes. In the NOSLEN section the page holds still while the visitor reads on, and
   the light says the card's first lines, word by word: the scroll is its clock, so it says them as fast as they are
   read, and backwards if the reader goes back. The stamp is drawn in its corner, as on every picture.
   No WebGL2, no script, or reduced motion: the still picture, and the words all lit. */
(function () {
  'use strict';
  var fig = document.querySelector('[data-voice]');
  if (!fig || !window.WebGL2RenderingContext) return;
  var sec = fig.closest('[data-seq]') || fig.parentNode;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false,
                                         premultipliedAlpha: false, preserveDrawingBuffer: false,
                                         powerPreference: 'low-power' });
  if (!gl) return;

  var VS = '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uRes;uniform vec4 uCap;uniform float uPhase,uYS,uTh,uHN,uT,uGain,uHalo,uDpr;',
    'uniform vec3 uC0,uC1,uC2,uC3,uNavy,uDeep,uPaper;uniform vec3 uStamp;',
    'out vec4 o;',
    'float ss(float a,float b,float v){float u=clamp((v-a)/(b-a),0.,1.);return u*u*(3.-2.*u);}',
    'float hash(vec2 q){return fract(sin(dot(q,vec2(12.9898,78.233)))*43758.5453);}',
    'vec3 light(vec2 fc){',
    '  float xs=(fc.x-uCap.x)/uCap.z, ys=(uCap.y-fc.y)/uCap.w, x01=xs*.5+.5;',
    '  float ins=step(0.,x01)*step(x01,1.);',
    '  float env=ins*pow(max(sin(clamp(x01,0.,1.)*3.14159265),0.),2.8);',
    '  float fade=ss(0.,.42,x01)*ss(1.,.58,x01);',
    '  vec3 acc=vec3(0.),halo=vec3(0.);float dens=0.,hits=0.;',
    '  vec3 C[4];C[0]=uC0;C[1]=uC1;C[2]=uC2;C[3]=uC3;',
    '  float AW[4]=float[4](1.30,.70,1.22,.72),TW[4]=float[4](1.35,.72,1.30,.75),PW[4]=float[4](0.,.38,.75,1.15);',
    '  for(int i=0;i<4;i++){',
    '    float harm=1.+.12*sin(uT*1.5+float(i)*1.3)+.10*uHN;',
    '    float wy=sin(xs*1.6+uPhase-4.1*PW[i])*AW[i]*harm*uYS*env;',
    '    float d=abs(ys-wy);',
    '    float th=uTh*env*TW[i]+1e-6;',
    '    float w=pow(clamp(th/(d+th*.32),0.,1.),1.5)*fade;',
    '    acc+=w*C[i];dens+=w*fade;',
    '    float u=clamp(1.-d/(th*2.2),0.,1.);hits+=u*u*(3.-2.*u);',
    '    float sg=.14+.36*th;',
    '    halo+=C[i]*exp(-d*d/(2.*sg*sg))*fade*env*env;',
    '  }',
    '  float wf=ss(1.85,3.4,dens)*step(1.85,dens)*step(2.3,hits);',
    '  acc=acc*(1.-wf*.85)+vec3(1.55*wf*.85);',
    '  return clamp(acc*1.15*uGain,0.,1.6)+halo*uHalo;',
    '}',
    'void main(){',
    '  vec2 fc=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);',
    '  float y01=fc.y/uRes.y;',
    '  vec3 ground=uNavy;',
    '  vec3 c=clamp(light(fc),0.,1.);',
    '  c*=ss(0.,.10,y01)*ss(1.,.90,y01);',
    '  vec3 col=1.-(1.-ground)*(1.-c);',
    '  vec2 s=(fc-uStamp.xy)/uStamp.z*26.;',
    '  if(s.x>=0.&&s.y>=0.&&s.x<26.&&s.y<26.){',
    '    bool win=s.x>=7.&&s.x<19.&&s.y>=7.&&s.y<19.;',
    '    bool core=s.x>=10.5&&s.x<15.5&&s.y>=10.5&&s.y<15.5;',
    '    if(!win||core)col=uPaper;',
    '  }',
    '  col+=(hash(floor(fc/uDpr))-.5)*.010*max(max(c.r,c.g),c.b);',
    '  o=vec4(col,1.);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { return; }
  gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['uRes', 'uCap', 'uPhase', 'uYS', 'uTh', 'uHN', 'uT', 'uGain', 'uHalo', 'uDpr', 'uC0', 'uC1', 'uC2', 'uC3', 'uNavy',
   'uDeep', 'uPaper', 'uStamp'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
  function hex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }
  var cols = (fig.getAttribute('data-voice') || '#FF3B30 #FF9F0A #FF6A3D #FFC24A').split(' ').map(hex);
  [U.uC0, U.uC1, U.uC2, U.uC3].forEach(function (u, i) { gl.uniform3fv(u, cols[i]); });
  gl.uniform3fv(U.uNavy, hex('#1a2944')); gl.uniform3fv(U.uDeep, hex('#121c31')); gl.uniform3fv(U.uPaper, hex('#ece4d2'));

  /* ---- the line: each word's syllables and the pause after it (from the page), as a voice the light can say */
  var words = [].slice.call(sec.querySelectorAll('.nos__say .w'));
  var CR = 120, SYL = 0.165, LEAD = 0.25;
  var t = LEAD, syl = [];
  words.forEach(function (w) {
    var n = w.hasAttribute('data-syl') ? +w.getAttribute('data-syl') : 1, pause = +w.getAttribute('data-pause') || 0;
    w._t0 = t;
    for (var j = 0; j < n; j++) { var d = SYL * (j === 0 ? 1.12 : 0.9); syl.push([t, d, j === 0 ? 1 : 0.74]); t += d; }
    w._t1 = t; t += pause;
  });
  var T = t + 0.5, N = Math.ceil(T * CR) + 2;
  var A = new Float32Array(N), HI = new Float32Array(N), SP = new Float32Array(N), PH = new Float32Array(N);
  (function () {
    var nr = new Float32Array(N), nf = new Float32Array(N), i, k;
    for (k = 0; k < syl.length; k++) {
      var s0 = syl[k][0], d = syl[k][1], st = syl[k][2];
      for (i = Math.max(0, Math.floor(s0 * CR)); i < Math.min(N, Math.ceil((s0 + d + 0.12) * CR)); i++) {
        var tt = i / CR - s0;
        var a = st * smooth(0, 0.035, tt) * (1 - smooth(d * 0.55, d + 0.07, tt)) * (0.86 + 0.14 * Math.sin(37 * s0 + tt * 9));
        nr[i] = Math.max(nr[i], a);
        if (tt >= 0) nf[i] = Math.max(nf[i], st * Math.exp(-tt / 0.03));
      }
    }
    var amp = 0, high = 0, speak = 0, ph = 0;
    function kof(sec_) { return 1 - Math.exp(-1 / Math.max(CR * sec_, 1e-4)); }
    for (i = 0; i < N; i++) {
      amp += (nr[i] - amp) * kof(nr[i] > amp ? 0.045 : 0.22);
      high += (nf[i] - high) * kof(nf[i] > high ? 0.03 : 0.16);
      var g = nr[i] > 0.045 || (speak > 0.5 && nr[i] > 0.018);
      var tgt = g ? Math.min(1, 0.35 + amp * 0.9) : 0;
      speak += (tgt - speak) * kof(tgt > speak ? 0.06 : 0.28);
      ph += (1.55 * speak * (0.35 + amp) + 0.45 * high) / CR;     // the speaking's own advance; the rest is time's
      A[i] = amp; HI[i] = high; SP[i] = speak; PH[i] = ph;
    }
  })();
  function smooth(a, b, v) { var u = Math.min(1, Math.max(0, (v - a) / (b - a))); return u * u * (3 - 2 * u); }
  function at(arr, tau) {
    var x = Math.min(Math.max(tau * CR, 0), N - 1.001), i = Math.floor(x), f = x - i;
    return arr[i] * (1 - f) + arr[i + 1] * f;
  }

  /* ---- where the reader is: the section's progress, and the line's time it stands for */
  var seq = !reduce && sec.hasAttribute('data-seq') && words.length > 0;
  function progress() {
    var r = sec.getBoundingClientRect(), span = r.height - window.innerHeight;
    return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
  }
  function tauOf(p) { return Math.min(1, Math.max(0, (p - 0.08) / 0.80)) * T; }
  var lit = -2, cur = -2;
  function mark(tau) {
    var n = 0, c = -1;
    for (var k = 0; k < words.length; k++) {
      if (tau >= words[k]._t0 - 0.01) n = k + 1;
      if (tau >= words[k]._t0 - 0.01 && tau < words[k]._t1 + 0.06) c = k;
    }
    if (n === lit && c === cur) return;
    for (k = 0; k < words.length; k++) {
      words[k].classList.toggle('w--lit', k < n); words[k].classList.toggle('w--now', k === c);
    }
    lit = n; cur = c;
  }

  /* ---- size and draw */
  var W = 0, H = 0, dpr = 1;
  function size() {
    var r = fig.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    var cap = 4.2e6 / (w * h);                       // never more than about 4 million pixels
    if (cap < 1) { var k = Math.sqrt(cap); w = Math.round(w * k); h = Math.round(h * k); dpr *= k; }
    if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; gl.viewport(0, 0, W, H); }
  }
  var t0 = performance.now();
  function draw(now, tau) {
    var tr = (now - t0) / 1000;
    var s = { amp: 0, high: 0, speak: 0, ph: 0 };
    if (tau > 0 && tau < T) s = { amp: at(A, tau), high: at(HI, tau), speak: at(SP, tau), ph: at(PH, tau) };
    else if (tau >= T) s.ph = PH[N - 1];
    // at rest it breathes: a held, half-open voice, slowly
    var br = 0.5 + 0.5 * Math.sin(tr * 2 * Math.PI / 5.8);
    var rest = 1 - Math.min(1, s.speak / 0.35);
    var amp = Math.max(s.amp, rest * (0.10 + 0.14 * br)), speak = Math.max(s.speak, rest * 0.34);
    var live = smooth(0, 1, (speak - 0.08) / 0.32);
    var lowN = 0.45 + (Math.min(1, amp * 1.05) - 0.45) * live;
    var midN = 0.40 + (Math.min(1, amp * 0.55 + s.high * 0.45) - 0.40) * live;
    var highN = 0.30 + (Math.min(1, s.high) - 0.30) * live;
    var ys = 0.66 * (1 + 0.42 * live * Math.min(1, amp)) * (0.92 + 0.16 * lowN);
    var th = 0.30 * (1 + 0.12 * live) * (0.94 + 0.14 * midN);
    var land = W >= H * 1.3;
    var cx = W * 0.5, cy = H * 0.5;
    var capW = land ? Math.min(W * 0.62, H * 2.2) : W * 0.96, capH = land ? H * 0.40 : W * 0.27;
    var st = Math.max(22 / 1440 * W, Math.min(W, H) / 50, 12 * dpr), m = Math.max(40 / 1440 * W, 16 * dpr);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform4f(U.uCap, cx, cy, capW / 2, capH / 2);
    gl.uniform1f(U.uPhase, 2.35 + 2.4 * tr + 1.6 * s.ph);
    gl.uniform1f(U.uYS, ys); gl.uniform1f(U.uTh, th); gl.uniform1f(U.uHN, highN); gl.uniform1f(U.uT, tr);
    gl.uniform1f(U.uGain, 0.72); gl.uniform1f(U.uHalo, 0.42); gl.uniform1f(U.uDpr, dpr);
    gl.uniform3f(U.uStamp, m, m, st);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var visible = false, raf = 0, last = -1;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    size();
    var tau = seq ? tauOf(progress()) : 0;
    if (seq) mark(tau);
    draw(now, tau);
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  fig.appendChild(canvas);
  if (seq) sec.classList.add('is-seq');
  size(); draw(performance.now(), seq ? tauOf(progress()) : 0);
  fig.classList.add('is-live');
  if (seq) mark(tauOf(progress()));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting; if (visible) kick();
    }, { rootMargin: '120px' }).observe(fig);
  } else { visible = true; kick(); }
  window.addEventListener('resize', function () { size(); kick(); }, { passive: true });
  if (reduce) window.addEventListener('scroll', function () { kick(); }, { passive: true });
  document.addEventListener('visibilitychange', kick);
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fig.classList.remove('is-live'); visible = false; });
})();

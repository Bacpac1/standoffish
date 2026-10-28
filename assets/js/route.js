/* A route's page: one event, drawn once, then still. It requests nothing, stores nothing and reads nothing back.
   Under reduced motion the event's end is drawn at once. Without this script the page shows a still of that end. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var cv = document.querySelector('.rt__fx');
  if (!cv || !cv.getContext) return;
  var id = root.getAttribute('data-route');
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0;
  var css = getComputedStyle(root);
  var FG = css.getPropertyValue('--fg').trim(), ACC = css.getPropertyValue('--acc').trim();

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ease(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
  function smooth(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
  function alpha(c, a) { ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.fillStyle = c; }
  function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

  var FX = {
    /* Hail: a call goes out from where the click was, after a sender that is ahead of it; the relay holds it */
    hail: { end: 3.4, draw: function (t) {
      var oy = H * 0.30, ox = W * 0.14, bx = W * 0.46, sx = W * 0.72 + W * 0.012 * Math.min(t, 3.4);
      ctx.lineWidth = 1;
      alpha(FG, 0.12); line(0, oy, W, oy);
      var r = Math.max(0, t - 0.35) * W * 0.30, reach = bx - ox;
      var hit = smooth(reach * 0.98, reach * 1.08, r);
      alpha(FG, 0.22 + 0.5 * hit * (1 - smooth(1.6, 3.2, t)) + 0.18 * hit); line(bx, H * 0.08, bx, H * 0.52);
      if (r > 0) {                                   // the front, held at the relay: nothing passes it
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, bx, H); ctx.clip();
        alpha(FG, 0.85 * (1 - smooth(reach * 0.6, reach * 1.9, r)));
        ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        if (r > reach) {
          var half = Math.min(Math.sqrt(r * r - reach * reach), H * 0.21);
          alpha(ACC, 0.9 * (1 - smooth(1.8, 3.4, t)) + 0.25); ctx.lineWidth = 2;
          line(bx, oy - half, bx, oy + half);
        }
      }
      alpha(FG, 0.9); ctx.beginPath(); ctx.arc(ox, oy, 3, 0, Math.PI * 2); ctx.fill();
      alpha(ACC, 1); ctx.beginPath(); ctx.arc(sx, oy, 4.5, 0, Math.PI * 2); ctx.fill();
    } },

    /* Thrice: three witnesses set out for a door; the way to a terminal is not there */
    thrice: { end: 1.9, draw: function (t) {
      var cy = H * 0.36, x0 = W * 0.16, dx = W * 0.74, s = Math.max(7, Math.min(W, H) * 0.014);
      alpha(FG, 1);
      [[0, -1.6], [-1.4, 0.9], [1.4, 0.9]].forEach(function (p) {
        var x = x0 + p[0] * s * 1.25, y = cy + p[1] * s * 1.25;
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
      });
      ctx.lineWidth = 1.5; alpha(FG, 0.9);
      var dw = Math.max(34, Math.min(W, H) * 0.075), dh = dw * 2.3; ctx.strokeRect(dx, cy - dh * 0.62, dw, dh);
      alpha(FG, 0.5); line(dx - dw * 0.5, cy + dh * 0.38, dx + dw * 1.5, cy + dh * 0.38);
      var a = x0 + s * 3.2, stop = W * 0.52, p = ease((t - 0.25) / 1.2), xe = a + (stop - a) * p;
      ctx.setLineDash([6, 7]); alpha(FG, 0.75); line(a, cy, xe, cy); ctx.setLineDash([]);
      if (p > 0.99) { alpha(FG, 0.9); ctx.lineWidth = 1.5; line(stop + 8, cy - 9, stop + 8, cy + 9); }
    } },

    /* Lintel: an empty lot; a doorway staked out where none stands yet */
    lintel: { end: 2.1, draw: function (t) {
      var gy = H * 0.66, cx = W * 0.5, hw = Math.max(26, W * 0.045), top = gy - Math.max(120, H * 0.30);
      ctx.lineWidth = 1; alpha(FG, 0.45); line(W * 0.06, gy, W * 0.94, gy);
      var path = [[cx - hw, gy, cx - hw, top], [cx - hw * 1.3, top, cx + hw * 1.3, top], [cx + hw, top, cx + hw, gy]];
      var total = 0, lens = path.map(function (s) { var l = Math.hypot(s[2] - s[0], s[3] - s[1]); total += l; return l; });
      var shown = total * ease((t - 0.2) / 1.5), dash = 7, gap = 6;
      alpha(FG, 0.8); ctx.lineWidth = 1.2;
      for (var i = 0, acc = 0; i < path.length; i++) {
        var s = path[i], L = lens[i];
        for (var d = 0; d < L; d += dash + gap) {
          if (acc + d > shown) break;
          var e = Math.min(d + dash, L, shown - acc), u0 = d / L, u1 = e / L;
          line(s[0] + (s[2] - s[0]) * u0, s[1] + (s[3] - s[1]) * u0, s[0] + (s[2] - s[0]) * u1, s[1] + (s[3] - s[1]) * u1);
        }
        acc += L;
      }
      if (t > 1.75) {
        alpha(FG, 0.7 * smooth(1.75, 2.05, t)); ctx.lineWidth = 1;
        [[cx - hw, gy], [cx + hw, gy], [cx - hw, top], [cx + hw, top]].forEach(function (p) {
          line(p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5); line(p[0] - 5, p[1] + 5, p[0] + 5, p[1] - 5);
        });
      }
    } },

    /* Fallow: the furrows run to a line, and past it nothing is drawn */
    fallow: { end: 2.3, draw: function (t) {
      var x0 = W * 0.05, bx = W * (W < 700 ? 0.82 : 0.58), y0 = H * 0.12, y1 = H * 0.60, n = 24;
      var xr = x0 + (bx - x0) * ease(t / 1.7);
      ctx.lineWidth = 1; alpha(FG, 0.55);
      for (var i = 0; i < n; i++) {
        var y = y0 + (y1 - y0) * i / (n - 1), ph = i * 0.7;
        ctx.beginPath();
        for (var x = x0; x <= xr; x += 6) {
          var yy = y + Math.sin(x / (W * 0.09) + ph) * H * 0.006 + Math.sin(x / (W * 0.031) + ph * 2.1) * H * 0.0018;
          if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      alpha(FG, 0.85 * smooth(1.6, 2.1, t)); ctx.lineWidth = 1.6; line(bx, H * 0.06, bx, H * 0.66);
    } },

    /* Roger: the decade that wanted everything answered; two marks wait to be filled, and stay as they are */
    roger: { end: 1.3, draw: function (t) {
      var p = clamp(t / 0.7, 0, 1), sp = 1 - Math.cos(p * Math.PI * 1.5) * Math.exp(-p * 4.5);
      var bw = Math.min(W * 0.5, 560), bh = Math.max(52, Math.min(H * 0.1, 74)), bx = W * 0.07, by = H * 0.30 + (1 - sp) * 40;
      alpha(FG, 0.2 * clamp(t / 0.3, 0, 1)); roundRect(bx, by, bw, bh, bh / 2); ctx.fill();
      alpha(FG, 0.85 * clamp(t / 0.3, 0, 1)); roundRect(bx + 22, by + bh / 2 - 5, bw * 0.46, 10, 5); ctx.fill();
      var q = smooth(0.75, 1.1, t); ctx.lineWidth = 2.4; alpha(FG, q);
      [0, 1].forEach(function (k) { ctx.beginPath(); ctx.arc(bx + bw - 34 + k * 22, by + bh + 22, 8, 0, Math.PI * 2); ctx.stroke(); });
    } },

    /* Understudy: two frames, one standing in for the other; the stand-in leaves, the person stays */
    understudy: { end: 2.4, draw: function (t) {
      var cy = H * 0.38, w = Math.max(56, Math.min(W * 0.075, 110)), h = w * 1.7, ax = W * 0.5 - w * 1.05;
      var f = smooth(0.5, 2.1, t);
      alpha(FG, 1); roundRect(ax, cy - h / 2, w, h, w / 2); ctx.fill();
      ctx.lineWidth = 2; ctx.setLineDash([7, 6]); alpha(FG, 1 - 0.84 * f);
      roundRect(ax + w * 1.2 + f * w * 0.35, cy - h / 2 - 8, w, h, w / 2); ctx.stroke(); ctx.setLineDash([]);
    } }
  };

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  var fx = FX[id];
  if (!fx) return;
  var t0 = 0, last = fx.end;
  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function paint(t) { ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.lineWidth = 1; fx.draw(t); last = t; }
  function frame(now) {
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    paint(Math.min(t, fx.end));
    if (t < fx.end) requestAnimationFrame(frame);
  }
  size();
  if (reduce) paint(fx.end); else requestAnimationFrame(frame);
  window.addEventListener('resize', function () { size(); paint(last); });
})();

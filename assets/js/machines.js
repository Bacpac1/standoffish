/* The house's machines (round 29): robokit, the machines and the seat's scene, from tools/robokit (robokit.js,
   robots.js, seat.js), joined here as they are. The same scripts draw the seat's still picture. */
/* robokit: the house's machines from their parts (round 28).

   A machine is a tree of links joined by joints. Each link carries boxes in its own frame; a joint turns its child
   about one of its axes (rev) or slides it along one (pri), from where it is set on its parent. A pose gives each joint
   its value; the machine's boxes then stand somewhere in the room, and are drawn in the house's line style: one
   camera (the isometric one, the eye up the line x = y = z), faces in the house's tones by the way they face (the top's,
   the left's, the right's, blended for a face turned between them), the fold where two faces meet, the outline round
   what is seen, three weights of line.

   Boxes are put in order by what hides what: for two boxes whose pictures overlap, a plane between them (one of the
   fifteen a pair of boxes can have) says which is nearer the eye; a box inside another is hidden by it; boxes that
   cross are judged across the axis they cross least along. The order is then read off far to near.

   Units are centimetres; x runs to the lower right of the picture, y to the lower left, z up. */
var RK = (function () {
  'use strict';
  var INK = { top: '#f8faf9', left: '#e9eeed', right: '#dce3e2', recess: '#cdd6d5', paper: '#ffffff', dark: '#5b6a74',
              skirt: '#8e9ba4', wheel: '#4f5d68', accent: '#315f9a', lit: '#5b8dd3', off: '#c6d6e6',
              ink: '#263747', detail: '#73818a', mark: '#ffc24a' };
  var NS = 'http://www.w3.org/2000/svg';
  var V = [1, 1, 1];                                   // toward the eye

  // --------------------------------------------------------------------------------------------- transforms
  // a frame: a 3 by 4 matrix, row by row (its rotation, then its origin)
  var I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  function mul(A, B) {
    var C = new Array(12);
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 3; c++) C[r * 4 + c] = A[r * 4] * B[c] + A[r * 4 + 1] * B[4 + c] + A[r * 4 + 2] * B[8 + c];
      C[r * 4 + 3] = A[r * 4] * B[3] + A[r * 4 + 1] * B[7] + A[r * 4 + 2] * B[11] + A[r * 4 + 3];
    }
    return C;
  }
  function rot(axis, a) {
    var c = Math.cos(a), s = Math.sin(a);
    if (axis === 'x') return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0];
    if (axis === 'y') return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0];
    return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0];
  }
  function move(x, y, z) { return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z]; }
  function at(M, p) {
    return [M[0] * p[0] + M[1] * p[1] + M[2] * p[2] + M[3], M[4] * p[0] + M[5] * p[1] + M[6] * p[2] + M[7],
            M[8] * p[0] + M[9] * p[1] + M[10] * p[2] + M[11]];
  }
  function dir(M, v) { return [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[4] * v[0] + M[5] * v[1] + M[6] * v[2], M[8] * v[0] + M[9] * v[1] + M[10] * v[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  // where a joint sets its child: moved to its point on the parent, turned by its set angles (about z, then y, then x)
  function seat(j) {
    var M = move(j.at[0], j.at[1], j.at[2]), r = j.turn || [0, 0, 0];
    if (r[2]) M = mul(M, rot('z', r[2] * Math.PI / 180));
    if (r[1]) M = mul(M, rot('y', r[1] * Math.PI / 180));
    if (r[0]) M = mul(M, rot('x', r[0] * Math.PI / 180));
    return M;
  }

  // --------------------------------------------------------------------------------------------- a machine
  // desc: { links: { name: { boxes: [...] } }, joints: [ { name, parent, child, type, axis, at, turn } ], root }. A box:
  // { at: [x, y, z] (its least corner), size: [sx, sy, sz], tone ('paper', 'recess', 'dark', 'skirt', 'wheel', 'accent'
  // or a colour), w (its outline: 1.4, 0.85 or 0.55), lamp: a key whose value (0 to 1) lights it, grow: [axis, key,
  // base, k] (its size along that axis is base + k times the key's value: a part that runs out of another), bias: added
  // to its depth where nothing else decides }
  function Machine(desc) {
    var kids = {};
    desc.joints.forEach(function (j) { (kids[j.parent] = kids[j.parent] || []).push(j); j.seat = seat(j); });
    this.desc = desc; this.kids = kids;
  }
  // the boxes in the room for pose q (a joint's value: degrees for a turn, centimetres for a slide) on base frame B;
  // marks, if given, gets each joint's place
  Machine.prototype.place = function (q, B, out, marks) {
    out = out || [];
    var self = this, d = this.desc;
    (function walk(name, M) {
      (d.links[name].boxes || []).forEach(function (b, j) { var w = world(b, M, q, name); if (w) { w.j = j; out.push(w); } });
      (self.kids[name] || []).forEach(function (j) {
        var v = q[j.name] != null ? q[j.name] : (j.rest || 0), J = j.seat;
        if (j.type === 'rev') J = mul(J, rot(j.axis, v * Math.PI / 180));
        else if (j.type === 'pri') J = mul(J, move(j.axis === 'x' ? v : 0, j.axis === 'y' ? v : 0, j.axis === 'z' ? v : 0));
        var MJ = mul(M, J);
        if (marks) marks.push({ name: j.name, type: j.type, link: j.child, p: at(MJ, [0, 0, 0]) });
        walk(j.child, MJ);
      });
    })(d.root, B || I);
    return out;
  };
  function world(b, M, q, link) {
    var s = b.size.slice();
    if (b.grow) { var g = b.grow; s[g[0]] = (g[2] || 0) + (g[3] == null ? 1 : g[3]) * (q[g[1]] || 0); }
    if (s[0] < 0.02 || s[1] < 0.02 || s[2] < 0.02) return null;
    var x0 = b.at[0], y0 = b.at[1], z0 = b.at[2], x1 = x0 + s[0], y1 = y0 + s[1], z1 = z0 + s[2];
    var c = [];
    for (var i = 0; i < 8; i++) c.push(at(M, [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0]));
    var lit = b.lamp != null ? (typeof b.lamp === 'number' ? b.lamp : (q[b.lamp] != null ? q[b.lamp] : 0)) : null;
    var m = at(M, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
    return { c: c, R: M, ax: [[M[0], M[4], M[8]], [M[1], M[5], M[9]], [M[2], M[6], M[10]]], tone: b.tone,
             w: b.w || 0.85, lit: lit, mid: m, link: link, depth: m[0] + m[1] + m[2] + (b.bias || 0) };
  }

  // --------------------------------------------------------------------------------------------- what hides what
  function span(c, L) {
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < 8; i++) { var v = c[i][0] * L[0] + c[i][1] * L[1] + c[i][2] * L[2]; if (v < lo) lo = v; if (v > hi) hi = v; }
    return [lo, hi];
  }
  function inside(b, a) {            // every corner of b within a
    for (var i = 0; i < 3; i++) {
      var sa = span(a.c, a.ax[i]), sb = span(b.c, a.ax[i]);
      if (sb[0] < sa[0] - 0.02 || sb[1] > sa[1] + 0.02) return false;
    }
    return true;
  }
  // 1: a goes down first (b is nearer the eye); -1: b first; 0: either
  function cmp(a, b) {
    var axes = [a.ax[0], a.ax[1], a.ax[2], b.ax[0], b.ax[1], b.ax[2]], i, j;
    for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) axes.push(cross(a.ax[i], b.ax[j]));
    var best = null, least = Infinity;
    for (var k = 0; k < axes.length; k++) {
      var L = axes[k], n = Math.sqrt(dot(L, L));
      if (n < 1e-6) continue;
      L = [L[0] / n, L[1] / n, L[2] / n];
      var vl = dot(L, V), sa = span(a.c, L), sb = span(b.c, L);
      if (sa[1] <= sb[0] + 0.02) return Math.abs(vl) < 1e-4 ? 0 : (vl > 0 ? 1 : -1);
      if (sb[1] <= sa[0] + 0.02) return Math.abs(vl) < 1e-4 ? 0 : (vl > 0 ? -1 : 1);
      if (Math.abs(vl) < 0.05) continue;
      var ov = Math.min(sa[1], sb[1]) - Math.max(sa[0], sb[0]);
      if (ov < least) { least = ov; best = [vl, (sb[0] + sb[1]) - (sa[0] + sa[1])]; }
    }
    if (inside(b, a)) return -1;
    if (inside(a, b)) return 1;
    if (best) return (best[1] > 0) === (best[0] > 0) ? 1 : -1;
    return a.depth <= b.depth ? 1 : -1;
  }
  // two convex outlines in the picture held apart by a side of the first (touching counts as apart)
  function apart(A, B) {
    for (var i = 0; i < A.length; i++) {
      var p = A[i], q = A[(i + 1) % A.length], nx = q[1] - p[1], ny = p[0] - q[0], j, v;
      var a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (j = 0; j < A.length; j++) { v = A[j][0] * nx + A[j][1] * ny; if (v < a0) a0 = v; if (v > a1) a1 = v; }
      for (j = 0; j < B.length; j++) { v = B[j][0] * nx + B[j][1] * ny; if (v < b0) b0 = v; if (v > b1) b1 = v; }
      var e = 0.05 * Math.sqrt(nx * nx + ny * ny);
      if (a1 <= b0 + e || b1 <= a0 + e) return true;
    }
    return false;
  }
  // the boxes far to near, each with its picture (pc), its picture's bounds (r) and outline (h)
  function order(boxes, P) {
    var n = boxes.length, i, j;
    for (i = 0; i < n; i++) {
      var b = boxes[i], pc = new Array(8), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (j = 0; j < 8; j++) {
        var p = P(b.c[j][0], b.c[j][1], b.c[j][2]); pc[j] = p;
        if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
      }
      b.pc = pc; b.r = [x0, y0, x1, y1]; b.k = i; b.h = hull(pc);
    }
    var idx = boxes.slice().sort(function (p, q) { return p.r[0] - q.r[0]; });
    var succ = [], pred = [], indeg = new Array(n);
    for (i = 0; i < n; i++) { succ.push([]); pred.push([]); indeg[i] = 0; }
    for (var u = 0; u < n; u++) {
      var A = idx[u];
      for (var v = u + 1; v < n; v++) {
        var Bx = idx[v];
        if (Bx.r[0] >= A.r[2] - 0.05) break;
        if (Bx.r[1] >= A.r[3] - 0.05 || A.r[1] >= Bx.r[3] - 0.05) continue;
        if (apart(A.h, Bx.h) || apart(Bx.h, A.h)) continue;   // their pictures only near: neither hides the other
        var c = cmp(A, Bx);
        if (c > 0) { succ[A.k].push(Bx.k); pred[Bx.k].push(A.k); indeg[Bx.k]++; }
        else if (c < 0) { succ[Bx.k].push(A.k); pred[A.k].push(Bx.k); indeg[A.k]++; }
      }
    }
    var done = new Array(n), out = [], ready = [];
    for (i = 0; i < n; i++) { done[i] = false; if (!indeg[i]) ready.push(i); }
    while (out.length < n) {
      var pick = -1;
      if (ready.length) {
        var m = 0;
        for (j = 1; j < ready.length; j++) if (boxes[ready[j]].depth < boxes[ready[m]].depth) m = j;
        pick = ready[m]; ready[m] = ready[ready.length - 1]; ready.pop();
        if (done[pick]) continue;
      } else {
        // a cycle: what waits only on what waits on it. Walk back from the farthest box left along boxes it still
        // waits on until one comes round again; of that loop, the farthest goes down first, and nothing else is
        // put before its turn
        var u = -1, seen = {};
        for (j = 0; j < n; j++) if (!done[j] && (u < 0 || boxes[j].depth < boxes[u].depth)) u = j;
        while (!(u in seen)) {
          seen[u] = 1;
          var pv = pred[u], nx = -1;
          for (var w = 0; w < pv.length; w++) if (!done[pv[w]]) { nx = pv[w]; break; }
          if (nx < 0) break;
          u = nx;
        }
        var start = u;
        pick = u;
        do {
          var pu = pred[u], nu = -1;
          for (var w2 = 0; w2 < pu.length; w2++) if (!done[pu[w2]]) { nu = pu[w2]; break; }
          if (nu < 0) break;
          u = nu;
          if (boxes[u].depth < boxes[pick].depth) pick = u;
        } while (u !== start);
        order.forced = (order.forced || 0) + 1;
        if (order.log) { var cyc = [], uu = start; do { cyc.push(boxes[uu].id || boxes[uu].link); var pp = pred[uu], nn = -1; for (var w3 = 0; w3 < pp.length; w3++) if (!done[pp[w3]]) { nn = pp[w3]; break; } if (nn < 0) break; uu = nn; } while (uu !== start && cyc.length < 12); order.log.push(cyc); }
      }
      done[pick] = true; out.push(boxes[pick]);
      var s = succ[pick];
      for (j = 0; j < s.length; j++) if (!done[s[j]] && --indeg[s[j]] === 0) ready.push(s[j]);
    }
    return out;
  }

  // --------------------------------------------------------------------------------------------- drawing
  // a box's six faces: corner indices (counter-clockwise seen from outside) and the normal in its own frame
  var FACES = [[[0, 2, 6, 4], [-1, 0, 0]], [[1, 5, 7, 3], [1, 0, 0]], [[0, 4, 5, 1], [0, -1, 0]], [[2, 3, 7, 6], [0, 1, 0]],
               [[0, 1, 3, 2], [0, 0, -1]], [[4, 6, 7, 5], [0, 0, 1]]];
  function hex(c) { return [1, 3, 5].map(function (i) { return parseInt(c.slice(i, i + 2), 16); }); }
  var TT = hex(INK.top), TL = hex(INK.left), TR = hex(INK.right), MK = hex(INK.mark);
  var TONES = { paper: INK.paper, recess: INK.recess, dark: INK.dark, skirt: INK.skirt, wheel: INK.wheel, accent: INK.accent };
  // a face's tone: the house's three, by how much it faces up, to the left (+y) and to the right (+x)
  function shade(n, base) {
    if (base) {
      var k = 0.92 + 0.08 * Math.max(0, n[2]) - 0.05 * Math.max(0, n[0]);
      return hex(base).map(function (v) { return Math.min(255, v * k); });
    }
    var a = Math.max(0, n[2]), b = Math.max(0, n[1]), r = Math.max(0, n[0]);
    a *= a; b *= b; r *= r;
    var s = a + b + r || 1;
    return [0, 1, 2].map(function (i) { return (TT[i] * a + TL[i] * b + TR[i] * r) / s; });
  }
  function rgb(c) { return 'rgb(' + Math.round(c[0]) + ' ' + Math.round(c[1]) + ' ' + Math.round(c[2]) + ')'; }
  function mix(a, b, t) { t = Math.max(0, Math.min(1, t)); return [0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * t; }); }
  function hull(pts) {
    pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function turn(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], hi = [];
    pts.forEach(function (p) { while (lo.length > 1 && turn(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
    pts.slice().reverse().forEach(function (p) { while (hi.length > 1 && turn(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); });
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  // what to draw for one box: its seen faces (points and fill), its folds, its outline
  function look(b, hl) {
    var pc = b.pc, faces = [], edges = {}, folds = [];
    var tone = b.tone && (TONES[b.tone] || (b.tone[0] === '#' ? b.tone : null));
    for (var f = 0; f < 6; f++) {
      var F = FACES[f], n = dir(b.R, F[1]);
      if (n[0] + n[1] + n[2] <= 1e-6) continue;
      var fill = b.lit != null ? mix(hex(INK.off), hex(INK.lit), b.lit) : shade(n, tone);
      if (hl && hl[b.link]) fill = mix(fill, MK, 0.55);
      faces.push({ p: F[0].map(function (i) { return pc[i]; }), fill: rgb(fill) });
      for (var e = 0; e < 4; e++) {
        var a = F[0][e], c = F[0][(e + 1) % 4], key = a < c ? a * 8 + c : c * 8 + a;
        if (edges[key]) folds.push([pc[a], pc[c]]); else edges[key] = 1;
      }
    }
    return { faces: faces, folds: folds, hull: hull(pc), w: b.w, fw: b.w >= 1.4 ? 0.85 : 0.55 };
  }
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }
  function poly(p) { return 'M' + p.map(function (q) { return f1(q[0]) + ' ' + f1(q[1]); }).join('L') + 'Z'; }

  // an <svg> group to draw in: project (x, y, z) to the picture; k: the lines' weight factor
  function Renderer(g, project, k) { this.g = g; this.P = project; this.k = k || 1; this.pool = []; }
  Renderer.prototype.draw = function (boxes, hl) {
    var k = this.k, g = this.g, list = order(boxes, this.P);
    for (var i = 0; i < list.length; i++) {
      var o = this.pool[i];
      if (!o) {
        o = { g: document.createElementNS(NS, 'g'), f: [] };
        for (var q = 0; q < 3; q++) { var p = document.createElementNS(NS, 'path'); o.g.appendChild(p); o.f.push(p); }
        o.fold = document.createElementNS(NS, 'path'); o.fold.setAttribute('fill', 'none'); o.fold.setAttribute('stroke', INK.ink);
        o.fold.setAttribute('stroke-linecap', 'round'); o.g.appendChild(o.fold);
        o.sil = document.createElementNS(NS, 'path'); o.sil.setAttribute('fill', 'none'); o.sil.setAttribute('stroke', INK.ink);
        o.sil.setAttribute('stroke-linejoin', 'round'); o.g.appendChild(o.sil);
        this.pool.push(o);
      }
      if (g.childNodes[i] !== o.g) g.insertBefore(o.g, g.childNodes[i] || null);
      o.g.style.display = '';
      var L = look(list[i], hl);
      for (q = 0; q < 3; q++) {
        var fc = L.faces[q];
        o.f[q].setAttribute('d', fc ? poly(fc.p) : '');
        if (fc) o.f[q].setAttribute('fill', fc.fill);
      }
      o.fold.setAttribute('d', L.folds.map(function (s) { return 'M' + f1(s[0][0]) + ' ' + f1(s[0][1]) + 'L' + f1(s[1][0]) + ' ' + f1(s[1][1]); }).join(''));
      o.fold.setAttribute('stroke-width', L.fw * k);
      o.sil.setAttribute('d', poly(L.hull)); o.sil.setAttribute('stroke-width', L.w * k);
    }
    for (var j = list.length; j < this.pool.length; j++) this.pool[j].g.style.display = 'none';
    return list;
  };
  // a 2d canvas context to draw in, the same way
  function Painter(ctx, project, k) { this.ctx = ctx; this.P = project; this.k = k || 1; }
  Painter.prototype.draw = function (boxes, hl) {
    var ctx = this.ctx, k = this.k, list = order(boxes, this.P);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK.ink;
    for (var i = 0; i < list.length; i++) {
      var L = look(list[i], hl), q, p;
      for (q = 0; q < L.faces.length; q++) {
        p = L.faces[q].p;
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
        for (var m = 1; m < p.length; m++) ctx.lineTo(p[m][0], p[m][1]);
        ctx.closePath(); ctx.fillStyle = L.faces[q].fill; ctx.fill();
      }
      if (L.folds.length) {
        ctx.beginPath();
        for (q = 0; q < L.folds.length; q++) { ctx.moveTo(L.folds[q][0][0], L.folds[q][0][1]); ctx.lineTo(L.folds[q][1][0], L.folds[q][1][1]); }
        ctx.lineWidth = L.fw * k; ctx.stroke();
      }
      p = L.hull; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (q = 1; q < p.length; q++) ctx.lineTo(p[q][0], p[q][1]);
      ctx.closePath(); ctx.lineWidth = L.w * k; ctx.stroke();
    }
    return list;
  };

  // a box standing in the room itself (a case on a table, a post), not on a machine; o: tone, w, lit (0 to 1), bias
  function box(x0, y0, z0, x1, y1, z1, o) {
    o = o || {};
    return world({ at: [x0, y0, z0], size: [x1 - x0, y1 - y0, z1 - z0], tone: o.tone, w: o.w, bias: o.bias,
                   lamp: o.lit != null ? o.lit : null }, I, {}, o.link || 'room');
  }

  // boxes in order as SVG for a still picture: per box its seen faces, its folds and its outline, the strokes by
  // class (a 1.4, b 0.85, c 0.55: the page's style sheet in the picture gives them), the paths in short form
  function hexc(c) {
    var m = /rgb\((\d+) (\d+) (\d+)\)/.exec(c);
    return '#' + [m[1], m[2], m[3]].map(function (v) { return ('0' + (+v).toString(16)).slice(-2); }).join('');
  }
  function n1(v) { var r = Math.round(v * 10) / 10; return (r === 0 ? 0 : r).toString(); }
  function rel(pts, close) {
    var q = pts.map(function (p) { return [Math.round(p[0] * 10), Math.round(p[1] * 10)]; }), s = 'M' + n1(q[0][0] / 10) + ' ' + n1(q[0][1] / 10);
    for (var i = 1; i < q.length; i++) s += (i === 1 ? 'l' : ' ') + n1((q[i][0] - q[i - 1][0]) / 10) + ' ' + n1((q[i][1] - q[i - 1][1]) / 10);
    return s + (close ? 'z' : '');
  }
  function svg(list) {
    var out = [];
    function cls(w) { return w >= 1.4 ? 'a' : w >= 0.85 ? 'b' : 'c'; }
    list.forEach(function (b) {
      var L = look(b);
      L.faces.forEach(function (f) { out.push('<path fill="' + hexc(f.fill) + '" d="' + rel(f.p, true) + '"/>'); });
      if (L.folds.length) out.push('<path class="' + cls(L.fw) + '" d="' + L.folds.map(function (s) { return rel(s, false); }).join('') + '"/>');
      out.push('<path class="' + cls(L.w) + '" d="' + rel(L.hull, true) + '"/>');
    });
    return out.join('\n');
  }

  // the house's camera: x to the lower right, y to the lower left, z up; s: pixels a centimetre; o: the picture's
  // point for the room's origin
  function iso(s, o) {
    var C = Math.cos(Math.PI / 6);
    return function (x, y, z) { return [o[0] + (x - y) * C * s, o[1] + ((x + y) / 2 - z) * s]; };
  }
  // the extent of boxes in the picture, for framing
  function extent(boxes, P) {
    var a = [Infinity, Infinity], b = [-Infinity, -Infinity];
    boxes.forEach(function (bx) { bx.c.forEach(function (p) { var q = P(p[0], p[1], p[2]); a[0] = Math.min(a[0], q[0]); a[1] = Math.min(a[1], q[1]); b[0] = Math.max(b[0], q[0]); b[1] = Math.max(b[1], q[1]); }); });
    return [a, b];
  }
  // the pairs of boxes that pass through one another (for checking a design): [link, link] for each
  function crossings(boxes) {
    var out = [];
    for (var i = 0; i < boxes.length; i++) for (var j = i + 1; j < boxes.length; j++) {
      var a = boxes[i], b = boxes[j], axes = [a.ax[0], a.ax[1], a.ax[2], b.ax[0], b.ax[1], b.ax[2]], sep = false;
      for (var p = 0; p < 3; p++) for (var q = 0; q < 3; q++) axes.push(cross(a.ax[p], b.ax[q]));
      for (var k = 0; k < axes.length && !sep; k++) {
        var L = axes[k], n = Math.sqrt(dot(L, L));
        if (n < 1e-6) continue;
        L = [L[0] / n, L[1] / n, L[2] / n];
        var sa = span(a.c, L), sb = span(b.c, L);
        if (sa[1] <= sb[0] + 0.05 || sb[1] <= sa[0] + 0.05) sep = true;
      }
      if (!sep) out.push([a.link, b.link, i, j]);
    }
    return out;
  }

  return { Machine: Machine, Renderer: Renderer, Painter: Painter, order: order, cmp: cmp, apart: apart, iso: iso, extent: extent, box: box,
           svg: svg, crossings: crossings, mul: mul, rot: rot, move: move, at: at, INK: INK };
})();
/* The house's machines, each from its parts (robokit.js), in its own frame: x forward, y to its left, z up; its foot
   on z = 0. A joint's value is in degrees (a turn) or centimetres (a slide). Each machine has its rest, the pose the
   still picture shows, and its work: a short loop of what it does, written as keyframes on its joints. Parts touch
   and never pass through one another: an arm's length runs from the face of one joint's housing to the next; a part
   that runs out of another (a post, a fork) is drawn only as far as it shows. Props: what a machine works against,
   drawn with it on its plate and never part of it. */
var RK_MACHINES = (function () {
  'use strict';
  function B(x, y, z, sx, sy, sz, o) { o = o || {}; o.at = [x, y, z]; o.size = [sx, sy, sz]; return o; }
  function C(x, y, z0, sx, sy, sz, o) { return B(x - sx / 2, y - sy / 2, z0, sx, sy, sz, o); }   // centred in plan
  var FIRM = 1.4, THIN = 0.85, FINE = 0.55;
  function W(w, o) { o = o || {}; o.w = w; return o; }

  // the running gear the house's mobile machines share: a plinth set in under the body, its wheels at its sides, a
  // dark skirt round its foot, the body above it, a lid let into its top
  function gear(L, W_, H, o) {
    o = o || {};
    var b = [C(0, 0, 0, L - 6, W_ - 6, 1.6, { tone: 'recess', w: FINE })];
    [-1, 1].forEach(function (sx) {
      [-1, 1].forEach(function (sy) { b.push(C(sx * (L / 2 - 9), sy * (W_ / 2 - 0.6), 0, 10, 1, 1.8, { tone: 'wheel', w: FINE })); });
    });
    b.push(C(0, 0, 1.9, L + 0.6, W_ + 0.6, 2.7, { tone: 'skirt', w: FINE }));
    b.push(C(0, 0, 4.6, L, W_, H - 4.6, { w: THIN }));
    if (!o.nolid) b.push(C(0, 0, H, L - 6, W_ - 6, 1.1, { tone: 'paper', w: FINE }));
    return b;
  }
  // a joint's housing, a cube round it; an arm's length from the face of one housing (s0 across) to the face of the
  // next (s1 across), l between the joints, w across
  function housing(s, w) { return C(0, 0, -s / 2, s, s, s, { w: w || THIN }); }
  function bar(l, w, s0, s1, lw) { return B(s0 / 2, -w / 2, -w / 2, l - s0 / 2 - s1 / 2, w, w, { w: lw || THIN }); }
  // a part shown only while a key is 1 (an envelope in a jaw, a case on a deck): its height runs with the key
  function shown(box, key) { box.grow = [2, key, 0, box.size[2]]; return box; }

  // two lengths l1, l2 in a plane, from a shoulder to a point (dx forward, dz up): the shoulder's and the elbow's
  // turns (degrees, down positive), the elbow above the line (up = true) or below it
  function reach(dx, dz, l1, l2, up) {
    var d = Math.min(Math.hypot(dx, dz), l1 + l2 - 0.01), phi = Math.atan2(-dz, dx);
    var a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    var b = Math.PI - Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2))));
    var s = up ? phi - a : phi + a, e = up ? b : -b;
    return [s * 180 / Math.PI, e * 180 / Math.PI];
  }
  // an arm's three turns to put its wrist at (x, z) from its shoulder (sx, sz), its tool held at angle keep
  function arm(L1, L2, sx, sz, up) {
    return function (x, z, keep) { var r = reach(x - sx, z - sz, L1, L2, up); return [r[0], r[1], (keep || 0) - r[0] - r[1]]; };
  }
  // keyframes [t, value] over a loop of period P, eased (cubic in-out) between them
  function track(keys, P) {
    return function (t) {
      t = ((t % P) + P) % P;
      for (var i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
        var a = keys[i - 1], b = keys[i], u = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 1;
        u = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        return a[1] + (b[1] - a[1]) * u;
      }
      return keys[keys.length - 1][1];
    };
  }
  function tracks(spec, P) {
    var fs = {};
    for (var k in spec) fs[k] = track(spec[k], P);
    return function (t) { var q = {}; for (var k2 in fs) q[k2] = fs[k2](t); return q; };
  }
  // the three turns of an arm through a list of [t, pose] as three tracks (name_sh, name_el, name_wr)
  function armKeys(spec, name, list) {
    ['_sh', '_el', '_wr'].forEach(function (s, i) { spec[name + s] = list.map(function (k) { return [k[0], k[1][i]]; }); });
  }

  var M = {};

  // ------------------------------------------------------------------------------------------------ the courier
  // RC-4, the reply desk's courier: four arms, none like another. Its body 46 long, 56 wide, 24 high; a tote in its
  // front half where the envelopes (DL, on their short edge: 11 across, 22 high) stand in a row one behind another, a
  // pusher behind them; its mast at its back right, 140 cm. A, the long arm (50 and 52 cm) from a bracket high on the
  // mast, a jaw of two plates that takes the front envelope by its head; B, a short arm low on the mast (22 and 20 cm)
  // that holds the next one down while A draws the front one up; C, the pusher, that brings the row forward; D, a
  // strut out of a sleeve high on the mast, its flat foot set against the counter's front edge while A reaches over.
  // It takes an envelope standing back from the counter, never at it (A's elbow would meet the counter's top), and
  // comes in with it held high. Its light on the jaw's lock and on B's.
  M.courier = (function () {
    var links = {
      floor: { boxes: [] },
      body: { boxes: gear(46, 56, 24, { nolid: true }).concat([
        B(-8, -25, 24, 4, 50, 0.1, W(FINE, { tone: 'recess' })),                  // the grille across its top
        B(1, -15, 24, 22, 30, 11, W(THIN)),                                       // the tote
        B(0.5, -15.5, 35, 23, 31, 1.5, W(FINE, { tone: 'paper' })),                // its rim
        B(2.5, -13.5, 36.5, 19, 27, 0.1, W(FINE, { tone: 'recess' })),             // its mouth
        B(-23, -23, 24, 10, 10, 116, W(FIRM)),                                    // the mast
        B(-24, -24, 140, 12, 12, 3, W(THIN)),                                     // its cap
        B(-13, -21, 30, 1.6, 4, 61, W(FINE, { tone: 'recess' })),                 // the cable carrier up its face
        B(-23, -13, 125, 9, 13, 10, W(THIN)),                                     // A's bracket
        B(-23, -13, 56, 8, 10.9, 8, W(THIN)),                                     // B's shoulder block
        B(-13, -21, 92.65, 5, 6, 6, W(THIN)),                                     // D's sleeve
        B(-8, -19.4, 94.25, 0, 2.8, 2.8, W(FINE, { grow: [0, 'd', 0.5, 1] })),     // D's rod, run out of the sleeve
        B(23, -27, 13.5, 0.1, 54, 0.1, W(FINE)),                                  // the body's seam, round its front
        B(-23, 28, 13.5, 46, 0.1, 0.1, W(FINE))
      ]) },
      st: { boxes: [B(10, -1, 36.6, 1, 11, 7.4, W(THIN))] },                      // C, the pusher
      a1: { boxes: [C(0, 0, -5, 10, 9, 10, W(THIN)), bar(50, 5.2, 10, 7.4, FIRM)] },
      a2: { boxes: [housing(7.4), bar(52, 4.2, 7.4, 6, FIRM)] },
      aw: { boxes: [housing(6), C(0, 0, -9, 4, 14, 6, W(THIN)), B(-1.6, 7, -7.8, 3.2, 0.1, 1.4, { lamp: 'a_lit' }),
                    shown(B(-0.25, -5.5, -21.5, 0.5, 11, 11, W(THIN, { tone: 'paper' })), 'env_a'),
                    shown(B(-0.25, -5.5, -32.5, 0.5, 11, 11, W(THIN, { tone: 'paper' })), 'env_b')] },
      j1: { boxes: [B(-1.5, -7, -12.5, 1.5, 14, 3.5, W(FINE))] },
      j2: { boxes: [B(0, -7, -12.5, 1.5, 14, 3.5, W(FINE))] },
      b1: { boxes: [housing(5.2), bar(22, 3.8, 5.2, 4.6)] },
      b2: { boxes: [housing(4.6), bar(20, 3.2, 4.6, 4.4)] },
      bw: { boxes: [housing(4.4), B(-2, -2, -7.2, 4, 4, 5, W(THIN)), B(-1.4, 2, -5.6, 2.8, 0.1, 1.2, { lamp: 'b_lit' })] },
      df: { boxes: [B(0, -4, -5.25, 1.5, 8, 10.5, W(THIN))] }                    // D's foot
    };
    var joints = [
      { name: 'run', parent: 'floor', child: 'body', type: 'pri', axis: 'x', at: [0, 0, 0] },
      { name: 'c', parent: 'body', child: 'st', type: 'pri', axis: 'x', at: [0, 0, 0] },
      { name: 'a_sh', parent: 'body', child: 'a1', type: 'rev', axis: 'y', at: [-18.5, 4.5, 130] },
      { name: 'a_el', parent: 'a1', child: 'a2', type: 'rev', axis: 'y', at: [50, 0, 0] },
      { name: 'a_wr', parent: 'a2', child: 'aw', type: 'rev', axis: 'y', at: [52, 0, 0] },
      { name: 'a_j1', parent: 'aw', child: 'j1', type: 'pri', axis: 'x', at: [-0.9, 0, 0] },
      { name: 'a_j2', parent: 'aw', child: 'j2', type: 'pri', axis: 'x', at: [0.9, 0, 0] },
      { name: 'b_sh', parent: 'body', child: 'b1', type: 'rev', axis: 'y', at: [-19, 0.5, 60] },
      { name: 'b_el', parent: 'b1', child: 'b2', type: 'rev', axis: 'y', at: [22, 0, 0] },
      { name: 'b_wr', parent: 'b2', child: 'bw', type: 'rev', axis: 'y', at: [20, 0, 0] },
      { name: 'd', parent: 'body', child: 'df', type: 'pri', axis: 'x', at: [-7.5, -18, 95.65] }
    ];
    // the envelopes in the tote, each on its own slide (where the row has brought it: 0 at the back, 5, 10 at the
    // front), its height what shows above the tote's mouth (11; more while it is set in from above; 0 when gone)
    [0, 1, 2].forEach(function (k) {
      links['n' + k] = { boxes: [B(11, -1, 36.6, 0.5, 11, 0, W(THIN, { tone: 'paper', grow: [2, 'e' + k, 0, 1] }))] };
      joints.push({ name: 'p' + k, parent: 'body', child: 'n' + k, type: 'pri', axis: 'x', at: [0, 0, 0] });
    });
    return { name: 'courier', root: 'floor', links: links, joints: joints,
             // the reply desk's counter as the house has it: its body 1 cm before the courier's head, the edge of its
             // top 3 cm behind it (the courier stands in under it), the lodging slot 51 cm in, across its arm
             props: [B(24, -45.5, 9, 62, 100, 87.4), B(20, -47.5, 96.4, 66, 104, 4), B(72, -15.5, 100.4, 4, 40, 0)],
             info: { code: 'RC-4', en: 'Courier', mobile: true } };
  })();
  (function () {
    var A = arm(50, 52, -18.5, 130, true), Bp = arm(22, 20, -19, 60, true);
    // A's wrist: at rest over the tote; at the front envelope's head; lifted clear of the counter; over the slot; the
    // envelope's foot 12 mm in the slot. B's: at rest; over the next envelope; holding it down
    var Q = { REST: A(21.25, 100), TAKE: A(21.25, 58.1), LIFT: A(21.25, 140), OVER: A(74, 140), SET: A(74, 131.7),
              BREST: Bp(-4, 62), BOVER: Bp(14.8, 60), PRESS: Bp(14.8, 54.9), OPEN: 1.0, SHUT: 0.65, BRACE: 26, LANE: -37 };
    M.courier.poses = Q; M.courier.armA = A; M.courier.armB = Bp;
    // its loop on its plate: three envelopes one after another (9.5 s each), the row brought forward after each and
    // one set in at its back, so the third ends where the first began. A goes down to the front envelope and opens;
    // B comes over the next and holds it down; A takes the front one and lifts it clear (its lower half shown once it
    // is out of the tote); B lets go; C brings the row forward while the courier comes in under the counter's edge;
    // D's foot to the edge; A over the slot, the envelope's foot into it, the jaw opens; A back, D off, out again
    var T = 9.5, P = 3 * T, spec = {};
    // when, on its way up from the tote (1.45 to 2.3 s, eased as every key is), the envelope's foot is out of it
    function wz(p) { var a = p[0] * Math.PI / 180, b = (p[0] + p[1]) * Math.PI / 180; return 130 - 50 * Math.sin(a) - 52 * Math.sin(b); }
    M.courier.wristZ = wz;                                      // A's wrist's height at a pose (the house's scene times by it)
    function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
    var ENVB = 2.3;
    for (var i = 0; i <= 200; i++) {
      var e = ease(i / 200), pz = wz([0, 1].map(function (j) { return Q.TAKE[j] + (Q.LIFT[j] - Q.TAKE[j]) * e; }));
      if (pz - 32.5 >= 36.7) { ENVB = Math.round((1.45 + 0.85 * i / 200) * 100) / 100 + 0.01; break; }
    }
    function key(ch, t, v) { (spec[ch] = spec[ch] || []).push([t, v]); }
    function arms(n, t, pose) { key(n + '_sh', t, pose[0]); key(n + '_el', t, pose[1]); key(n + '_wr', t, pose[2]); }
    for (var k = 0; k < 3; k++) {
      var o = k * T, f = k, s = (k + 1) % 3, r = (k + 2) % 3;
      [[0, Q.LANE], [2.4, Q.LANE], [3.8, 0], [7.0, 0], [8.2, Q.LANE]].forEach(function (x) { key('run', o + x[0], x[1]); });
      [[0, Q.REST], [0.3, Q.REST], [1.0, Q.TAKE], [1.45, Q.TAKE], [2.3, Q.LIFT], [4.45, Q.LIFT], [5.15, Q.OVER], [5.45, Q.SET],
       [5.85, Q.SET], [6.15, Q.OVER], [6.75, Q.LIFT], [7.6, Q.LIFT], [8.3, Q.REST]].forEach(function (x) { arms('a', o + x[0], x[1]); });
      [[0, 0], [0.5, 0], [0.7, -Q.OPEN], [1.3, -Q.OPEN], [1.45, Q.SHUT], [5.7, Q.SHUT], [5.85, -Q.OPEN], [6.15, -Q.OPEN], [6.6, 0]]
        .forEach(function (x) { key('a_j1', o + x[0], x[1]); key('a_j2', o + x[0], -x[1]); });
      [[0, 0.15], [1.43, 0.15], [1.45, 1], [5.83, 1], [5.85, 0.15]].forEach(function (x) { key('a_lit', o + x[0], x[1]); });
      [[0, 0], [1.44, 0], [1.45, 1], [5.84, 1], [5.85, 0]].forEach(function (x) { key('env_a', o + x[0], x[1]); });
      [[0, 0], [ENVB - 0.01, 0], [ENVB, 1], [5.84, 1], [5.85, 0]].forEach(function (x) { key('env_b', o + x[0], x[1]); });
      [[0, Q.BREST], [0.9, Q.BREST], [1.2, Q.BOVER], [1.35, Q.PRESS], [2.2, Q.PRESS], [2.45, Q.BOVER], [2.85, Q.BREST]]
        .forEach(function (x) { arms('b', o + x[0], x[1]); });
      [[0, 0.15], [1.33, 0.15], [1.35, 1], [2.2, 1], [2.22, 0.15]].forEach(function (x) { key('b_lit', o + x[0], x[1]); });
      [[0, 0], [4.05, 0], [4.45, Q.BRACE], [6.6, Q.BRACE], [7.0, 0]].forEach(function (x) { key('d', o + x[0], x[1]); });
      [[0, 0], [2.85, 0], [3.45, 5], [8.3, 5], [8.7, 0]].forEach(function (x) { key('c', o + x[0], x[1]); });
      [[0, 10], [8.29, 10], [8.3, 0]].forEach(function (x) { key('p' + f, o + x[0], x[1]); });
      [[0, 5], [2.85, 5], [3.45, 10]].forEach(function (x) { key('p' + s, o + x[0], x[1]); });
      [[0, 0], [2.85, 0], [3.45, 5]].forEach(function (x) { key('p' + r, o + x[0], x[1]); });
      [[0, 11], [1.44, 11], [1.45, 0], [8.69, 0], [8.7, 21], [9.1, 11]].forEach(function (x) { key('e' + f, o + x[0], x[1]); });
      key('e' + s, o, 11); key('e' + r, o, 11);
    }
    for (var ch in spec) { var l = spec[ch]; l.sort(function (a, b) { return a[0] - b[0]; }); l.push([P, l[l.length - 1][1]]); }
    M.courier.work = tracks(spec, P); M.courier.period = P;
    M.courier.rest = M.courier.work(0); M.courier.rest.run = 0;                // at rest: in the bay, A over the tote
  })();

  // ------------------------------------------------------------------------------------------------ the steward
  // ST-6, the house's steward, for the work round the machines: a mobile base (60 by 54, 18 high) with a turntable; a
  // column (24 by 32, 74 high) on it; a spine across its head with three tool heads (no lens, no face: a probe, a
  // gripper, a driver); six arms in three pairs, all to the front: the long pair (48 and 42 cm, a parallel grip and
  // a flat press), the middle pair (30 and 25 cm, a roller and a clamp), the short pair (19 and 16 cm, two fine tips),
  // folded down the column's front until they are wanted. Two arms move at once at most; the others hold.
  M.steward = (function () {
    var links = {
      base: { boxes: gear(60, 54, 18, { nolid: true }).concat([C(0, 0, 18, 36, 36, 4, W(THIN, { tone: 'recess' })),
                                                                B(30, -27, 11, 0.1, 54, 0.1, W(FINE))]) },
      col: { boxes: [C(0, 0, 0, 24, 32, 74, W(FIRM)), C(12.05, 0, 8, 0.1, 22, 8, W(FINE, { tone: 'recess' })),
                     C(0, 0, 74, 12, 48, 6, W(THIN))].concat([-16, 0, 16].reduce(function (a, y) {
                       return a.concat([C(0, y - 5.25, 80, 4, 1.5, 9, W(FINE)), C(0, y + 5.25, 80, 4, 1.5, 9, W(FINE))]); }, [])) }
    };
    var joints = [{ name: 'yaw', parent: 'base', child: 'col', type: 'rev', axis: 'z', at: [0, 0, 22] }];
    // the three heads on the spine: each a block on a tilt joint, its tool to the front
    [['h1', -16, [C(9.5, 0, -0.6, 10, 1.2, 1.2, W(FINE))]],
     ['h2', 0, [B(4.5, -3, -3.5, 6, 1.4, 4, W(FINE)), B(4.5, 1.6, -3.5, 6, 1.4, 4, W(FINE)), C(4.55, 0, 1.5, 0.1, 5, 1.2, { lamp: 'h_lit' })]],
     ['h3', 16, [C(8.5, 0, -1.5, 8, 3, 3, W(THIN))]]].forEach(function (h) {
      links[h[0]] = { boxes: [C(0, 0, -4.5, 9, 9, 9, W(THIN))].concat(h[2]) };
      joints.push({ name: h[0], parent: 'col', child: h[0], type: 'rev', axis: 'y', at: [0, h[1], 88.5] });
    });
    var tools = {
      grip: [housing(5.4), B(2.7, -4, -3, 7, 1.5, 6, W(FINE)), B(2.7, 2.5, -3, 7, 1.5, 6, W(FINE)), C(-1.2, 0, 2.7, 2.4, 3, 0.1, { lamp: 'p_lit' })],
      press: [housing(5.4), C(3.7, 0, -6, 2, 12, 12, W(THIN))],
      roller: [housing(4.6), C(4.8, 0, -2.5, 5, 7.5, 5, W(THIN))],
      clamp: [housing(4.6), B(2.3, -3, -1.5, 6, 1.2, 3, W(FINE)), B(2.3, 1.8, -1.5, 6, 1.2, 3, W(FINE))],
      tip: [housing(3.6), C(3.8, 0, -1, 4, 2, 2, W(FINE))]
    };
    var TS = { grip: 5.4, press: 5.4, roller: 4.6, clamp: 4.6, tip: 3.6 };
    // six arms: [name, y of the shoulder, its height on the column, lengths, widths, tool]
    var ARMS = [['pl', 16, 66, 48, 42, 5, 4.2, 'grip'], ['pr', -16, 66, 48, 42, 5, 4.2, 'press'],
                ['ml', 9, 44, 30, 25, 3.8, 3.2, 'roller'], ['mr', -9, 44, 30, 25, 3.8, 3.2, 'clamp'],
                ['sl', 3, 26, 19, 16, 2.8, 2.4, 'tip'], ['sr', -3, 26, 19, 16, 2.8, 2.4, 'tip']];
    ARMS.forEach(function (a) {
      var n = a[0], hs = a[5] + 2.4, he = a[6] + 2, lw = n[0] === 'p' ? FIRM : THIN;
      links[n + 'S'] = { boxes: [housing(hs)] };
      links[n + '1'] = { boxes: [bar(a[3], a[5], hs, he, lw)] };
      links[n + '2'] = { boxes: [housing(he), bar(a[4], a[6], he, TS[a[7]], lw)] };
      links[n + 'T'] = { boxes: tools[a[7]] };
      joints.push({ name: n + '_sw', parent: 'col', child: n + 'S', type: 'rev', axis: 'z', at: [12 + hs / 2, a[1], a[2]] });
      joints.push({ name: n + '_sh', parent: n + 'S', child: n + '1', type: 'rev', axis: 'y', at: [0, 0, 0] });
      joints.push({ name: n + '_el', parent: n + '1', child: n + '2', type: 'rev', axis: 'y', at: [a[3], 0, 0] });
      joints.push({ name: n + '_wr', parent: n + '2', child: n + 'T', type: 'rev', axis: 'y', at: [a[4], 0, 0] });
    });
    return { name: 'steward', root: 'base', links: links, joints: joints, ARMS: ARMS,
             props: [B(78, -40, 0, 40, 80, 58), B(80, -24, 58, 26, 30, 0)],            // a machine's cabinet it works at
             info: { code: 'ST-6', en: 'Steward', mobile: true } };
  })();
  (function () {
    var S = M.steward, P = 8;
    var L = { pl: [48, 42], pr: [48, 42], ml: [30, 25], mr: [30, 25], sl: [19, 16], sr: [19, 16] };
    function A(n, dx, dz, up, keep) { var r = reach(dx, dz, L[n][0], L[n][1], up); return [r[0], r[1], (keep || 0) - r[0] - r[1]]; }
    // at rest: each arm hangs in its own lane down the column's front, its forearm folded back up, its tool level
    var FOLD = { p: [82, -160, 78], m: [80, -156, 76], s: [78, -150, 72] };
    var SW = { p: 0, m: 0, s: 0 };
    var pWork = A('pl', 64, -28, false), pLift = A('pl', 60, -14, false), rWork = A('pr', 66, -34, false), cHold = A('mr', 40, -14, false);
    var spec = { yaw: [[0, 0], [P, 0]], h1: [[0, 0], [P, 0]], h3: [[0, 0], [P, 0]],
                 h2: [[0, 0], [1.0, 0], [1.8, 16], [5.6, 16], [6.4, 0], [P, 0]],
                 p_lit: [[0, 0.15], [1.98, 0.15], [2.0, 1], [6.4, 1], [6.42, 0.15], [P, 0.15]],
                 h_lit: [[0, 0.15], [1.78, 0.15], [1.8, 1], [5.6, 1], [5.62, 0.15], [P, 0.15]] };
    S.ARMS.forEach(function (a) {
      var n = a[0], side = a[1] > 0 ? 1 : -1, f = FOLD[n[0]], sw = side * SW[n[0]];
      spec[n + '_sw'] = [[0, sw], [P, sw]];
      armKeys(spec, n, [[0, f], [P, f]]);
    });
    spec.pl_sw = [[0, 0], [1.0, 0], [2.0, 3], [6.4, 3], [7.4, 0], [P, 0]];
    armKeys(spec, 'pl', [[0, FOLD.p], [1.0, FOLD.p], [2.0, pWork], [4.6, pWork], [5.4, pLift], [6.4, pLift], [7.4, FOLD.p], [P, FOLD.p]]);
    spec.pr_sw = [[0, 0], [2.0, 0], [3.0, -3], [5.4, -3], [6.4, 0], [P, 0]];
    armKeys(spec, 'pr', [[0, FOLD.p], [2.0, FOLD.p], [3.0, rWork], [5.4, rWork], [6.4, FOLD.p], [P, FOLD.p]]);
    spec.mr_sw = [[0, 0], [3.2, 0], [4.0, 10], [6.2, 10], [7.0, 0], [P, 0]];
    armKeys(spec, 'mr', [[0, FOLD.m], [3.2, FOLD.m], [4.0, cHold], [6.2, cHold], [7.0, FOLD.m], [P, FOLD.m]]);
    S.work = tracks(spec, P); S.period = P; S.rest = S.work(0);
  })();

  // ------------------------------------------------------------------------------------------------ the porter
  // PT-2, the seat's porter, one of a fleet: a low body (70 by 50, 16 high) that carries a case between the write
  // stations, the lift and the deck; its deck lifts 10 cm on two posts to take a load from a station and set it down
  // on another; low guides along the deck's sides hold the case. Its light on the deck's lock.
  M.porter = {
    name: 'porter', root: 'body',
    links: {
      body: { boxes: gear(70, 50, 16, { nolid: true }).concat([
        B(35, -15, 7.5, 0.1, 30, 3, W(FINE, { tone: 'recess' })),                       // the front slot
        C(-12, 0, 16, 4, 30, 0, W(FINE, { tone: 'recess', grow: [2, 'lift', 0, 1] })),   // the posts, run out of the body
        C(12, 0, 16, 4, 30, 0, W(FINE, { tone: 'recess', grow: [2, 'lift', 0, 1] })),
        B(-35, 25, 10, 70, 0.1, 0.1, W(FINE))                                           // the body's seam along its side
      ]) },
      deck: { boxes: [C(0, 0, 0, 60, 44, 2.4, W(THIN)),
                      C(0, 19.5, 2.4, 52, 2, 2.4, W(FINE)), C(0, -19.5, 2.4, 52, 2, 2.4, W(FINE)),
                      shown(C(0, 0, 2.4, 48, 32, 10, W(THIN, { tone: 'paper' })), 'load'),
                      shown(B(-22, 16, 7.4, 44, 0.1, 0.1, W(FINE)), 'load'),
                      B(30, -3, 0.6, 0.1, 6, 1.2, { lamp: 'lit' })] }
    },
    joints: [{ name: 'lift', parent: 'body', child: 'deck', type: 'pri', axis: 'z', at: [0, 0, 16] }],
    info: { code: 'PT-2', en: 'Porter', mobile: true }
  };
  M.porter.work = tracks({ lift: [[0, 0], [0.8, 0], [1.6, 10], [3.4, 10], [4.2, 0], [5, 0]],
                           lit: [[0, 0.15], [1.58, 0.15], [1.6, 1], [3.4, 1], [3.42, 0.15], [5, 0.15]],
                           load: [[0, 1], [5, 1]] }, 5);
  M.porter.period = 5; M.porter.rest = M.porter.work(0);

  // ------------------------------------------------------------------------------------------------ the shuttle
  // SH-1, the store's shuttle, one to each level of the rack: a flat body (60 by 48, 8 high) on the level's rails,
  // its two forks of three stages out sideways into a lane (42 cm) and back, their fingers turned down behind a case
  // to draw it out, or the case set in to stand in the lane.
  M.shuttle = (function () {
    var links = {
      body: { boxes: [C(0, 0, 0, 54, 42, 1.6, W(FINE, { tone: 'recess' })),
                      C(0, 0, 1.6, 60, 48, 6.4, W(THIN)),
                      B(30, -20, 2.6, 1, 40, 3, W(FINE, { tone: 'skirt' })), B(-31, -20, 2.6, 1, 40, 3, W(FINE, { tone: 'skirt' })),
                      B(-17, -20, 8, 34, 40, 0.8, W(FINE, { tone: 'paper' })),
                      B(-23.5, -22, 8, 3, 44, 2, W(FINE)), B(20.5, -22, 8, 3, 44, 2, W(FINE))] }
    };
    [-1, 1].forEach(function (sx) {
      [-1, 1].forEach(function (sy) { links.body.boxes.push(C(sx * 22, sy * 24.4, 0.4, 7, 0.8, 2.8, W(FINE, { tone: 'wheel' }))); });
    });
    var joints = [];
    // each fork: a base along the body's top, two stages that run out over it, a finger on the top stage's inner side
    // that hangs below the case or turns up behind it
    [['l', -22, 1.8], ['r', 22, -1.8]].forEach(function (f) {
      var s = f[0];
      links['fa' + s] = { boxes: [C(0, 0, 0, 2.6, 44, 1.6, W(FINE))] };
      links['fb' + s] = { boxes: [C(0, 0, 0, 2.2, 44, 1.4, W(FINE))].concat(s === 'r' ? [B(1.1, -20, 0.2, 0.1, 3, 1, { lamp: 'lit' })] : []) };
      links['g' + s] = { boxes: [B(-0.5, -0.5, -3, 1, 1, 3, W(FINE))] };
      joints.push({ name: 'fork_' + s + '1', parent: 'body', child: 'fa' + s, type: 'pri', axis: 'y', at: [f[1], 0, 10] });
      joints.push({ name: 'fork_' + s + '2', parent: 'fa' + s, child: 'fb' + s, type: 'pri', axis: 'y', at: [0, 0, 1.6] });
      joints.push({ name: 'fing_' + s, parent: 'fb' + s, child: 'g' + s, type: 'rev', axis: 'x', at: [f[2], -16.5, 1.4] });
    });
    links.kase = { boxes: [C(0, 0, 0, 48, 32, 10, W(THIN, { tone: 'paper' })), B(-22, 16, 5, 44, 0.1, 0.1, W(FINE))] };
    joints.push({ name: 'kase', parent: 'body', child: 'kase', type: 'pri', axis: 'y', at: [0, 0, 13] });
    return { name: 'shuttle', root: 'body', links: links, joints: joints,
             props: [B(-34, -92, 0, 68, 62, 13)],                                         // a lane of the rack, level with its forks
             info: { code: 'SH-1', en: 'Shuttle', mobile: true } };
  })();
  (function () {
    // out with the case on its forks and set it in the lane; back without it; out under it, fingers up behind it, and
    // draw it home
    var P = 8, out = [[0, 0], [0.5, 0], [1.5, -24], [2.0, -24], [3.0, 0], [4.0, 0], [5.0, -24], [5.4, -24], [6.5, 0], [P, 0]];
    var fing = [[0, 0], [5.0, 0], [5.3, -180], [6.6, -180], [6.9, 0], [P, 0]];
    var spec = { fork_l1: out, fork_l2: out, fork_r1: out, fork_r2: out, fing_l: fing, fing_r: fing,
                 kase: [[0, 0], [0.5, 0], [1.5, -48], [5.4, -48], [6.5, 0], [P, 0]],
                 lit: [[0, 0.15], [5.28, 0.15], [5.3, 1], [6.6, 1], [6.62, 0.15], [P, 0.15]] };
    M.shuttle.work = tracks(spec, P); M.shuttle.period = P; M.shuttle.rest = M.shuttle.work(0);
  })();

  // ------------------------------------------------------------------------------------------------ the crane
  // KR-1, the store's crane in its aisle: a truck on the floor's rail (96 by 40), a mast at its back end up to the
  // hall's floor, a carriage on the mast's face with a table of rollers held out over the truck, that runs a case
  // off into a lane at the side and back.
  M.crane = {
    name: 'crane', root: 'truck',
    links: {
      truck: { boxes: [C(-40, 0, 0, 14, 30, 2, W(FINE, { tone: 'wheel' })), C(40, 0, 0, 14, 30, 2, W(FINE, { tone: 'wheel' })),
                       C(0, 0, 2, 96, 40, 18, W(FIRM)),
                       B(-48, -10, 20, 16, 20, 190, W(FIRM)),                                  // the mast
                       B(-50, -12, 210, 20, 24, 8, W(THIN)),                                   // its head
                       B(-44, 10, 24, 8, 1.6, 180, W(FINE, { tone: 'recess' })),               // the cable carrier
                       B(30, -16, 20, 16, 32, 10, W(THIN)),                                    // the drive
                       B(48, -12, 8, 0.1, 24, 0.1, W(FINE))] },
      car: { boxes: [B(0, -14, 0, 10, 28, 36, W(THIN)), B(10, -30, 0, 44, 60, 5, W(THIN)),
                     B(4, 14, 28, 2.4, 0.1, 1.6, { lamp: 'lit' })].concat(
                     [-4, -3, -2, -1, 0, 1, 2, 3, 4].map(function (k) { return B(12, k * 6.5 - 0.3, 5, 40, 0.6, 0.3, W(FINE)); })) },
      kase: { boxes: [C(0, 0, 0, 32, 48, 10, W(THIN, { tone: 'paper' })), B(-16, 24, 5, 32, 0.1, 0.1, W(FINE))] }
    },
    joints: [{ name: 'lift', parent: 'truck', child: 'car', type: 'pri', axis: 'z', at: [-32, 0, 24] },
             { name: 'run', parent: 'car', child: 'kase', type: 'pri', axis: 'y', at: [32, 0, 5.3] }],
    props: [B(-24, -104, 154, 48, 72, 5.3), B(-24, -104, 0, 3, 3, 154), B(21, -104, 0, 3, 3, 154)],
    info: { code: 'KR-1', en: 'Crane', mobile: true }
  };
  M.crane.work = tracks({ lift: [[0, 0], [0.8, 0], [2.8, 130], [3.0, 130], [5.4, 130], [7.4, 0], [8.5, 0]],
                          run: [[0, 0], [3.0, 0], [3.8, -56], [4.4, -56], [5.2, 0], [8.5, 0]],
                          lit: [[0, 1], [3.6, 1], [3.62, 0.15], [4.5, 0.15], [4.52, 1], [8.5, 1]] }, 8.5);
  M.crane.period = 8.5; M.crane.rest = M.crane.work(0);

  // ------------------------------------------------------------------------------------------------ the write cell
  // WC-3, the write station: a bed in the cabinet's top with a case in it, a portal over it (two columns and a
  // crossbar) and the press beam that rides the columns; three arms round the case: the positioning arm on its
  // left (18 and 16 cm, a pad), the write arm hung from a bracket on the crossbar's back (24 and 20 cm, a coupling
  // block), the seal arm before it (16 and 14 cm, a shoe along the seal edge).
  M.cell = (function () {
    var links = {
      top: { boxes: [C(0, 0, -20, 110, 70, 20, W(THIN)), C(0, 0, 0, 80, 52, 0.2, W(FINE, { tone: 'recess' })),
                     C(0, 0, 0.2, 32, 48, 10, W(THIN, { tone: 'paper' })), B(-16, 24, 5.2, 32, 0.1, 0.1, W(FINE)),
                     B(-52, -6, 0, 8, 12, 70, W(FIRM)), B(44, -6, 0, 8, 12, 70, W(FIRM)), B(-54, -7, 70, 108, 14, 8, W(FIRM)),
                     B(-5, -18, 50, 10, 11, 28, W(THIN)),
                     C(-44, 12, 0, 8, 10, 4, W(THIN)), C(0, 31, 0, 10, 8, 4, W(THIN)),
                     B(55, -30, -12, 0.1, 60, 0.1, W(FINE))] },
      beam: { boxes: [C(0, 0, 0, 88, 10, 6, W(THIN)), B(-8, 5, 2, 16, 0.1, 2, W(FINE, { tone: 'recess' }))] },
      p1: { boxes: [housing(4.4), bar(18, 4, 4.4, 4.6)] }, p2: { boxes: [housing(4.6), bar(16, 3.6, 4.6, 4)] },
      pt: { boxes: [housing(4), C(0, 0, -3.5, 6, 10, 1.5, W(THIN))] },
      w1: { boxes: [housing(6, FIRM), bar(24, 4.8, 6, 5.4, FIRM)] }, w2: { boxes: [housing(5.4), bar(20, 4, 5.4, 5, FIRM)] },
      wt: { boxes: [housing(5), C(0, 0, -7.5, 8, 8, 5, W(THIN)), B(4, -1.6, -6.2, 0.1, 3.2, 1.4, { lamp: 'lit' })] },
      s1: { boxes: [housing(4.2), bar(16, 3.6, 4.2, 4)] }, s2: { boxes: [housing(4), bar(14, 3, 4, 4)] },
      st: { boxes: [housing(4), C(0, 0, -5, 3, 10, 3, W(THIN))] }
    };
    var joints = [
      { name: 'beam', parent: 'top', child: 'beam', type: 'pri', axis: 'z', at: [0, 0, 0] },
      { name: 'p_sh', parent: 'top', child: 'p1', type: 'rev', axis: 'y', at: [-44, 12, 6.2] },
      { name: 'p_el', parent: 'p1', child: 'p2', type: 'rev', axis: 'y', at: [18, 0, 0] },
      { name: 'p_wr', parent: 'p2', child: 'pt', type: 'rev', axis: 'y', at: [16, 0, 0] },
      { name: 'w_sh', parent: 'top', child: 'w1', type: 'rev', axis: 'y', at: [0, -12.5, 47], turn: [0, 0, 90] },
      { name: 'w_el', parent: 'w1', child: 'w2', type: 'rev', axis: 'y', at: [24, 0, 0] },
      { name: 'w_wr', parent: 'w2', child: 'wt', type: 'rev', axis: 'y', at: [20, 0, 0] },
      { name: 's_sh', parent: 'top', child: 's1', type: 'rev', axis: 'y', at: [0, 31, 6.1], turn: [0, 0, -90] },
      { name: 's_el', parent: 's1', child: 's2', type: 'rev', axis: 'y', at: [16, 0, 0] },
      { name: 's_wr', parent: 's2', child: 'st', type: 'rev', axis: 'y', at: [14, 0, 0] }
    ];
    return { name: 'cell', root: 'top', links: links, joints: joints,
             info: { code: 'WC-3', en: 'Write cell', mobile: false } };
  })();
  (function () {
    var P = 8;
    var Pa = arm(18, 16, -44, 6.2, true), Wa = arm(24, 20, -12.5, 47, false), Sa = arm(16, 14, -31, 6.1, true);
    // the write arm's frame faces the front (+y): its forward is y; the seal arm's faces the back: its forward is -y
    var pRest = Pa(-37, 30, 0), pHold = Pa(-12, 13.7, 0);
    var wRest = Wa(-11, 34, 0), wDown = Wa(-8, 17.7, 0);
    var sRest = Sa(-28, 26, 0), sOn = Sa(-22, 15.3, 0);
    var spec = { beam: [[0, 60], [4.4, 60], [5.0, 10.2], [5.4, 10.2], [6.0, 60], [P, 60]],
                 lit: [[0, 0.15], [1.23, 0.15], [1.25, 1], [3.4, 1], [3.42, 0.15], [P, 0.15]] };
    armKeys(spec, 'p', [[0, pRest], [0.0, pRest], [0.6, pHold], [4.0, pHold], [4.4, pRest], [P, pRest]]);
    armKeys(spec, 'w', [[0, wRest], [0.6, wRest], [1.2, wDown], [3.4, wDown], [4.0, wRest], [P, wRest]]);
    armKeys(spec, 's', [[0, sRest], [1.4, sRest], [1.8, sOn], [3.6, sOn], [4.0, sRest], [P, sRest]]);
    M.cell.work = tracks(spec, P); M.cell.period = P; M.cell.rest = M.cell.work(0);
  })();

  // ------------------------------------------------------------------------------------------------ the floor unit
  // FL-1, the floor unit: 48 by 40, 10 high, its equipment bay at its back; an edge module on its left side, two
  // lengths lying flat (12 and 10 cm) and a flat shoe 14 cm long, swung out square to run its shoe under an edge.
  M.floor = {
    name: 'floor', root: 'body',
    links: {
      body: { boxes: gear(48, 40, 10, { nolid: true }).concat([B(-22, -12, 10, 14, 24, 3.4, W(FINE)),
                                                               B(24, -14, 6, 0.1, 28, 0.1, W(FINE))]) },
      e1: { boxes: [B(0, -1.4, -1, 12, 2.8, 2, W(FINE))] },
      e2: { boxes: [B(0, -1.2, 0, 10, 2.4, 2, W(FINE))] },
      shoe: { boxes: [B(-7, -1.5, -4.4, 14, 3, 2.2, W(FINE)), B(-1.5, 1.5, -3.6, 3, 0.1, 1, { lamp: 'lit' })] }
    },
    joints: [{ name: 'e_sh', parent: 'body', child: 'e1', type: 'rev', axis: 'z', at: [4, 21.8, 3.4], turn: [0, 0, 180] },
             { name: 'e_el', parent: 'e1', child: 'e2', type: 'rev', axis: 'z', at: [12, 0, 1] },
             { name: 'e_wr', parent: 'e2', child: 'shoe', type: 'rev', axis: 'z', at: [10, 0, 0] }],
    props: [B(-40, 40, 9, 80, 36, 4), B(-36, 66, 0, 4, 6, 9), B(32, 66, 0, 4, 6, 9)],   // the bench whose edge it follows
    info: { code: 'FL-1', en: 'Floor unit', mobile: true }
  };
  M.floor.work = tracks({ e_sh: [[0, 0], [1, 0], [1.45, -90], [3.6, -90], [4.05, 0], [5, 0]],
                          e_el: [[0, 180], [1, 180], [1.45, 360], [3.6, 360], [4.05, 180], [5, 180]],
                          e_wr: [[0, -180], [1, -180], [1.45, -270], [3.6, -270], [4.05, -180], [5, -180]],
                          lit: [[0, 0.15], [1.43, 0.15], [1.45, 1], [3.6, 1], [3.62, 0.15], [5, 0.15]] }, 5);
  M.floor.period = 5; M.floor.rest = M.floor.work(0);

  // ------------------------------------------------------------------------------------------------ the flyer
  // FY-1, the store's tally flyer: a small craft 36 cm across that holds itself up on four grids of ion wind (no
  // blade, nothing turning, no sound past a breath), a core between them, and a probe that runs out of its front to
  // touch a case's tag at a lane's mouth. Blind as the house's machines are: it knows where it is from the store's
  // own fixed marks and its own inertia, and what is before it by touch. Its light on the probe's lock, lit while it
  // reads. It flies in a bay the shuttles leave to it, lane by lane and level by level.
  M.flyer = (function () {
    var body = [C(0, 0, 0, 14, 14, 6, W(THIN)), C(0, 0, 6, 10, 10, 0.8, W(FINE, { tone: 'paper' })),
                B(-7, 7, 3, 14, 0.1, 0.1, W(FINE)), B(7, -1, 2, 3, 2, 2, W(FINE))];
    var slats = [];
    [-1, 1].forEach(function (sx) {
      [-1, 1].forEach(function (sy) {
        body.push(C(sx * 13, sy * 13, 1, 10, 10, 2.2, W(THIN, { tone: 'recess' })));
        for (var k = 0; k < 3; k++) slats.push(B(sx * 13 - 5, sy * 13 - 3.6 + 3 * k, 3.2, 10, 1.2, 0.3, W(FINE, { tone: 'paper' })));
      });
    });
    var links = { air: { boxes: [] }, a1: { boxes: [] }, a2: { boxes: [] }, r: { boxes: [] }, body: { boxes: body },
                  slats: { boxes: slats },
                  rod: { boxes: [B(10, -0.5, 2.5, 0, 1, 1, W(FINE, { grow: [0, 'probe', 3, 1] }))] },
                  tip: { boxes: [B(0, -1.2, -1.2, 1.2, 2.4, 2.4, W(THIN)), B(0, 1.2, -0.5, 1.2, 0.1, 1, { lamp: 'lit' })] } };
    var joints = [{ name: 'my', parent: 'air', child: 'a1', type: 'pri', axis: 'y', at: [0, 0, 0] },
                  { name: 'mz', parent: 'a1', child: 'a2', type: 'pri', axis: 'z', at: [0, 0, 0] },
                  { name: 'roll', parent: 'a2', child: 'r', type: 'rev', axis: 'x', at: [0, 0, 3] },
                  { name: 'pitch', parent: 'r', child: 'body', type: 'rev', axis: 'y', at: [0, 0, -3] },
                  { name: 'slat', parent: 'body', child: 'slats', type: 'pri', axis: 'z', at: [0, 0, 0] },
                  { name: 'rodj', parent: 'body', child: 'rod', type: 'pri', axis: 'x', at: [0, 0, 0] },
                  { name: 'probe', parent: 'body', child: 'tip', type: 'pri', axis: 'x', at: [13, 0, 3] }];
    // its four arms, short, out to the grids at its corners
    [45, 135, 225, 315].forEach(function (a, i) {
      links['arm' + i] = { boxes: [B(9.9, -0.8, 2.4, 1.6, 1.6, 1.2, W(FINE))] };
      joints.push({ name: 'arm' + i, parent: 'body', child: 'arm' + i, type: 'rev', axis: 'z', at: [0, 0, 0], turn: [0, 0, a] });
    });
    return { name: 'flyer', root: 'air', links: links, joints: joints,
             props: [B(26, -66, -14, 4, 132, 36), B(26, -24, -2, 0, 48, 12)],              // the rack's face, a lane's case
             info: { code: 'FY-1', en: 'Flyer', mobile: true } };
  })();
  (function () {
    // touch a tag, run a lane along, touch, rise a level, touch, and back: leaning into each run, a breath of a bob
    var P = 8, k = {
      probe: [[0, 0], [0.3, 0], [0.65, 11.8], [1.15, 11.8], [1.5, 0], [2.6, 0], [2.95, 11.8], [3.45, 11.8], [3.8, 0],
              [5.0, 0], [5.35, 11.8], [5.85, 11.8], [6.2, 0], [P, 0]],
      lit: [[0, 0.15], [0.64, 0.15], [0.66, 1], [1.15, 1], [1.17, 0.15], [2.94, 0.15], [2.96, 1], [3.45, 1], [3.47, 0.15],
            [5.34, 0.15], [5.36, 1], [5.85, 1], [5.87, 0.15], [P, 0.15]],
      my: [[0, 0], [1.6, 0], [2.5, 60], [6.4, 60], [7.6, 0], [P, 0]],
      roll: [[0, 0], [1.6, 0], [1.95, -7], [2.15, -7], [2.5, 0], [6.4, 0], [6.8, 6], [7.2, 6], [7.6, 0], [P, 0]],
      mzr: [[0, 0], [3.9, 0], [4.9, 28], [6.4, 28], [7.6, 0], [P, 0]],
      pitch: [[0, 0], [3.9, 0], [4.2, 3], [4.6, 3], [4.9, 0], [P, 0]],
      slat: [[0, 0], [P, 0]]
    }, f = tracks(k, P);
    M.flyer.work = function (t) { var q = f(t); q.mz = q.mzr + 0.5 * Math.sin(2 * Math.PI * t / 1.6); q.rodj = 0; return q; };
    M.flyer.period = P; M.flyer.rest = M.flyer.work(0);
  })();

  // ------------------------------------------------------------------------------------------------ the runner
  // RN-3, the records store's runner: it goes along the racks of shallow drawers and moves a card from one drawer to
  // another. Its body 56 long, 50 wide, 28 high; a guide 156 cm high near its right side, the rack's side, and on the
  // guide's far face a carriage (40 wide) that rides up to the marked row. Three arms on the carriage, none like
  // another, all in planes across the aisle and all to its right: D, the drawer arm (16 and 14 cm), low at the
  // carriage's left, its hook a bar across to the pull, that draws a drawer out 11 cm and holds it; the carrier, a
  // slide under a tray that goes out to the drawer's front; P, the picker (20 and 18 cm), from the carriage's top at
  // its right, a bar across to a pair of fingers over the middle, that takes a card (26 by 11.2, standing) by its head,
  // lifts it 4 cm clear of the drawer and sets it on the tray against its stop, or the other way. Two in motion at
  // most; its light on the hook's lock and on the fingers' block. In its own frame: x along the racks, the racks to its
  // right (-y).
  M.runner = (function () {
    var links = {
      body: { boxes: gear(56, 50, 28).concat([
        B(-6, -21, 29.1, 12, 6, 126.9, W(FIRM)),                                 // the guide
        B(-6.5, -21.5, 156, 13, 7, 2, W(THIN)),                                  // its cap
        B(-2, -15, 32, 4, 0.1, 121, W(FINE, { tone: 'recess' })),                // the slot down its face
        B(28, -21, 13, 0.1, 42, 0.1, W(FINE))                                    // the body's seam, round its front
      ]) },
      car: { boxes: [B(-20, -28, 0, 40, 7, 10, W(THIN)),                         // the carriage
                     B(-8, -21, -1, 2, 7, 13, W(THIN)), B(6, -21, -1, 2, 7, 13, W(THIN)),   // its shoe round the guide
                     B(-6, -14.9, -1, 12, 1, 13, W(THIN)),
                     B(16, -27, 10, 6, 6, 3, W(THIN))] },                        // P's shoulder block
      d1: { boxes: [housing(4.4), bar(16, 3.8, 4.4, 4.4)] },
      d2: { boxes: [housing(4.4), bar(14, 3.2, 4.4, 3.8)] },
      hook: { boxes: [housing(3.8), B(-1.4, -2.2, -1.9, 2.8, 13.7, 3.8, W(THIN)),       // across to the pull
                      B(-1.5, -1.2, 0.3, 0.1, 4, 1.2, { lamp: 'h_lit' })] },
      tray: { boxes: [B(-14, 0, 0, 28, 8.5, 1.2, W(THIN, { tone: 'paper' })),
                      B(-14, 7.4, 1.2, 28, 1.1, 1.5, W(FINE)),                     // its stop
                      B(-3, 8.5, -1.6, 6, 0, 1.6, W(FINE, { grow: [1, 'sl', 0, 1] })),   // the slide, run out of the carriage
                      shown(B(-13, 6.9, 1.2, 26, 0.5, 11.2, W(THIN, { tone: 'paper' })), 'con')] },   // a card on it
      p1: { boxes: [housing(3.6), bar(20, 3.0, 3.6, 3.4)] },
      p2: { boxes: [housing(3.4), bar(18, 2.6, 3.4, 3.2)] },
      pw: { boxes: [housing(3.2), B(-1, -21, -1.6, 2, 21, 2, W(THIN)),             // the bar across to the middle
                    B(-1.5, -21, -5.6, 3, 4, 4, W(THIN)),                           // the fingers' block
                    B(-1.6, -20, -4.6, 0.1, 2, 1.2, { lamp: 'p_lit' }),
                    shown(B(-0.25, -32, -18.2, 0.5, 26, 11.2, W(THIN, { tone: 'paper' })), 'cp')] },   // a card held
      f1: { boxes: [B(-1.2, -20.6, -8.6, 1.2, 3.2, 3, W(FINE))] },
      f2: { boxes: [B(0, -20.6, -8.6, 1.2, 3.2, 3, W(FINE))] },
      // the drawer it works at (its plate shows it; the house's drawing draws its own): open at its top, a card in it
      dr: { boxes: [shown(B(-35.2, -2.2, 0, 70.4, 2.2, 10.8, W(THIN)), 'dr'),
                    shown(B(-35.2, -40, 0, 70.4, 37.8, 0.6, W(FINE)), 'dr'),
                    shown(B(-35.2, -40, 0.6, 0.6, 37.8, 10.2, W(FINE)), 'dr'), shown(B(34.6, -40, 0.6, 0.6, 37.8, 10.2, W(FINE)), 'dr'),
                    shown(B(-34.6, -40, 0.6, 69.2, 0.6, 10.2, W(FINE)), 'dr'),
                    shown(B(-6, 0, 4.0, 12, 1.2, 1.2, W(FINE)), 'dr'),
                    shown(B(-13, -6, 0.6, 26, 0.5, 11.2, W(THIN, { tone: 'paper' })), 'cin')] }
    };
    var joints = [
      { name: 'lift', parent: 'body', child: 'car', type: 'pri', axis: 'z', at: [0, 0, 0] },
      { name: 'd_sh', parent: 'car', child: 'd1', type: 'rev', axis: 'y', at: [-15, -28, 6], turn: [0, 0, -90] },
      { name: 'd_el', parent: 'd1', child: 'd2', type: 'rev', axis: 'y', at: [16, 0, 0] },
      { name: 'd_wr', parent: 'd2', child: 'hook', type: 'rev', axis: 'y', at: [14, 0, 0] },
      { name: 'ce', parent: 'car', child: 'tray', type: 'pri', axis: 'y', at: [0, -32, 11] },
      { name: 'p_sh', parent: 'car', child: 'p1', type: 'rev', axis: 'y', at: [19, -24, 13], turn: [0, 0, -90] },
      { name: 'p_el', parent: 'p1', child: 'p2', type: 'rev', axis: 'y', at: [20, 0, 0] },
      { name: 'p_wr', parent: 'p2', child: 'pw', type: 'rev', axis: 'y', at: [18, 0, 0] },
      { name: 'p_f1', parent: 'pw', child: 'f1', type: 'pri', axis: 'x', at: [-0.9, 0, 0] },
      { name: 'p_f2', parent: 'pw', child: 'f2', type: 'pri', axis: 'x', at: [0.9, 0, 0] },
      { name: 'dw', parent: 'body', child: 'dr', type: 'pri', axis: 'y', at: [0, -54.8, 116.6] }
    ];
    return { name: 'runner', root: 'body', links: links, joints: joints,
             // the rack round the drawer: below and above its row, the posts at its sides
             props: [B(-76, -95, 8, 152, 38, 108), B(-76, -95, 128.6, 152, 38, 51.4),
                     B(-38, -95, 116.6, 2.8, 38, 10.8), B(35.2, -95, 116.6, 2.8, 38, 10.8)],
             info: { code: 'RN-3', en: 'Runner', mobile: true } };
  })();
  (function () {
    // the arms' reach in their planes across the aisle (forward is toward the racks): D's hook from (-28, 6) on the
    // carriage, P's wrist from (-24, 13); each moved along straight lines, its joints found at each moment
    var D = arm(16, 14, 0, 0, false), Pk = arm(20, 18, 0, 0, true);
    function d(y, z) { return D(-28 - y, z - 6); }                    // the hook's point at (y, z) on the carriage
    function p(y, z) { return Pk(-24 - y, z - 13); }                  // P's wrist at (y, z) on the carriage
    var ROW = 117, LOW = 55, OUT = 11;
    // the hook at the pull of the drawer closed (its point 1.4 before the pull) and off; P's wrist over a card in the
    // drawer drawn out and at its head, over the tray drawn out and at the head of a card on it; at rest high
    var Q = { ROW: ROW, LOW: LOW, OUT: OUT, HOOK: -52.2, HOFF: -38, HZ: 4.2, TRAY: -OUT, OPEN: 1.0, SHUT: 0.65,
              PY_D: -49.55, PZ_D: 18.4, PY_T: -35.85, PZ_T: 30.4, PZ_UP: 33, PY_R: -27, PZ_R: 37, CARD: [18.2, 7.0] };
    M.runner.poses = Q; M.runner.reachD = d; M.runner.reachP = p;
    // its loop on its plate: up to the row; the drawer drawn out; the tray out; P takes the card from the drawer onto the
    // tray; tray back, drawer back; then the card set back in the same way, and down again
    var P = 16, spec = {};
    function key(ch, t, v) { (spec[ch] = spec[ch] || []).push([t, v]); }
    key('lift', 0, LOW); key('lift', 0.4, LOW); key('lift', 1.1, ROW); key('lift', 14.9, ROW); key('lift', 15.6, LOW);
    function visit(o, onto) {              // a visit to the drawer from o: onto (true) takes the card out onto the tray
      key('hy', o, Q.HOFF); key('hy', o + 0.3, Q.HOOK); key('h_lit', o + 0.28, 0.15); key('h_lit', o + 0.3, 1);
      key('dw', o + 0.3, 0); key('dw', o + 0.9, OUT); key('hy', o + 0.9, Q.HOOK + OUT);   // the drawer drawn out, held
      key('ce', o + 0.9, 0); key('ce', o + 1.55, Q.TRAY);                                  // the tray out to its front
      var y0 = onto ? Q.PY_D : Q.PY_T, z0 = onto ? Q.PZ_D : Q.PZ_T, y1 = onto ? Q.PY_T : Q.PY_D, z1 = onto ? Q.PZ_T : Q.PZ_D;
      [[1.3, Q.PY_R, Q.PZ_R], [1.9, y0, Q.PZ_UP], [2.15, y0, z0], [2.3, y0, z0], [2.65, y0, Q.PZ_UP], [3.05, y1, Q.PZ_UP],
       [3.3, y1, z1], [3.45, y1, z1], [3.75, y1, Q.PZ_UP], [4.3, Q.PY_R, Q.PZ_R]]
        .forEach(function (k) { key('py', o + k[0], k[1]); key('pz', o + k[0], k[2]); });
      [[1.6, 0], [1.8, -Q.OPEN], [2.15, -Q.OPEN], [2.3, Q.SHUT], [3.3, Q.SHUT], [3.45, -Q.OPEN], [3.75, -Q.OPEN], [4.1, 0]]
        .forEach(function (k) { key('pf', o + k[0], k[1]); });
      key('p_lit', o + 2.28, 0.15); key('p_lit', o + 2.3, 1); key('p_lit', o + 3.43, 1); key('p_lit', o + 3.45, 0.15);
      // the card: in the drawer, held, on the tray (or the other way)
      key(onto ? 'cin' : 'con', o + 2.29, 1); key(onto ? 'cin' : 'con', o + 2.3, 0); key('cp', o + 2.29, 0); key('cp', o + 2.3, 1);
      key('cp', o + 3.44, 1); key('cp', o + 3.45, 0); key(onto ? 'con' : 'cin', o + 3.44, 0); key(onto ? 'con' : 'cin', o + 3.45, 1);
      key('ce', o + 3.9, Q.TRAY); key('ce', o + 4.55, 0);                                 // the tray back
      key('dw', o + 4.55, OUT); key('dw', o + 5.1, 0); key('hy', o + 4.55, Q.HOOK + OUT); key('hy', o + 5.1, Q.HOOK);   // the drawer run back
      key('h_lit', o + 5.1, 1); key('h_lit', o + 5.12, 0.15); key('hy', o + 5.35, Q.HOFF);   // the hook off
    }
    key('hy', 0, Q.HOFF); key('py', 0, Q.PY_R); key('pz', 0, Q.PZ_R); key('dw', 0, 0); key('ce', 0, 0); key('pf', 0, 0);
    key('h_lit', 0, 0.15); key('p_lit', 0, 0.15); key('cin', 0, 1); key('con', 0, 0); key('cp', 0, 0); key('dr', 0, 1);
    visit(1.3, true); visit(7.9, false);
    for (var ch in spec) { var l = spec[ch]; l.sort(function (a, b) { return a[0] - b[0]; }); l.push([P, l[l.length - 1][1]]); }
    var f = tracks(spec, P);
    // a pose from the arms' points (the house's drawing makes its own points and poses them the same way)
    M.runner.pose = function (q) {
      var a = d(q.hy, Q.HZ), b = p(q.py, q.pz);
      q.d_sh = a[0]; q.d_el = a[1]; q.d_wr = a[2]; q.p_sh = b[0]; q.p_el = b[1]; q.p_wr = b[2];
      q.p_f1 = q.pf; q.p_f2 = -q.pf; q.sl = Math.max(0, -q.ce - 4.5);
      return q;
    };
    M.runner.work = function (t) {
      var q = f(t);
      ['cin', 'con', 'cp', 'dr'].forEach(function (k) { q[k] = q[k] > 0.5 ? 1 : 0; });
      return M.runner.pose(q);
    };
    M.runner.period = P; M.runner.rest = M.runner.work(0); M.runner.rest.dr = 0; M.runner.rest.cin = 0;   // at rest: itself alone
  })();

  return { M: M, reach: reach, track: track, tracks: tracks, B: B, C: C, W: W, gear: gear, shown: shown };
})();
/* The seat at Longyearbyen at its numbers (round 29): what moves in the section, from robokit's machines, as the page
   draws it over the bare picture and as node draws the still picture (tools/drawings29_seat.py). One clock, the
   lift's cycle of 16 s, and every hand-over tied to it, so a case is always somewhere:

   - the lift: at the hall's dock it takes the sealed case off the dock table's out place onto its left place (1 s) and
     runs the blank on its right place out on to the dock table's in place (1 s); down to a level (2.5 s), where that
     level's shuttle sets a blank on its right place and draws the sealed case off its left (6 s); back up (2.5 s),
     and waits. Its levels go round all nine on either side, each shuttle met once in 18 cycles.
   - the porters, one to a side of the lift (on a phone, one): each cycle one comes to the dock, sets its sealed case
     on the out place and takes the blank from the in place, goes to the next of its cells, gives the blank into the
     cabinet's intake and takes the sealed case out of it, waits by the cell and comes back for its next turn.
   - the cells: the old case sinks into the cabinet, the new one rises into the bed; the arms close on it (the pad,
     the coupling block, the shoe), it is written for a minute with the block's light on, the arms let go one after
     another, the press beam comes down along the seam once and goes up; it waits sealed for its porter.
   - the shuttles, one on each level of each rack: in turns of 12 s each draws a case out of one lane and runs it into
     another; when its lift comes it brings a blank from a lane, sets it on the lift, takes the sealed case and runs it
     into a lane.
   - the steward at the spare shuttle on its stand; the floor unit along the store's front; at the window seat a case
     of copies, the contact comb on it, its light.
   Without the script, and under reduced motion, the picture stands at the still moment. */
var RK_SEAT = (function () {
  'use strict';
  var R = RK_MACHINES, M = R.M, B = R.B, C = R.C, W = R.W, THIN = 0.85, FINE = 0.55;
  var CYC = 16, BLOCK = 28, SLOT = 12, VP = 100, VS = 180, WRITE = 60;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ease(u) { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function seg(t, a, b) { return ease((t - a) / (b - a)); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function hash(a, b, c) {
    var h = (a * 374761393 + b * 668265263 + c * 1013904223) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function go(d, v) { return Math.abs(d) / v + 0.6; }       // a run's time: its length at speed, and its easing
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // a case's part seen in front of a plane (a rack's face, a cabinet's front): from its middle c (along y) and the
  // plane at p (none: all of it), where the seen part starts and how long it is
  function cut(c, p) { var s = p == null ? c - 16 : Math.max(p, c - 16); return [s, Math.max(0, c + 16 - s)]; }

  // ----------------------------------------------------------------------------------------------- the units
  // the write cell on its cabinet: WC-3 with a cabinet under its top, an intake in the cabinet's front at a porter's
  // deck, and the case in its bed a part that sinks into the bed and rises out of it
  function cellUnit() {
    var d = clone(M.cell), top = d.links.top.boxes;
    top.splice(2, 2);
    top.push(C(0, 0, -110, 110, 70, 90, W(THIN)), B(-55, 35, -55, 110, 0.1, 0.1, W(FINE)),
             B(-27, 35, -83, 54, 0.1, 13, W(FINE, { tone: 'recess' })),
             C(0, 0, 0.2, 32, 48, 0, W(THIN, { tone: 'paper', grow: [2, 'bedh', 0, 1] })),
             B(-16, 24, 5.2, 32, 0.1, 0, W(FINE, { grow: [2, 'bseam', 0, 0.1] })));
    return d;
  }
  // the porter, with a case in hand-over: run along its deck, seen only before the plane it goes through
  function porterUnit() {
    var d = clone(M.porter);
    d.links.tc = { boxes: [B(-24, 0, 0, 48, 0, 10, W(THIN, { tone: 'paper', grow: [1, 'tcl', 0, 1] }))] };
    d.joints.push({ name: 'tcy', parent: 'deck', child: 'tc', type: 'pri', axis: 'y', at: [0, 0, 2.4] });
    return d;
  }
  // the shuttle as the section's scale draws it (half a pixel a centimetre): its body and cover, two forks (each a
  // length that runs out, its stages one), the case on the forks, the lock's light on the right fork; its wheels,
  // bumpers and fingers, under a pixel here, left to the design sheet's SH-1
  function shuttleUnit() {
    return { name: 'shuttle', root: 'body', links: {
      body: { boxes: [C(0, 0, 0, 60, 48, 8, W(THIN)), B(-17, -20, 8, 34, 40, 0.8, W(FINE, { tone: 'paper' }))] },
      fl: { boxes: [B(-1.5, -22, 0, 3, 44, 5, W(FINE, { grow: [1, 'F', 44, 1] }))] },
      fr: { boxes: [B(-1.5, -22, 0, 3, 44, 5, W(FINE, { grow: [1, 'F', 44, 1] })), B(1.5, -20, 1.5, 0.1, 3, 1.4, { lamp: 'lit' })] },
      kc: { boxes: [B(-24, 0, 0, 48, 0, 10, W(THIN, { tone: 'paper', grow: [1, 'kl', 0, 1] }))] }
    }, joints: [
      { name: 'fk', parent: 'body', child: 'fl', type: 'pri', axis: 'y', at: [-22, 0, 8] },
      { name: 'fk2', parent: 'body', child: 'fr', type: 'pri', axis: 'y', at: [22, 0, 8] },
      { name: 'kc', parent: 'body', child: 'kc', type: 'pri', axis: 'y', at: [0, 0, 13] }
    ] };
  }
  // the lift's car: a plate on its guides, two places of runners (forks pass between them), a beam under their front,
  // its light; a case on each place, run off on to the dock table
  function liftUnit(x0) {
    var car = [B(10, 0, -24, 84, 3, 24, W(THIN)), B(2, 52, -10, 100, 3, 3, W(FINE)), B(40, 3, -20, 20, 0.1, 1.6, { lamp: 'lit' })];
    [26, 78].forEach(function (px) { car.push(B(px - 18, 3, -3, 6, 52, 3, W(FINE)), B(px + 12, 3, -3, 6, 52, 3, W(FINE))); });
    return { name: 'lift', root: 'm', links: {
      m: { boxes: [] }, car: { boxes: car },
      cl: { boxes: [B(-24, -16, 0, 48, 32, 0, W(THIN, { tone: 'paper', grow: [2, 'clh', 0, 1] }))] },
      cr: { boxes: [B(-24, -16, 0, 48, 32, 0, W(THIN, { tone: 'paper', grow: [2, 'crh', 0, 1] }))] }
    }, joints: [
      { name: 'z', parent: 'm', child: 'car', type: 'pri', axis: 'z', at: [x0, 6, 0] },
      { name: 'cly', parent: 'car', child: 'cl', type: 'pri', axis: 'y', at: [26, 28, 0] },
      { name: 'cry', parent: 'car', child: 'cr', type: 'pri', axis: 'y', at: [78, 28, 0] }
    ] };
  }

  // the tally flyer as the section draws it: its grids' slats, under a pixel here, left to the design sheet's FY-1
  function flyerUnit() { var d = clone(M.flyer); d.links.slats.boxes = []; return d; }

  // ----------------------------------------------------------------------------------------------- the scene
  function Seat(L) {
    var U = { cell: new RK.Machine(cellUnit()), porter: new RK.Machine(porterUnit()), shuttle: new RK.Machine(shuttleUnit()),
              lift: new RK.Machine(liftUnit(L.lift[0])), steward: new RK.Machine(M.steward), floor: new RK.Machine(M.floor),
              flyer: new RK.Machine(flyerUnit()) };
    var ZF = L.floor, LV = L.levels, NL = LV.length, AYC = (L.aisle[0] + L.aisle[1]) / 2, FACE = L.rack.y[1] - AYC;
    var zones = [L.cells.A, L.cells.B].filter(function (z) { return z.length; }), NP = zones.length, ROUND = CYC * NP;
    var XO = L.buf.out, XI = L.buf.inn, YB = (L.buf.y[0] + L.buf.y[1]) / 2, YL = L.lane, CYL = L.cells.y, CZ = L.cells.z;
    var DOCK = L.dock, XLL = L.lift[0] + 26, XLR = L.lift[0] + 78, YLP = L.lift[2] + 28;
    var INTAKE = CYL + 35.1 - YL, INSIDE = INTAKE - 16;        // the cabinet's front (its intake's face), a case wholly in it
    var DOCKY = YB - YL;                                        // the dock table's middle (porter's y)
    var CR = M.cell.work(0), CWK = M.cell.work(2.0), ARMS = ['p_sh', 'p_el', 'p_wr', 'w_sh', 'w_el', 'w_wr', 's_sh', 's_el', 's_wr'];
    // the level of a cycle, and the cycle of a level's shuttle: the levels four apart, the right rack's, then the left's
    var INV = 0;
    for (var c = 0; c < NL; c++) if ((4 * c) % NL === 1) INV = c;
    function levelOf(n) { var k = mod(n, 2 * NL); return { k: (4 * k) % NL, side: k < NL ? 'R' : 'L' }; }

    // ------------------------------------------------------------------- a cell, from its last exchange
    function cellPose(u) {
      var q = {}, w = u - 3.5;
      var a = { p: seg(w, 0, 0.6) - seg(w, WRITE + 2.2, WRITE + 2.6), w: seg(w, 0.6, 1.2) - seg(w, WRITE + 1.2, WRITE + 1.8),
                s: seg(w, 1.4, 1.8) - seg(w, WRITE + 1.8, WRITE + 2.2) };
      ARMS.forEach(function (k) { q[k] = CR[k] + (CWK[k] - CR[k]) * a[k[0]]; });
      q.beam = CR.beam - (CR.beam - 10.2) * (seg(w, WRITE + 2.6, WRITE + 3.2) - seg(w, WRITE + 3.6, WRITE + 4.2));
      q.lit = w > 1.25 && w < 1.25 + WRITE ? 1 : 0.15;
      q.bedh = 10 * (1 - seg(u, 0, 0.5) + seg(u, 2.6, 3.4));
      q.bseam = q.bedh > 6 ? 1 : 0;
      return q;
    }
    function cells(t, out) {
      zones.forEach(function (cs, i) {
        cs.forEach(function (xc, c) {
          var t0 = CYC * i + 7.5 + go(xc - XI, VP) + ROUND * c;
          U.cell.place(cellPose(mod(t - t0, ROUND * cs.length)), RK.move(xc, CYL, CZ), out);
        });
      });
    }

    // ------------------------------------------------------------------- the porters
    function porters(t, out) {
      zones.forEach(function (cs, i) {
        var m = Math.floor((t - CYC * i - 2.5) / ROUND), r = t - (ROUND * m + CYC * i + 2.5);
        var xc = cs[mod(m, cs.length)], D1 = go(xc - XI, VP), D2 = go(XO - xc, VP);
        var x = xc, lift = 0, cy = null, clip = null, load = 1;
        if (r < 5) {                                           // at the dock: the sealed case out, the blank in
          x = r < 2 ? XO : XO + (XI - XO) * seg(r, 2, 3);
          lift = 10 * (seg(r, 0, 0.5) - seg(r, 1.5, 2) + seg(r, 3, 3.5) - seg(r, 4.5, 5));
          if (r >= 0.5 && r < 1.5) cy = DOCKY * seg(r, 0.5, 1.5);
          else if (r >= 3.5 && r < 4.5) cy = DOCKY * (1 - seg(r, 3.5, 4.5));
          if (r >= 0.5 && r < 4.5) load = 0;
        } else if (r < 5 + D1) x = XI + (xc - XI) * seg(r, 5, 5 + D1);
        else if (r < 8 + D1) {                                 // at its cell: the blank into the intake, the sealed out
          var e = r - 5 - D1;
          lift = 10 * (seg(e, 0, 0.5) - seg(e, 2.5, 3));
          if (e >= 0.5 && e < 1.5) cy = INSIDE * seg(e, 0.5, 1.5);
          else if (e >= 1.5 && e < 2.5) cy = INSIDE * (1 - seg(e, 1.5, 2.5));
          if (e >= 0.5 && e < 2.5) { load = 0; clip = INTAKE; }
        } else if (r >= ROUND - D2) x = xc + (XO - xc) * seg(r, ROUND - D2, ROUND);
        var q = { lift: lift, lit: lift > 9.9 ? 1 : 0.15, load: cy == null ? load : 0, tcy: 0, tcl: 0 };
        if (cy != null) { var k = cut(cy, clip); q.tcy = k[0]; q.tcl = k[1]; }
        U.porter.place(q, RK.move(x, YL, 0), out);
      });
    }
    // the dock table's two places: the sealed case waits on the out place for the lift, the blank on the in place
    // for the next porter
    function dock(t, out) {
      var tau = mod(t, CYC), h = L.case[2];
      if (tau >= 4) out.push(RK.box(XO - 24, YB - 16, DOCK + 0.2, XO + 24, YB + 16, DOCK + h, { tone: 'paper', w: THIN, link: 'dock-out' }));
      if (tau >= 2 && tau < 6) out.push(RK.box(XI - 24, YB - 16, DOCK + 0.2, XI + 24, YB + 16, DOCK + h, { tone: 'paper', w: THIN, link: 'dock-in' }));
    }

    // ------------------------------------------------------------------- the lift
    function lift(t) {
      var n = Math.floor(t / CYC), tau = t - CYC * n, zl = LV[levelOf(n).k] + 13, z;
      if (tau < 2) z = DOCK;
      else if (tau < 4.5) z = DOCK + (zl - DOCK) * seg(tau, 2, 4.5);
      else if (tau < 10.5) z = zl;
      else if (tau < 13) z = zl + (DOCK - zl) * seg(tau, 10.5, 13);
      else z = DOCK;
      var q = { z: z, cly: 0, clh: 0, cry: 0, crh: 0, lit: (tau >= 2 && tau < 4.5) || (tau >= 10.5 && tau < 13) ? 1 : 0.15 };
      if (tau < 1) q.cly = (YB - YLP) * (1 - seg(tau, 0, 1));          // the sealed case on from the out place
      if (tau < 8.5) q.clh = L.case[2];                                  // until its shuttle draws it off
      if (tau < 1 || tau >= 5.5) q.crh = L.case[2];                      // the blank, from its shuttle up to the dock
      else if (tau < 2) { q.crh = L.case[2]; q.cry = (YB - YLP) * seg(tau, 1, 2); }
      return q;
    }

    // ------------------------------------------------------------------- the shuttles
    // the bays left to the flyers: the right rack's last, and on the wide picture the left rack's first
    var FB = { R: L.rack.R.bays[L.rack.R.bays.length - 1] };
    if (!L.small) FB.L = L.rack.L.bays[0];
    function inBay(b) { return function (x) { return x > b[0] && x < b[1]; }; }
    var SL = {};
    ['R', 'L'].forEach(function (sd) {
      var all = sd === 'R' ? L.rack.R.lanes : L.rack.L.lanes;
      SL[sd] = FB[sd] ? all.filter(function (x) { return !inBay(FB[sd])(x); }) : all;
    });
    var post = L.rack.R.x0;
    function shuttle(k, side, t, out) {
      var lanes = SL[side], nL = lanes.length, sd = side === 'R' ? 1 : 2;
      var PER = CYC * 2 * NL, tv = CYC * (mod(INV * k, NL) + (side === 'L' ? NL : 0)) + 4.5;
      var v = mod(t - (tv - 11), PER);                         // the lift's visit: v in [0, BLOCK), the lift at v = 11
      var d0 = mod((hash(k, sd, 7) % 997) / 997 * SLOT - (tv - 11), SLOT);
      var i0 = Math.ceil((BLOCK - d0) / SLOT), i1 = Math.floor((PER - SLOT - d0) / SLOT);
      function P(i) { return lanes[hash(k + 1, sd, mod(i, 64)) % nL]; }
      var q = { x: P(i0), F: 0, fg: 0, kc: null, clip: FACE };
      // a lane's case out, run to another, in
      function draw(st, a) {                                   // out under it, the fingers up, draw it out
        q.x = a;
        if (st < 1) q.F = 42 * seg(st, 0, 1);
        else if (st < 1.3) { q.F = 42; q.fg = -180 * seg(st, 1, 1.3); }
        else if (st < 2.3) { var u = seg(st, 1.3, 2.3); q.F = 42 * (1 - u); q.fg = -180; q.kc = -42 * (1 - u); }
        else { q.fg = -180 * (1 - seg(st, 2.3, 2.6)); q.kc = 0; }
      }
      function put(st, b) {                                    // into lane b, and the forks back
        q.x = b;
        if (st < 1) { var u = seg(st, 0, 1); q.F = 42 * u; q.kc = -42 * u; }
        else q.F = 42 * (1 - seg(st, 1, 2));
      }
      if (v < BLOCK) {
        var A = P(i1 + 1), Bn = P(i0), D1 = go(XLR - A, VS), D2 = go(Bn - XLL, VS);
        if (v < 2.6) draw(v, A);
        else if (v < 11) { q.x = A + (XLR - A) * seg(v, 3, 3 + D1); q.kc = 0; }
        else if (v < 12) { var u = seg(v, 11, 12); q.x = XLR; q.F = 56 * u; q.kc = -56 * u; q.clip = null; }
        else if (v < 13) { q.x = XLR; q.F = 56 * (1 - seg(v, 12, 13)); }
        else if (v < 14) q.x = XLR + (XLL - XLR) * seg(v, 13, 14);
        else if (v < 14.8) { q.x = XLL; q.F = 56 * seg(v, 14, 14.8); }
        else if (v < 15) { q.x = XLL; q.F = 56; q.fg = -180 * seg(v, 14.8, 15); }
        else if (v < 16) { var w = seg(v, 15, 16); q.x = XLL; q.F = 56 * (1 - w); q.fg = -180; q.kc = -56 * (1 - w); q.clip = null; }
        else if (v < 16.3) { q.x = XLL; q.fg = -180 * (1 - seg(v, 16, 16.3)); q.kc = 0; }
        else if (v < 16.3 + D2) { q.x = XLL + (Bn - XLL) * seg(v, 16.3, 16.3 + D2); q.kc = 0; }
        else put(v - 16.3 - D2, Bn);
      } else {
        var i = Math.floor((v - d0) / SLOT);
        if (i < i0) q.x = P(i0);                               // waits where its visit left it
        else if (i > i1) q.x = P(i1 + 1);                      // and where its visit will start
        else {
          var st = v - d0 - SLOT * i, a = P(i), b = P(i + 1), Dt = go(b - a, VS);
          if (st < 2.6) draw(st, a);
          else if (st < 2.6 + Dt) { q.x = a + (b - a) * seg(st, 2.6, 2.6 + Dt); q.kc = 0; }
          else put(st - 2.6 - Dt, b);
        }
      }
      var pose = { fk: -q.F, fk2: -q.F, F: q.F, lit: q.fg < -90 ? 1 : 0.15, kc: 0, kl: 0 };
      if (q.kc != null) { var cc = cut(q.kc, q.clip); pose.kc = cc[0]; pose.kl = cc[1]; }
      U.shuttle.place(pose, RK.move(q.x, AYC, LV[k]), out);
    }

    // ------------------------------------------------------------------- the flyers
    // each in its bay, before the lanes' mouths: up the bay lane by lane and level by level, and back down; at each
    // tag it settles, runs its probe out to the case's face, reads (its light) and draws it in; it leans into a run
    var STOP = 2.05, YAW = RK.rot('z', -Math.PI / 2);
    function flyer(side, t, out) {
      var bay = FB[side];
      if (!bay) return;
      var lanes = (side === 'R' ? L.rack.R.lanes : L.rack.L.lanes).filter(inBay(bay)), nl = lanes.length, up = [];
      for (var k = 0; k < NL; k++) for (var i = 0; i < nl; i++) up.push([k, k % 2 ? nl - 1 - i : i]);
      var stops = up.concat(up.slice().reverse().slice(1, -1)), n = stops.length, T = n * STOP;
      var u = mod(t + (side === 'L' ? T / 2 : 0), T), si = Math.floor(u / STOP), e = u - si * STOP;
      var a = stops[mod(si - 1, n)], b = stops[si], m = seg(e, 0, 0.7);
      var x = lanes[a[1]] + (lanes[b[1]] - lanes[a[1]]) * m;
      var z = LV[a[0]] + (LV[b[0]] - LV[a[0]]) * m + 14 + 0.5 * Math.sin(2 * Math.PI * t / 1.6);
      var run = lanes[b[1]] - lanes[a[1]], lean = run ? -7 * Math.sin(Math.PI * clamp(e / 0.7, 0, 1)) * (run > 0 ? 1 : -1) : 0;
      var q = { my: 0, mz: 0, roll: lean, pitch: 0, slat: 0, rodj: 0,
                probe: 11.8 * (seg(e, 0.85, 1.2) - seg(e, 1.7, 2.05)), lit: e > 1.2 && e < 1.7 ? 1 : 0.15 };
      U.flyer.place(q, RK.mul(RK.move(x, AYC, z), YAW), out);
    }

    // ------------------------------------------------------------------- the store's floor: the steward, the floor unit
    var SX = L.steward[0], SY = L.steward[1];
    var SPARE = { fk: 0, fk2: 0, F: 0, lit: 0.15, kc: 0, kl: 0 };
    function floorUnit(t, out) {
      var f = L.floorunit, T = 72, u = mod(t, T), x, yaw, q;
      if (u < 32) { x = f[0] + (f[1] - f[0]) * seg(u, 0, 32); yaw = 0; }
      else if (u < 36) { x = f[1]; yaw = Math.PI * seg(u, 32, 36); }
      else if (u < 68) { x = f[1] + (f[0] - f[1]) * seg(u, 36, 68); yaw = Math.PI; }
      else { x = f[0]; yaw = Math.PI + Math.PI * seg(u, 68, 72); }
      q = u < 31.5 ? M.floor.work(Math.min(2.5, 1 + u)) : u < 32 ? M.floor.work(3.6 + (u - 31.5)) : M.floor.rest;
      U.floor.place(q, RK.mul(RK.move(x, f[2], ZF), RK.rot('z', yaw)), out);
    }

    // ------------------------------------------------------------------- the window seat: a case of copies, the comb
    var RX = L.held[2], WX = L.win[0], DZ = L.deck[2], TL = L.teeth[5], BZ = L.bar[2];
    function copies(t, out) {
      var u = mod(t, 26), h = L.case[2];
      var rx = u < 2.4 ? RX + (WX - RX) * seg(u, 0, 2.4) : u < 10.75 ? WX : RX + (WX - RX) * (1 - seg(u, 10.75, 13.15));
      var wz = BZ + (DZ + h + 0.4 + TL - BZ) * (seg(u, 6.4, 7) - seg(u, 9.8, 10.4));
      var lit = clamp((u - 7.1) / 0.18, 0, 1) - clamp((u - 9.62) / 0.18, 0, 1);
      out.push(RK.box(rx - 24, 26, DZ + 0.2, rx + 24, 58, DZ + h, { tone: 'paper', w: THIN, link: 'copy' }),
               RK.box(rx - 21, 58, DZ + 5, rx + 21, 58.1, DZ + 5.1, { w: FINE, link: 'copy-seam' }));
      for (var i = 0; i < 3; i++) {
        var x0 = L.teeth[0] + L.teeth[1] * i;
        out.push(RK.box(x0, L.teeth[3], wz - TL, x0 + L.teeth[2], L.teeth[4], wz, { w: FINE, link: 'tooth' + i }));
      }
      out.push(RK.box(L.bar[0], L.bar[1], wz, L.bar[3], L.bar[4], wz + 6, { w: THIN, link: 'comb' }),
               RK.box(L.lamp[0], L.lamp[2], L.lamp[3], L.lamp[1], L.lamp[2] + 0.05, L.lamp[4], { lit: lit, link: 'seat-lamp' }));
    }

    // the section at t: what stands in the store (under the hall's floor) and in the hall
    function frame(t) {
      var store = [], hall = [], q = lift(t);
      U.lift.place(q, null, q.z >= 0 ? hall : store);
      for (var k = 0; k < NL; k++) { shuttle(k, 'L', t, store); shuttle(k, 'R', t, store); }
      flyer('R', t, store); flyer('L', t, store);
      store.push(RK.box(post, L.rack.y[0], ZF, post + 8, L.rack.y[1], LV[NL - 1] + 34, { w: 0.85, link: 'post' }));
      U.steward.place(M.steward.work(t), RK.move(SX, SY, ZF), store);
      store.push(RK.box(SX + 88, SY - 30, ZF, SX + 152, SY + 30, ZF + 52, { w: THIN, link: 'stand' }));
      U.shuttle.place(SPARE, RK.move(SX + 120, SY, ZF + 52), store);
      floorUnit(t, store);
      cells(t, hall); porters(t, hall); dock(t, hall); copies(t, hall);
      return { store: store, hall: hall };
    }
    return { frame: frame, levelOf: levelOf };
  }
  return { Seat: Seat, CYC: CYC };
})();

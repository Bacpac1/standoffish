/* arrive.js (2026-11-14): a few of the house's headings are received rather than printed. When one first comes into
   view its letters come in from left to right, each through a few wrong characters before it settles, the way a
   line of a signal does. The words keep their places from the start: the heading is laid out as it will be, and only
   the letters still in transit are drawn as something else. The real words are kept for readers that read aloud.
   Without this script, or where motion is reduced, the headings are simply there. Once each, never again. */
(function () {
  "use strict";
  if (!("IntersectionObserver" in window) || !document.querySelector) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var TARGETS = [
    ".work .wk__h",          /* home: Replies. Certification. Records. */
    ".dband__h",             /* home: Find a desk. */
    ".sx__h", ".sx__t",      /* an episode: its code and its name */
    ".glance__big"           /* an episode: its delay */
  ].join(",");
  var GLYPHS = "ABCDEFGHJKLMNPRSTUVXYZ0123456789#/+=<>";
  var STEP = 22;    /* ms between one letter starting and the next */
  var TURNS = 4;    /* wrong characters a letter passes through, at most */
  var TICK = 46;    /* ms each one is shown */

  function pick() { return GLYPHS.charAt((Math.random() * GLYPHS.length) | 0); }

  /* replace each text node with its words for the eye (split into letters) and the same words kept for the ear */
  function split(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n, letters = [];
    while ((n = walker.nextNode())) if (/\S/.test(n.nodeValue)) nodes.push(n);
    nodes.forEach(function (node) {
      var text = node.nodeValue, frag = document.createDocumentFragment();
      var ear = document.createElement("span"); ear.className = "vh"; ear.textContent = text;
      var eye = document.createElement("span"); eye.setAttribute("aria-hidden", "true");
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { eye.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement("span"); w.className = "ar__w";
        Array.prototype.forEach.call(part, function (ch) {
          var c = document.createElement("span"); c.className = "ar__c is-wait"; c.textContent = ch;
          c.setAttribute("data-g", pick());
          w.appendChild(c); letters.push(c);
        });
        eye.appendChild(w);
      });
      frag.appendChild(ear); frag.appendChild(eye);
      node.parentNode.replaceChild(frag, node);
    });
    return letters;
  }

  function play(letters) {
    var t0 = null, done = 0, last = [];
    function frame(t) {
      if (t0 === null) t0 = t;
      var e = t - t0;
      for (var i = 0; i < letters.length; i++) {
        var c = letters[i];
        if (!c) continue;
        var local = e - i * STEP;
        if (local < 0) break;
        var turn = (local / TICK) | 0;
        if (turn >= TURNS) { c.classList.remove("is-wait"); c.removeAttribute("data-g"); letters[i] = null; done++; continue; }
        if (last[i] !== turn) { last[i] = turn; c.setAttribute("data-g", pick()); }
      }
      if (done < letters.length) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var els = Array.prototype.slice.call(document.querySelectorAll(TARGETS));
  if (!els.length) return;
  var held = new Map();
  els.forEach(function (el) { held.set(el, split(el)); el.classList.add("ar"); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      var letters = held.get(en.target); held.delete(en.target);
      if (letters) play(letters);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
  els.forEach(function (el) { io.observe(el); });

  /* a page restored from the back-forward cache is shown as it was left: nothing waits there */
  window.addEventListener("pageshow", function (ev) {
    if (!ev.persisted) return;
    held.forEach(function (letters) { letters.forEach(function (c) { c.classList.remove("is-wait"); c.removeAttribute("data-g"); }); });
    held.clear();
  });
})();

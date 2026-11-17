/* page.js (round 41, 2026-11-17): the pages of the house are received in order. What stands in the first view stands;
   further down, as a group of particulars or a table comes into view, its heading and its rows land one after
   another, top to bottom, once. Without this script, or where motion is reduced, everything is simply there. */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window) || !window.matchMedia) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var slice = function (l) { return Array.prototype.slice.call(l); };
  var groups = slice(document.querySelectorAll('.page .parts, .page table, .page .doc h2, .page .doc h3'));
  if (!groups.length) return;
  var vh = window.innerHeight || 0, wait = [];
  groups.forEach(function (g) {
    if (g.closest('.will-land') || g.getBoundingClientRect().top < vh * 0.92) return;   // in the first view (or in a group that waits): as it is
    var rows = slice(g.querySelectorAll(g.tagName === 'TABLE' ? 'tbody > tr' : 'dl > div'));
    rows.forEach(function (r, i) { r.style.setProperty('--i', Math.min(i, 16)); });
    g.classList.add('will-land');
    wait.push(g);
  });
  if (!wait.length) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
  wait.forEach(function (g) { io.observe(g); });
  // a page left open in a hidden tab, printed, or reached by a link to a part of it: nothing is left waiting
  var all = function () { wait.forEach(function (g) { g.classList.add('is-in'); }); };
  window.addEventListener('beforeprint', all);
  window.addEventListener('hashchange', function () { setTimeout(all, 50); });
  if (location.hash) all();
})();

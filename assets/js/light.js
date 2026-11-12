/* The house's light (round 33). The house keeps the light of its seat: its pages are dark while the sun is down at
   Longyearbyen (the polar night through; evening by evening in spring and autumn) and light while it is up; on a
   device set to dark they are dark at any hour. It runs in the head, before the first paint, and again each minute,
   so a page left open turns with the sky. It requests nothing, stores nothing and reads nothing back; without it the
   pages stand in the day's light. The sun's elevation is house.js's (section 2), to the same -0.833 degrees. */
(function () {
  'use strict';
  var LAT = 78.2232, LON = 15.6267, rad = Math.PI / 180, root = document.documentElement;
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var still = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: true };
  var GROUND = { day: '#f1f3f2', night: '#0d1013' };
  var sunAt = function (d) {
    var n = d.getTime() / 864e5 + 2440587.5 - 2451545.0;
    var L = (280.46 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * rad;
    var lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, eps = (23.439 - 4e-7 * n) * rad;
    var dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    var ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    var ha = ((280.46061837 + 360.98564736629 * n) % 360 + LON) * rad - ra;
    return Math.asin(Math.sin(LAT * rad) * Math.sin(dec) + Math.cos(LAT * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
  };
  var put = function (w) {
    root.setAttribute('data-light', w);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', GROUND[w]);
  };
  var keep = function () {
    var w = (mq && mq.matches) || sunAt(new Date()) < -0.833 ? 'night' : 'day', was = root.getAttribute('data-light');
    if (w === was) return;
    if (was && document.startViewTransition && !still.matches && !document.hidden) document.startViewTransition(function () { put(w); });
    else put(w);
  };
  keep();
  setInterval(keep, 60000);
  if (mq && mq.addEventListener) mq.addEventListener('change', keep);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) keep(); });
  window.addEventListener('beforeprint', function () { put('day'); });      // on paper, the day's inks
  window.addEventListener('afterprint', keep);
})();

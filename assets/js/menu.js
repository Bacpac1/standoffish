/* The header's menu on a phone (2026-11-14). Under 561 px the header's sections fold behind one button, Menu, and open
   as a list under the brand; above it they stand in a row as before. Without this script the row stays as it was,
   one line the thumb moves along. It requests nothing and stores nothing. */
(function () {
  'use strict';
  var gh = document.querySelector('.gh'), nav = gh && gh.querySelector('.gh__nav');
  if (!nav) return;
  if (!nav.id) nav.id = 'gh-nav';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'gh__btn';
  btn.setAttribute('aria-controls', nav.id);
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="gh__btn-l">Menu</span><i aria-hidden="true"></i>';
  gh.insertBefore(btn, nav);
  gh.classList.add('gh--menu');
  var set = function (open) {
    gh.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  btn.addEventListener('click', function () { set(!gh.classList.contains('is-open')); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && gh.classList.contains('is-open')) { set(false); btn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (gh.classList.contains('is-open') && !gh.contains(e.target)) set(false);
  });
  var wide = window.matchMedia('(min-width: 561px)');
  var onWide = function () { if (wide.matches) set(false); };
  if (wide.addEventListener) wide.addEventListener('change', onWide);
})();

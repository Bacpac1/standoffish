/* The site's only script, for the plates (2026). It requests nothing from anyone, stores nothing and reads
   nothing back. Everything else on the site works without it. */
(function () {
  'use strict';

  /* A motion clip shows a strip of whole frames. A click plays the clip in place: muted, looping, with controls.
     Without this script the link opens the clip file itself. */
  document.querySelectorAll('[data-clip] .clip__open').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      var v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
      v.loop = true; v.controls = true; v.playsInline = true; v.setAttribute('playsinline', '');
      v.preload = 'auto';
      v.width = +a.dataset.w; v.height = +a.dataset.h;
      v.poster = a.dataset.poster;
      v.setAttribute('aria-label', a.getAttribute('aria-label') || '');
      var s = document.createElement('source');
      s.src = a.dataset.video; s.type = 'video/mp4';
      v.appendChild(s);
      a.replaceWith(v);
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
      v.focus();
    });
  });

  /* The plate table: CSS (:has) switches the plates; where :has is missing, the switches do it here. */
  var hasHas = window.CSS && CSS.supports && CSS.supports('selector(:has(*))');
  if (!hasHas) {
    document.querySelectorAll('[data-ptable]').forEach(function (t) {
      t.querySelectorAll('input[type=checkbox]').forEach(function (c) {
        c.addEventListener('change', function () {
          var layer = t.querySelector('.ptable__layer.' + c.classList[0]);
          if (layer) layer.classList.toggle('is-off', !c.checked);
        });
      });
    });
  }
})();

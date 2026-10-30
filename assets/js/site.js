/* The script of NOSLEN's pages: the plates (2026) and the strip of frames (2026-10-30). It requests nothing from
   anyone, stores nothing and reads nothing back. Everything on the pages works without it. */
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

  /* The strip of every frame scrolls by itself; here two buttons under it move it a view at a time, and rest at its
     ends, and a track on their row, from the first frame's edge, shows where the view stands on the strip (the strip's
     own scrollbar then stands aside). Without this script the strip is moved by hand, as it is with these. */
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.reel').forEach(function (r) {
    var nav = document.createElement('div');
    nav.className = 'reel__nav nw';
    function button(dir, label, d) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'reel__b'; b.setAttribute('aria-label', label);
      b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="' + d + '"/></svg>';
      b.addEventListener('click', function () {
        r.scrollBy({ left: dir * Math.max(200, r.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' });
      });
      nav.appendChild(b);
      return b;
    }
    var track = document.createElement('div'), thumb = document.createElement('div');
    track.className = 'reel__track'; track.setAttribute('aria-hidden', 'true');
    thumb.className = 'reel__thumb'; track.appendChild(thumb); nav.appendChild(track);
    var prev = button(-1, 'Earlier frames', 'M10 3 5 8l5 5'), next = button(1, 'Later frames', 'M6 3l5 5-5 5');
    r.classList.add('is-tracked');
    function state() {
      prev.disabled = r.scrollLeft <= 2;
      next.disabled = r.scrollLeft + r.clientWidth >= r.scrollWidth - 2;
      nav.hidden = r.scrollWidth <= r.clientWidth + 2;
      var w = r.scrollWidth || 1;
      thumb.style.width = (100 * r.clientWidth / w).toFixed(2) + '%';
      thumb.style.left = (100 * r.scrollLeft / w).toFixed(2) + '%';
    }
    r.addEventListener('scroll', state, { passive: true });
    window.addEventListener('resize', state);
    r.parentNode.insertBefore(nav, r.nextSibling);
    state();
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

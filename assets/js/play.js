/* A plain Watch link still opens YouTube. An ordinary click plays the Sheet in its
   figure. Only that click loads the privacy-enhanced player. */
(function () {
  'use strict';
  var fig = document.querySelector('.sx__frame');
  var links = document.querySelectorAll('.sx__ctas a[href*="youtube.com/watch?v="], .pn__watch[href*="youtube.com/watch?v="]');
  if (!fig || !links.length) return;

  var hero = fig.querySelector('.view--hero');
  var filmLink = document.querySelector('.sx__ctas a');
  var player = null;

  function showFilm(id, href) {
    if (!player) {
      var sequence = fig.closest('.rx');
      var hud = fig.querySelector('.rx__hud');
      var frame = document.createElement('iframe');
      frame.title = filmLink ? filmLink.textContent.trim() : 'NOSLEN';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
      player = document.createElement('div');
      player.className = 'sx__play';
      player.appendChild(frame);

      var controls = document.createElement('p');
      controls.className = 'sx__out';
      var back = document.createElement('button');
      back.type = 'button';
      back.textContent = 'Back to frames';
      var out = document.createElement('a');
      out.className = 'more';
      out.href = href;
      out.rel = 'noopener noreferrer';
      out.textContent = 'Open on YouTube';
      controls.append(back, out);

      back.addEventListener('click', function () {
        player.remove();
        player = null;
        controls.remove();
        if (sequence) sequence.classList.remove('is-playing');
        if (hud) hud.hidden = false;
        if (hero) {
          hero.hidden = false;
          hero.focus({ preventScroll: true });
        }
        fig.scrollIntoView({ block: 'center', behavior: 'instant' });
      });

      if (hero) hero.hidden = true;
      if (hud) hud.hidden = true;
      if (sequence) sequence.classList.add('is-playing');
      fig.append(player, controls);
    }
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fig.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    player.querySelector('iframe').focus({ preventScroll: true });
  }

  Array.prototype.forEach.call(links, function (link) {
    var id = /[?&]v=([A-Za-z0-9_-]{11})(?:&|$)/.exec(link.href);
    if (!id) return;
    link.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      showFilm(id[1], link.href);
    });
  });
})();

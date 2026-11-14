/* Play an episode in place (2026-11-14). On an episode's page the Watch links play the episode where its first frame
   stands, in YouTube's privacy-enhanced player, instead of leaving the site. Nothing is requested from YouTube until
   the reader asks for it: until then the frame is the site's own picture. A click with a modifier key, a middle click
   or a page without this script keeps the plain link to YouTube. */
(function () {
  'use strict';
  var fig = document.querySelector('.sx__frame');
  var links = document.querySelectorAll('.sx__ctas a[href*="youtube.com/watch?v="], .pn__watch[href*="youtube.com/watch?v="]');
  if (!fig || !links.length) return;
  var hero = fig.querySelector('.view--hero');
  var title = (links[0].textContent || 'NOSLEN').trim();
  var player = null;

  var idOf = function (href) {
    var m = /[?&]v=([A-Za-z0-9_-]{11})(?:&|$)/.exec(href);
    return m ? m[1] : null;
  };

  var play = function (id, href) {
    if (!player) {
      player = document.createElement('div');
      player.className = 'sx__play';
      player.style.position = 'relative';
      player.style.aspectRatio = '16 / 9';
      player.style.background = '#000';
      player.style.borderRadius = '4px';
      player.style.overflow = 'hidden';
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
      f.title = title;
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      // the house sends no referrer; YouTube's player will not start without one, so this frame alone sends the origin
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      f.style.position = 'absolute';
      f.style.inset = '0';
      f.style.width = '100%';
      f.style.height = '100%';
      f.style.border = '0';
      player.appendChild(f);
      var out = document.createElement('p');
      out.className = 'sx__out';
      out.style.margin = '10px 0 0';
      out.style.textAlign = 'center';
      var a = document.createElement('a');
      a.className = 'more';
      a.href = href;
      a.rel = 'noopener noreferrer';
      a.textContent = 'Open on YouTube';
      out.appendChild(a);
      if (hero) hero.hidden = true;
      // where the page receives its record over the first frame (receive.js), its frame counter steps aside too
      var hud = fig.querySelector('.rx__hud');
      if (hud) hud.hidden = true;
      fig.appendChild(player);
      fig.appendChild(out);
    }
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fig.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    var frame = player.querySelector('iframe');
    if (frame) frame.focus({ preventScroll: true });
  };

  Array.prototype.forEach.call(links, function (link) {
    var id = idOf(link.getAttribute('href') || '');
    if (!id) return;
    link.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      play(id, link.href);
    });
  });
})();

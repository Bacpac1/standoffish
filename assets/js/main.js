(() => {
  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-menu-toggle]");
  const mobile = document.querySelector("[data-mobile-menu]");
  const year = document.querySelector("[data-year]");
  const cursor = document.querySelector(".cursor");

  if (year) year.textContent = String(new Date().getFullYear());

  // Nav scroll state
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile menu
  if (toggle && mobile) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      mobile.hidden = !open;
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      setOpen(open);
    });
    mobile.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => setOpen(false));
    });
  }

  // Reveal on scroll
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 4, 3) * 60}ms`;
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  // Soft cursor glow
  if (cursor && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.body.classList.add("is-cursor");
    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    window.addEventListener(
      "pointermove",
      (e) => {
        tx = e.clientX;
        ty = e.clientY;
      },
      { passive: true }
    );
    const tick = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Contact form: prefer opening mail client with composed body
  const form = document.querySelector(".contact__form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const type = String(data.get("type") || "").trim();
      const message = String(data.get("message") || "").trim();
      const subject = encodeURIComponent(`[Standoffish] ${type} · ${name}`);
      const body = encodeURIComponent(
        `Name / team: ${name}\nEmail: ${email}\nType: ${type}\n\n${message}`
      );
      window.location.href = `mailto:hello@standoffish.net?subject=${subject}&body=${body}`;
    });
  }
})();

/* ===== EDIT YOUR MUSIC VIDEO SOURCE HERE =====
   Local file:  "img/music-composition.mp4"
   YouTube:     "https://www.youtube.com/watch?v=VIDEO_ID"  (or an /embed/ link)  */
const VIDEO_SRC = "img/music-composition.mp4";

/* (Artwork 08's video source is set in index.html → data-video="...") */

(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Style every [bracketed] text as a placeholder ---------- */
  (() => {
    const re = /\[[^\]]+\]/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: n => re.test(n.nodeValue) && !n.parentElement.closest("script,style,code,.tx")
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const frag = document.createDocumentFragment();
      n.nodeValue.split(/(\[[^\]]+\])/).forEach(part => {
        if (re.test(part) && part.startsWith("[")) {
          const s = document.createElement("span");
          s.className = "tx"; s.textContent = part; frag.append(s);
        } else if (part) frag.append(part);
      });
      n.replaceWith(frag);
    });
  })();

  /* ---------- Video helpers (local file or YouTube/Vimeo) ---------- */
  const isEmbed = s => /youtube\.com|youtu\.be|player\.vimeo/.test(s);
  const toEmbed = u => {
    const m = u.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
    return /youtube|youtu\.be/.test(u) && m ? "https://www.youtube.com/embed/" + m[1] : u;
  };
  function makeVideo(src, onError) {
    if (isEmbed(src)) {
      const f = document.createElement("iframe");
      f.src = toEmbed(src); f.title = "Video"; f.allowFullscreen = true;
      f.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture";
      return f;
    }
    const v = document.createElement("video");
    v.controls = true; v.preload = "metadata"; v.playsInline = true; v.src = src; // never autoplay
    v.addEventListener("error", onError);
    return v;
  }

  /* ---------- Music video box (Music page) ---------- */
  const box = $("#video");
  const placeholder = box.innerHTML;
  function resetMusic(msg) {
    box.innerHTML = placeholder;
    if (msg) $("p", box).textContent = msg;
    $(".play", box).addEventListener("click", loadMusic);
  }
  function loadMusic() {
    box.innerHTML = "";
    box.append(makeVideo(VIDEO_SRC, () =>
      resetMusic("Video not found. Add the file or edit VIDEO_SRC in script.js.")));
  }
  $(".play", box).addEventListener("click", loadMusic);

  /* ---------- Image fallback: try other extensions, then artistic placeholder ---------- */
  const EXTS = ["jpg", "jpeg", "png", "webp"];
  $$(".ph img").forEach((img, i) => {
    const giveUp = () => img.parentElement.classList.add("missing", "art-" + (i % 6 + 1));
    const fail = () => {
      const src = img.getAttribute("src") || "";
      const m = src.match(/^(.*)\.([a-z0-9]+)$/i);
      if (m) {
        const tried = (img.dataset.tried || m[2]).toLowerCase().split(",");
        if (!tried.includes(m[2].toLowerCase())) tried.push(m[2].toLowerCase());
        const next = EXTS.find(e => !tried.includes(e));
        if (next) { img.dataset.tried = tried.join(","); img.src = m[1] + "." + next; return; }
      }
      giveUp();
    };
    if (img.complete && img.naturalWidth === 0) fail();
    img.addEventListener("error", fail);
  });

  /* ---------- Pages (pagination) ---------- */
  const pages = $$(".page");
  const order = pages.map(p => p.id);
  const short = { home:"Home", about:"About Me", part1:"Part I", part2:"Part II",
                  photography:"Photography", pubmat:"PUBMAT", music:"Music", reflection:"Reflection" };
  const pad = n => String(n).padStart(2, "0");

  // Previous / Next buttons at the bottom of every page (except Home)
  pages.forEach((p, i) => {
    if (i === 0) return;
    const prev = order[i - 1], next = order[i + 1];
    const nav = document.createElement("nav");
    nav.className = "pager";
    nav.setAttribute("aria-label", "Page navigation");
    nav.innerHTML =
      `<a class="btn ghost" href="#${prev}">← ${short[prev] || prev}</a>` +
      `<span class="count">${pad(i + 1)} / ${pad(order.length)}</span>` +
      (next ? `<a class="btn" href="#${next}">${short[next] || next} →</a>` : `<span></span>`);
    p.append(nav);
  });

  /* ---------- Scroll reveal ---------- */
  const reveal = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } });
  }, { threshold: .12 });

  /* ---------- Mobile menu ---------- */
  const menuBtn = $(".menu-btn"), nav = $(".nav");
  const setMenu = open => { nav.classList.toggle("open", open); menuBtn.setAttribute("aria-expanded", open); };
  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));

  /* ---------- Show the page that matches the URL hash ---------- */
  const links = $$(".nav a");
  function showPage() {
    let id = location.hash.slice(1);
    if (!order.includes(id)) id = "home";
    const page = $("#" + id);

    // stop any playing media when leaving a page
    $$("video").forEach(v => v.pause());
    if ($("iframe", box)) resetMusic();

    pages.forEach(p => p.classList.toggle("active", p === page));
    links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
    $$(".reveal", page).forEach(el => { el.classList.remove("in"); reveal.observe(el); });
    setMenu(false);
    scrollTo({ top: 0, behavior: "instant" });
  }
  addEventListener("hashchange", showPage);
  showPage();

  /* ---------- Modal / Lightbox (images + video) ---------- */
  const modal = $("#modal"), body = $(".modal-body", modal);
  let lastFocus = null;

  const openModal = card => {
    lastFocus = card;
    body.className = "modal-body" + (card.hasAttribute("data-light") ? " light" : "");
    body.innerHTML = "";
    let media;
    if (card.dataset.video) {                       // Artwork 08 → video player
      media = document.createElement("div");
      media.className = "ph vid";
      media.append(makeVideo(card.dataset.video, () => {
        media.classList.add("novid");
        media.textContent = "Video not found. Check the data-video path in index.html.";
      }));
    } else {
      media = $(".ph", card).cloneNode(true);
    }
    body.append(media, $(".meta", card).cloneNode(true));
    modal.showModal();
    document.body.classList.add("lock");
    modal.scrollTop = 0;
  };
  const closeModal = () => modal.open && modal.close();

  $$("[data-open]").forEach(card => {
    card.addEventListener("click", () => openModal(card));
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(card); }
    });
  });
  $(".close", modal).addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); }); // click outside
  modal.addEventListener("close", () => {            // also fires on Escape
    body.innerHTML = "";                             // stops video playback
    document.body.classList.remove("lock");
    if (lastFocus) lastFocus.focus();
  });

  /* ---------- Back to top + footer year ---------- */
  const top = $(".to-top");
  addEventListener("scroll", () => top.classList.toggle("show", scrollY > 600), { passive: true });
  top.addEventListener("click", () => scrollTo({ top: 0 }));
  $("#year").textContent = new Date().getFullYear();
})();
(function () {
  "use strict";
  var root = document.documentElement;
  var KEY = "starlight-reduce-motion";
  var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var wideMq = window.matchMedia("(min-width: 1000px) and (min-height: 620px)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function getPref() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setPref(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* storage unavailable */ } }
  if (getPref() === "on") root.classList.add("reduce-motion");
  function reduced() { return mq.matches || root.classList.contains("reduce-motion"); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* Reduce motion toggles */
  var toggles = $$(".motion-toggle");
  function syncToggles() {
    var on = root.classList.contains("reduce-motion");
    toggles.forEach(function (b) { b.setAttribute("aria-checked", on ? "true" : "false"); });
  }
  syncToggles();
  toggles.forEach(function (b) {
    b.addEventListener("click", function () {
      root.classList.toggle("reduce-motion");
      setPref(root.classList.contains("reduce-motion") ? "on" : "off");
      syncToggles(); applyMode();
    });
  });
  if (mq.addEventListener) mq.addEventListener("change", function () { applyMode(); });

  /* Skip page transitions when motion is reduced */
  window.addEventListener("pageswap", function (e) { if (reduced() && e.viewTransition) e.viewTransition.skipTransition(); });
  window.addEventListener("pagereveal", function (e) { if (reduced() && e.viewTransition) e.viewTransition.skipTransition(); });

  /* Menu overlay */
  var header = document.querySelector(".site-header");
  var menuBtn = document.querySelector(".menu-toggle");
  var menu = document.getElementById("menu");
  var outside = [document.getElementById("main"), document.querySelector(".site-footer"), document.querySelector(".to-top")].filter(Boolean);
  var closeTimer = null;
  function setMenu(open) {
    if (!menu || !menuBtn) return;
    clearTimeout(closeTimer);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    var lbl = menuBtn.querySelector(".label"); if (lbl) lbl.textContent = open ? "Close" : "Menu";
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    header.classList.toggle("menu-open", open);
    outside.forEach(function (el) { if (open) el.setAttribute("inert", ""); else el.removeAttribute("inert"); });
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add("is-open"); }); });
      var first = menu.querySelector("a"); if (first) first.focus();
    } else {
      menu.classList.remove("is-open");
      closeTimer = setTimeout(function () { if (!menu.classList.contains("is-open")) menu.hidden = true; }, reduced() ? 0 : 800);
    }
    headerState(true);
  }
  if (menuBtn && menu) {
    $$("li", menu).forEach(function (li, i) { li.style.setProperty("--n", i); });
    menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia("(min-width: 1061px)").addEventListener("change", function (m) { if (m.matches) setMenu(false); });
  }

  /* Header: hide on the way down, return on the way up, and switch tone over dark sections */
  var lastY = window.scrollY;
  function headerState(force) {
    if (!header) return;
    var y = window.scrollY, open = header.classList.contains("menu-open");
    if (Math.abs(y - lastY) > 6 || force) {
      header.classList.toggle("is-hidden", !open && y > lastY && y > window.innerHeight * 0.7);
      lastY = y;
    }
    var dark = open;
    if (!open && document.elementsFromPoint) {
      var els = document.elementsFromPoint(window.innerWidth / 2, 38);
      for (var i = 0; i < els.length; i++) {
        if (header.contains(els[i])) continue;
        var t = els[i].closest("[data-theme]");
        if (t) dark = t.getAttribute("data-theme") === "dark";
        break;
      }
    }
    header.classList.toggle("is-dark", dark);
  }

  /* Split headings into masked words */
  function srCopy(el) {
    var copy = document.createElement("span"); copy.className = "visually-hidden"; copy.textContent = el.textContent.replace(/\s+/g, " ").trim();
    var vis = document.createElement("span"); vis.setAttribute("aria-hidden", "true");
    while (el.firstChild) vis.appendChild(el.firstChild);
    el.appendChild(copy); el.appendChild(vis);
    return vis;
  }
  $$("[data-split]").forEach(function (host) {
    var el = srCopy(host), i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement("span"); w.className = "wd";
            var s = document.createElement("span"); s.textContent = part; s.style.setProperty("--i", i++);
            w.appendChild(s); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") { walk(n); }
      });
    })(el);
    host.classList.add("split-words");
    if (!host.hasAttribute("data-reveal")) host.setAttribute("data-reveal", "split");
  });

  /* Stagger children */
  $$("[data-stagger]").forEach(function (box) {
    var kind = box.getAttribute("data-stagger") || "", step = parseInt(box.getAttribute("data-step") || "90", 10);
    Array.prototype.slice.call(box.children).forEach(function (c, i) {
      if (!c.hasAttribute("data-reveal")) c.setAttribute("data-reveal", kind);
      c.style.setProperty("--d", (i * step) + "ms");
    });
  });

  /* Reveal on scroll */
  var items = $$("[data-reveal]");
  var counters = $$("[data-count]");
  function setNum(el, n, suf) { el.innerHTML = n + (suf ? '<span class="plus">' + suf + "</span>" : ""); }
  function count(el) {
    if (el.dataset.done) return; el.dataset.done = "1";
    var end = parseInt(el.getAttribute("data-count"), 10), suf = el.getAttribute("data-suffix") || "";
    if (reduced()) { setNum(el, end, suf); return; }
    var t0 = null, dur = 2000;
    (function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      setNum(el, Math.round(end * e), suf);
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  function show(el) {
    el.classList.remove("is-pending"); el.classList.add("is-in");
    if (el.hasAttribute("data-count")) count(el);
    $$("[data-count]", el).forEach(count);
  }
  function revealAll() { items.forEach(show); counters.forEach(function (c) { c.dataset.done = ""; c.dataset.done = "1"; setNum(c, c.getAttribute("data-count"), c.getAttribute("data-suffix") || ""); }); }
  var io = null;
  if (!reduced() && "IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) { el.classList.add("is-pending"); io.observe(el); }
      else show(el);
    });
    document.addEventListener("focusin", function (e) { var p = e.target.closest && e.target.closest(".is-pending"); if (p) show(p); });
  } else { revealAll(); }

  /* Statement words light up as you read */
  var statements = $$(".statement");
  statements.forEach(function (host) {
    var s = srCopy(host), words = [];
    (function walk(node, accent) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement("span"); w.className = "sw" + (accent ? " accent" : ""); w.textContent = part;
            words.push(w); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) { walk(n, accent || n.classList.contains("accent")); }
      });
    })(s, false);
    host._w = words;
  });

  /* Element caches */
  var bar = document.querySelector(".progress");
  var toTop = document.querySelector(".to-top");
  var hero = document.querySelector(".hero");
  var heroInner = hero && hero.querySelector(".hero-inner");
  var heroStar = hero && hero.querySelector(".hero-star");
  var heroMedia = hero && hero.querySelector(".hero-media");
  var heroGlow = hero && hero.querySelector(".hero-glow");
  [heroMedia, heroGlow].forEach(function (el) { if (el) el.addEventListener("animationend", function (e) { if (e.target === el) { el.style.animation = "none"; } }); });
  var heroH = 0;
  var parallax = $$("[data-parallax]");
  var rows = $$("[data-marquee]");
  var fills = $$("[data-fill]").map(function (g) { return { g: g, lines: $$(".fl", g) }; });
  var scards = $$(".scard");
  var footer = document.querySelector(".site-footer");
  var hs = $$(".hscroll").map(function (sec) {
    return { sec: sec, track: sec.querySelector(".hscroll-track"), bar: sec.querySelector(".hs-bar i"), cards: $$(".hcard", sec), dist: 0, on: false, top: 0 };
  });

  /* Night sky */
  var sky = document.querySelector(".sky"), ctx = null, stars = [], sw = 0, sh = 0, dpr = Math.min(2, window.devicePixelRatio || 1), twinkleEnd = 0;
  function buildSky() {
    if (!sky) return;
    ctx = sky.getContext("2d"); if (!ctx) return;
    var r = sky.getBoundingClientRect(); sw = r.width; sh = r.height;
    sky.width = Math.round(sw * dpr); sky.height = Math.round(sh * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(clamp(sw * sh / 5200, 50, 260)); stars = [];
    for (var i = 0; i < n; i++) {
      var z = Math.random();
      stars.push({ x: Math.random() * sw, y: Math.random() * sh * 1.5, r: 0.3 + z * z * 1.5, z: z, a: 0.2 + Math.random() * 0.65, ph: Math.random() * 6.28, gold: Math.random() < 0.07 });
    }
  }
  function drawSky(t) {
    if (!ctx) return;
    var y = window.scrollY, span = sh * 1.5;
    ctx.clearRect(0, 0, sw, sh);
    var amp = t ? clamp((twinkleEnd - t) / 1200, 0, 1) : 0;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var py = s.y - (reduced() ? 0 : y * (0.08 + s.z * 0.35));
      py = ((py % span) + span) % span;
      if (py > sh + 4) continue;
      var a = s.a * (1 - amp * 0.5 + amp * 0.5 * Math.sin(t * 0.004 + s.ph));
      ctx.globalAlpha = a; ctx.fillStyle = s.gold ? "#feca34" : "#ffffff";
      ctx.beginPath(); ctx.arc(s.x, py, s.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function twinkle() {
    if (!ctx || reduced()) { drawSky(0); return; }
    twinkleEnd = performance.now() + 4200;
    (function frame(t) { drawSky(t); if (t < twinkleEnd) requestAnimationFrame(frame); else drawSky(0); })(performance.now());
  }

  /* Layout measurements */
  function layout() {
    if (hero) { heroH = hero.offsetHeight; root.style.setProperty("--hero-top", Math.min(0, window.innerHeight - heroH) + "px"); }
    if (footer) footer.classList.toggle("no-curtain", footer.offsetHeight > window.innerHeight - 24);
    hs.forEach(function (h) {
      var on = wideMq.matches && !reduced();
      h.on = on; h.sec.classList.toggle("is-pinned", on);
      h.track.style.transform = "";
      h.cards.forEach(function (c) { c.style.transform = ""; });
      if (!on) { h.sec.style.height = ""; return; }
      var last = h.cards[h.cards.length - 1];
      var gutter = parseFloat(getComputedStyle(h.track).paddingLeft) || 24;
      var trackLeft = h.track.getBoundingClientRect().left;
      h.left0 = trackLeft;
      h.dist = Math.max(0, trackLeft + last.offsetLeft + last.offsetWidth + Math.min(gutter, 64) - window.innerWidth);
      h.sec.style.height = (window.innerHeight + h.dist) + "px";
      h.top = h.sec.getBoundingClientRect().top + window.scrollY;
      var pin = h.sec.querySelector(".hscroll-pin");
      if (pin && pin.scrollHeight > pin.clientHeight + 4) {
        h.on = false; h.sec.classList.remove("is-pinned"); h.sec.style.height = ""; h.track.style.transform = "";
      }
    });
    $$(".stack-cards").forEach(function (list) {
      list.classList.remove("flat");
      var cards = $$(".scard", list), tooTall = false;
      cards.forEach(function (c) { var t = parseFloat(getComputedStyle(c).top) || 0; if (c.offsetHeight > window.innerHeight - t - 16) tooTall = true; });
      list.classList.toggle("flat", tooTall);
    });
    buildSky();
  }

  /* Keep keyboard focus visible inside the pinned rail */


  /* Everything that follows the scroll */
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight, still = reduced();
    headerState(false);
    var max = document.documentElement.scrollHeight - vh, p = max > 0 ? clamp(y / max, 0, 1) : 0;
    if (bar) bar.style.transform = "scaleX(" + p + ")";
    if (toTop) { toTop.classList.toggle("show", y > vh); toTop.style.setProperty("--p", p.toFixed(3)); }

    if (hero && heroInner) {
      if (still) { heroInner.style.transform = ""; heroInner.style.opacity = ""; if (heroStar) heroStar.style.transform = ""; if (heroMedia) heroMedia.style.transform = ""; if (heroGlow) heroGlow.style.transform = ""; hero.style.setProperty("--dawn", 0); }
      else if (y < heroH * 1.6 + vh) {
        var hp = clamp((y - Math.max(0, heroH - vh)) / Math.max(1, Math.min(heroH, vh)), 0, 1);
        heroInner.style.transform = "translate3d(0," + (hp * 90).toFixed(1) + "px,0) scale(" + (1 - hp * 0.07).toFixed(4) + ")";
        heroInner.style.opacity = (1 - hp * 0.9).toFixed(3);
        if (heroStar) heroStar.style.transform = "translate3d(0," + (-hp * 140).toFixed(1) + "px,0) scale(" + (1 + hp * 0.8).toFixed(3) + ")";
        if (heroMedia) heroMedia.style.transform = "translate3d(0," + (hp * 70).toFixed(1) + "px,0) scale(" + (1 + hp * 0.14).toFixed(4) + ")";
        if (heroGlow) heroGlow.style.transform = "translate3d(" + (-hp * 80).toFixed(1) + "px," + (hp * 120).toFixed(1) + "px,0) scale(" + (1 + hp * 0.35).toFixed(3) + ")";
        hero.style.setProperty("--dawn", hp.toFixed(3));
        drawSky(0);
      }
    }

    hs.forEach(function (h) {
      if (!h.on) return;
      var r = h.sec.getBoundingClientRect();
      var hp = clamp(-r.top / Math.max(1, h.dist), 0, 1);
      h.track.style.transform = "translate3d(" + (-hp * h.dist).toFixed(1) + "px,0,0)";
      if (h.bar) h.bar.style.transform = "scaleX(" + hp.toFixed(4) + ")";
      var vw = window.innerWidth;
      h.cards.forEach(function (c) {
        var cr = c.getBoundingClientRect(), d = clamp((cr.left + cr.width / 2 - vw / 2) / vw, -1.2, 1.2);
        c.style.transform = "translate3d(0," + (d * d * 70).toFixed(1) + "px,0) rotate(" + (d * 4).toFixed(2) + "deg)";
      });
    });

    for (var i = 0; i < scards.length; i++) {
      var c = scards[i], n = scards[i + 1];
      if (!n || still || c.parentElement.classList.contains("flat")) { c.style.transform = ""; continue; }
      var cr = c.getBoundingClientRect(), nr = n.getBoundingClientRect();
      var sp = clamp(1 - (nr.top - cr.top) / Math.max(1, c.offsetHeight), 0, 1);
      c.style.transform = "scale(" + (1 - sp * 0.07).toFixed(4) + ")";
    }

    statements.forEach(function (s) {
      var r = s.getBoundingClientRect();
      var sp = still ? 1 : clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1);
      var lit = Math.round(sp * s._w.length);
      s._w.forEach(function (w, k) { w.classList.toggle("lit", k < lit); });
    });

    rows.forEach(function (row) {
      if (still) { row.style.transform = ""; return; }
      var b = row.parentElement.getBoundingClientRect(), dir = parseFloat(row.getAttribute("data-marquee")) || 1;
      var off = (vh - b.top) * 0.32;
      row.style.transform = "translate3d(" + (dir > 0 ? off - row.scrollWidth * 0.3 : -off).toFixed(1) + "px,0,0)";
    });

    fills.forEach(function (f) {
      var r = f.g.getBoundingClientRect();
      var fp = still ? 1 : clamp((vh * 0.9 - r.top) / (r.height + vh * 0.25), 0, 1);
      var n = f.lines.length;
      f.lines.forEach(function (l, k) { l.style.setProperty("--f", (clamp(fp * n - k, 0, 1) * 100).toFixed(1) + "%"); });
    });

    parallax.forEach(function (el) {
      if (still) { el.style.transform = ""; return; }
      var r = el.getBoundingClientRect(), speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
      el.style.transform = "translate3d(0," + ((r.top + r.height / 2 - vh / 2) * -speed).toFixed(1) + "px,0)";
    });
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  var resizeT = null;
  window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(function () { layout(); onScroll(); }, 120); });
  if (wideMq.addEventListener) wideMq.addEventListener("change", function () { layout(); onScroll(); });

  function applyMode() {
    if (reduced()) { if (io) io.disconnect(); revealAll(); }
    layout(); onScroll(); drawSky(0);
  }

  if (toTop) toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
    var main = document.getElementById("main"); if (main) main.focus({ preventScroll: true });
  });

  /* Buttons: fill follows the pointer, with a gentle magnetic pull */
  $$(".btn").forEach(function (b) {
    function origin(e) { var r = b.getBoundingClientRect(); b.style.setProperty("--mx", (e.clientX - r.left) + "px"); b.style.setProperty("--my", (e.clientY - r.top) + "px"); return r; }
    b.addEventListener("pointerenter", origin);
    if (!finePointer) return;
    b.addEventListener("pointermove", function (e) {
      var r = origin(e); if (reduced()) return;
      var dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      b.style.transform = "translate(" + (dx * 10).toFixed(1) + "px," + (dy * 8).toFixed(1) + "px)";
    });
    b.addEventListener("pointerleave", function (e) { origin(e); b.style.transform = ""; });
  });

  if ("ResizeObserver" in window) {
    var roT = null, sizes = new WeakMap();
    var ro = new ResizeObserver(function (entries) {
      var changed = entries.some(function (en) { var h = Math.round(en.contentRect.height), w = Math.round(en.contentRect.width), k = sizes.get(en.target); sizes.set(en.target, h + "x" + w); return k !== undefined && k !== h + "x" + w; });
      if (!changed) return;
      clearTimeout(roT); roT = setTimeout(function () { layout(); onScroll(); }, 150);
    });
    [hero, footer].concat($$(".hscroll-pin > *"), $$(".hcard"), $$(".scard")).forEach(function (el) { if (el) ro.observe(el); });
  }

  /* Never leave a focused element hidden behind the sliding sheet, the footer curtain, or the header */
  var sheet = document.querySelector(".sheet");
  function covered(el) {
    var r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return true;
    var x = clamp(r.left + Math.min(r.width / 2, 20), 1, window.innerWidth - 1), y = clamp(r.top + Math.min(r.height / 2, 12), 1, window.innerHeight - 1);
    var top = document.elementFromPoint(x, y);
    return !(top && (el === top || el.contains(top) || top.contains(el)));
  }
  function railFor(el) { for (var k = 0; k < hs.length; k++) if (hs[k].on && hs[k].track.contains(el)) return hs[k]; return null; }
  function revealRailCard(h, el) {
    var card = el.closest(".hcard"); if (!card || !h.dist) return;
    var center = h.left0 + card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2;
    window.scrollTo({ top: h.top + clamp(center / h.dist, 0, 1) * h.dist, behavior: "instant" });
  }
  function unhide(el) {
    if (!el || el === document.body || el.id === "main" || !document.contains(el)) return;
    if (header && header.contains(el)) return;
    var h = railFor(el);
    if (h) { revealRailCard(h, el); return; }
    if (hero && hero.contains(el)) {
      if (covered(el)) { window.scrollTo({ top: 0, behavior: "instant" }); el.scrollIntoView({ block: "nearest", behavior: "instant" }); }
      return;
    }
    if (footer && footer.contains(el)) {
      if (!footer.classList.contains("no-curtain") && covered(el)) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
      if (covered(el)) el.scrollIntoView({ block: "nearest", behavior: "instant" });
      return;
    }
    if (covered(el)) el.scrollIntoView({ block: "center", behavior: "instant" });
  }
  /* Focus from a click or tap is already where the pointer is. Rescuing it would scroll the page under the pointer, for example mid drag on the contact map. */
  function keyboardFocus(el) { try { return el.matches(":focus-visible"); } catch (e) { return true; } }
  document.addEventListener("focusin", function (e) {
    var el = e.target;
    if (!keyboardFocus(el)) return;
    /* Run after the browser finishes its own scroll-into-view, then once more after scroll effects settle */
    requestAnimationFrame(function () { unhide(el); requestAnimationFrame(function () { onScroll(); setTimeout(function () { if (document.activeElement === el) unhide(el); }, 60); }); });
  });

  layout(); onScroll(); twinkle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); onScroll(); });
  window.addEventListener("load", function () { layout(); onScroll(); });

  /* Contact form: accessible validation. Add data-endpoint to the form (for example a Formspree URL) to enable sending. */
  var form = document.getElementById("contact-form");
  if (form) {
    var status = document.getElementById("form-status");
    var rules = {
      "cf-name": function (v) { return v.trim() ? "" : "Enter your full name."; },
      "cf-phone": function (v) { return /\d{3}.*\d{3}.*\d{4}/.test(v) ? "" : "Enter a phone number with area code, for example (323) 555-0100."; },
      "cf-email": function (v) { return !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter an email address in the format name@example.com."; },
      "cf-relationship": function (v) { return v ? "" : "Choose who the care is for."; }
    };
    var check = function (id) {
      var el = document.getElementById(id), msg = rules[id](el.value);
      document.getElementById(id + "-error").textContent = msg;
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      return !msg;
    };
    Object.keys(rules).forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener("blur", function () { if (el.getAttribute("aria-invalid") === "true" || el.value) check(id); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault(); status.hidden = true;
      var bad = Object.keys(rules).filter(function (id) { return !check(id); });
      if (bad.length) {
        status.className = "form-status bad";
        status.textContent = bad.length === 1 ? "1 field needs attention." : bad.length + " fields need attention.";
        status.hidden = false; document.getElementById(bad[0]).focus(); return;
      }
      var endpoint = form.getAttribute("data-endpoint"), sendBtn = form.querySelector("[type=submit]");
      if (!endpoint) {
        status.className = "form-status bad";
        status.textContent = "Online messages are not available yet. Please call us at (323) 282-7679, any time of day.";
        status.hidden = false; status.focus(); return;
      }
      sendBtn.disabled = true;
      fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(); form.reset(); status.className = "form-status ok"; status.textContent = "Thank you. Your message was sent. A member of our team will contact you soon."; })
        .catch(function () { status.className = "form-status bad"; status.textContent = "Your message could not be sent. Please call us at (323) 282-7679."; })
        .finally(function () { status.hidden = false; status.focus(); sendBtn.disabled = false; });
    });
  }
})();

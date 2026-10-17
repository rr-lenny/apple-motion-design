// Moteur d'animation déterministe : renderAt(t) calcule l'état de chaque élément
// à l'instant t (en secondes). L'aperçu le rejoue en temps réel ; le rendu vidéo
// l'appelle pour chaque image à 60 fps.
(function () {
  const C = window.SHORT_CONFIG;
  const D = C.demo;
  const E = C.end;
  const $ = (s) => document.querySelector(s);

  const root = document.documentElement.style;
  root.setProperty("--bg", C.colors.bg);
  root.setProperty("--ink", C.colors.ink);
  root.setProperty("--accent", C.colors.accent);
  $("#ctaText").textContent = C.cta;

  // ---------- Easing ----------
  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (u) => ((ax * u + bx) * u + cx) * u;
    const sy = (u) => ((ay * u + by) * u + cy) * u;
    const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let u = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(u) - x;
        if (Math.abs(e) < 1e-6) break;
        const d = dx(u);
        if (Math.abs(d) < 1e-6) break;
        u -= e / d;
      }
      return sy(u);
    };
  }
  const easeOut = cubicBezier(0.22, 1, 0.36, 1);
  const easeIn = cubicBezier(0.55, 0, 1, 0.45);
  const easeInOut = cubicBezier(0.65, 0, 0.35, 1);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, p) => a + (b - a) * p;

  // Ressort amorti : un seul petit rebond (~9 % de dépassement), stabilisé en ~0,6 s.
  function spring(t) {
    if (t <= 0) return 0;
    const z = 0.6, w = 11.5, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }

  // Apparition d'un visuel : échelle 0,9 → 1 en ressort, flou → net, opacité 0 → 1.
  function appear(t, t0) {
    return {
      k: spring(t - t0),
      o: easeOut(prog(t, t0, 0.3)),
      b: 16 * (1 - easeOut(prog(t, t0, 0.4))),
    };
  }
  // Sortie : fondu + flou.
  const leave = (t, t0, dur = 0.35) => easeIn(prog(t, t0, dur));

  function style(el, { x = 0, y = 0, s = 1, r = 0, o = 1, b = 0 }) {
    if (o <= 0.001) {
      el.style.visibility = "hidden";
      return;
    }
    el.style.visibility = "visible";
    el.style.opacity = o.toFixed(4);
    el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`;
    el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
  }

  // ---------- Captions ----------
  const captions = $("#captions");
  const phrases = C.phrases.map((p) => {
    const el = document.createElement("div");
    el.className = "phrase";
    if (p.size) el.style.fontSize = p.size + "px";
    let inKey = false;
    const words = p.text.split(/\s+/).map((raw) => {
      let w = raw;
      const opens = w.startsWith("*");
      if (opens) { inKey = true; w = w.slice(1); }
      const isKey = inKey;
      if (w.endsWith("*")) { inKey = false; w = w.slice(0, -1); }
      const span = document.createElement("span");
      span.className = "w" + (isKey ? " key" : "");
      span.textContent = w;
      el.appendChild(span);
      return span;
    });
    captions.appendChild(el);
    return { ...p, el, words };
  });

  const CENTER_Y = C.height / 2;
  const TOP_Y = 560; // tiers supérieur, dans la zone sûre

  function captionY(t) {
    if (t >= D.exit + 0.35) return CENTER_Y;
    return lerp(CENTER_Y, TOP_Y, easeOut(prog(t, D.rise, 0.7)));
  }

  function renderCaptions(t) {
    const cy = captionY(t);
    for (const p of phrases) {
      if (t < p.start || t >= p.end + (p.final ? 1 : 0)) {
        p.el.style.display = "none";
        continue;
      }
      p.el.style.display = "flex";
      p.el.style.top = `${cy - p.el.offsetHeight / 2}px`;
      const out = p.final ? 0 : easeIn(prog(t, p.end - 0.2, 0.2));
      p.words.forEach((w, i) => {
        const e = easeOut(prog(t, p.start + i * 0.06, 0.35));
        style(w, {
          y: 20 * (1 - e) - 6 * out,
          s: 0.96 + 0.04 * e,
          o: e * (1 - out),
          b: 16 * (1 - e) + 10 * out,
        });
      });
    }
  }

  // ---------- Démo ----------
  const folder = $("#folder"), glass = $("#glass"), btn = $("#btn");
  const ripple = $("#ripple"), pill = $("#pill"), demo = $("#demo");
  const cards = [
    { el: $("#cardA"), r: -13, dx: -40, order: 0 },
    { el: $("#cardB"), r: 0, dx: 0, order: 1 },
    { el: $("#cardC"), r: 11, dx: 40, order: 2 },
  ];

  function renderDemo(t) {
    const visible = t >= D.in - 0.01 && t < D.exit + 0.6;
    demo.style.display = visible ? "block" : "none";
    if (!visible) return;

    // Flottement global + zoom doux sur la fin de la démo.
    const zoom = 0.86 + 0.03 * easeInOut(prog(t, D.spread, 1.4));
    const fy = Math.sin((t * 2 * Math.PI) / 3.4) * 10;
    demo.style.transform = `translateY(${fy.toFixed(2)}px) scale(${zoom.toFixed(4)})`;

    const outAt = (i) => leave(t, D.exit + i * 0.04);

    // Dossier (fond)
    {
      const a = appear(t, D.in), q = outAt(3);
      style(folder, { y: 40 * (1 - a.k), s: lerp(0.9, 1, a.k), o: a.o * (1 - q), b: a.b + 20 * q });
    }

    // Cartes en éventail, en cascade de 100 ms
    const spread = easeInOut(prog(t, D.spread, 1.2));
    const lift = spring(t - D.highlight);
    cards.forEach((c, i) => {
      const a = appear(t, D.cards + c.order * 0.1);
      const q = outAt(c.order);
      const px = Math.sin((t * 2 * Math.PI) / 2.9 + i * 1.3) * 7;
      const py = Math.sin((t * 2 * Math.PI) / 3.1 + i * 2.1) * 8;
      const pr = Math.sin((t * 2 * Math.PI) / 4.1 + i) * 0.6;
      const isCenter = c.order === 1;
      style(c.el, {
        x: lerp(0, c.dx * 0.4, a.k) + c.dx * 0.7 * spread + px,
        y: lerp(160, 0, a.k) + py + (isCenter ? -40 * lift : 12 * lift) - 20 * spread,
        r: lerp(0, c.r, a.k) * (1 + 0.35 * spread) + pr,
        s: lerp(0.9, 1, a.k) * (isCenter ? 1 + 0.035 * lift : 1),
        o: Math.min(1, a.o * 1.4) * (1 - q),
        b: a.b + 20 * q,
      });
    });

    // Panneau en verre dépoli + bouton
    {
      const a = appear(t, D.in + 0.1), q = outAt(0);
      const gy = Math.sin((t * 2 * Math.PI) / 3.4 + 1.5) * 4;
      style(glass, { y: 30 * (1 - a.k) + gy, s: lerp(0.9, 1, a.k), o: a.o * (1 - q), b: a.b + 20 * q });

      const ab = appear(t, D.in + 0.25);
      let press = 1;
      if (t >= D.press && t < D.press + 0.08) press = lerp(1, 0.86, (t - D.press) / 0.08);
      else if (t >= D.press + 0.08) press = 0.86 + 0.14 * spring(t - D.press - 0.08);
      style(btn, { y: 30 * (1 - ab.k) + gy, s: lerp(0.9, 1, ab.k) * press, o: ab.o * (1 - q), b: ab.b + 20 * q });

      const rp = prog(t, D.press + 0.04, 0.7);
      style(ripple, { y: gy, s: 1 + 0.9 * easeOut(rp), o: rp > 0 && rp < 1 ? 0.6 * (1 - rp) : 0 });

      const ap = appear(t, D.press + 0.15);
      style(pill, { y: 20 * (1 - ap.k) + gy, s: lerp(0.9, 1, ap.k), o: ap.o * (1 - q), b: ap.b + 20 * q });
    }
  }

  // ---------- Fin : logo + CTA ----------
  const logo = $("#logo"), cta = $("#cta");
  function renderEnd(t) {
    const a = appear(t, E.logo);
    const fy = Math.sin((t * 2 * Math.PI) / 3.2) * 6;
    style(logo, { y: 30 * (1 - a.k) + fy, s: lerp(0.9, 1, a.k), o: a.o, b: a.b });

    const c = appear(t, E.button);
    const pulse = 1 + 0.015 * Math.sin(((t - E.button) * 2 * Math.PI) / 1.0); // calé sur 2 temps
    style(cta, {
      x: -cta.offsetWidth / 2,
      y: 30 * (1 - c.k) + fy * 0.5,
      s: lerp(0.9, 1, c.k) * (t > E.button + 0.8 ? pulse : 1),
      o: c.o,
      b: c.b,
    });
  }

  // ---------- Scène ----------
  const scene = $("#scene");
  function renderAt(t) {
    // Hook : zoom doux d'entrée sur les deux premières secondes.
    const z = lerp(1.06, 1, easeOut(prog(t, 0, 1.8)));
    scene.style.transform = `scale(${z.toFixed(4)})`;
    renderDemo(t);
    renderEnd(t);
    renderCaptions(t);
  }
  window.renderAt = renderAt;

  // ---------- Aperçu ----------
  const params = new URLSearchParams(location.search);
  const stage = $("#stage");
  if (params.has("render")) {
    document.body.classList.add("render");
    renderAt(0);
    return;
  }
  function fit() {
    const s = Math.min(innerWidth / C.width, innerHeight / C.height);
    stage.style.transform = `translate(${(innerWidth - C.width * s) / 2}px, ${(innerHeight - C.height * s) / 2}px) scale(${s})`;
  }
  addEventListener("resize", fit);
  fit();

  const hud = $("#hud");
  let t0 = performance.now() - (parseFloat(params.get("t")) || 0) * 1000;
  let paused = false, pausedAt = 0;
  addEventListener("keydown", (e) => {
    if (e.key === " ") {
      paused = !paused;
      if (paused) pausedAt = (performance.now() - t0) / 1000;
      else t0 = performance.now() - pausedAt * 1000;
    }
    if (e.key === "s") document.body.classList.toggle("show-safe");
  });
  (function loop() {
    const t = paused ? pausedAt : ((performance.now() - t0) / 1000) % C.duration;
    renderAt(t);
    hud.textContent = `${t.toFixed(2)} s · espace : pause · s : zone sûre`;
    requestAnimationFrame(loop);
  })();
})();

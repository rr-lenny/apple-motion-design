/*
 * Lumen — Apple-style motion short (1080×1920)
 *
 * Every frame is a pure function of time: renderAt(t) sets the style of each
 * element. That makes the piece scrubbable in the browser and lets
 * scripts/render.mjs capture it frame-by-frame, deterministically.
 */
(() => {
  const DURATION = 24;

  /* ── Math & easing ───────────────────────────────────────────── */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const ease = {
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    outQuint: (x) => 1 - Math.pow(1 - x, 5),
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  };
  // Damped spring, 0 → 1 with a soft overshoot (Apple-like).
  const spring = (x, { freq = 1.6, damping = 0.62 } = {}) => {
    if (x <= 0) return 0;
    const w = 2 * Math.PI * freq;
    const wd = w * Math.sqrt(1 - damping * damping);
    return 1 - Math.exp(-damping * w * x) * (Math.cos(wd * x) + ((damping * w) / wd) * Math.sin(wd * x));
  };
  // Deterministic pseudo random.
  const rand = (i) => {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  /* ── Style writer ────────────────────────────────────────────── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function set(el, { o = 1, x = 0, y = 0, s = 1, sx = 1, sy = 1, r = 0, b = 0, rx = 0, ry = 0, p = 1800 } = {}) {
    if (o <= 0.002) {
      el.style.visibility = 'hidden';
      return;
    }
    el.style.visibility = 'visible';
    el.style.opacity = o >= 0.999 ? '' : o.toFixed(4);
    let tf = '';
    if (rx || ry) tf += `perspective(${p}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) `;
    if (x || y) tf += `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) `;
    if (r) tf += `rotate(${r.toFixed(3)}deg) `;
    if (s !== 1 || sx !== 1 || sy !== 1) tf += `scale(${(s * sx).toFixed(4)}, ${(s * sy).toFixed(4)})`;
    el.style.transform = tf;
    el.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : '';
  }
  const showScene = (el, on) => (el.style.display = on ? '' : 'none');

  /* Blur-in / blur-out building blocks, combined into one state. */
  function blurIn(t, t0, { dur = 1.0, y = 70, b = 34, s = 1.0, x = 0 } = {}) {
    const k = prog(t, t0, dur);
    const m = ease.outExpo(k);
    return {
      o: ease.outCubic(clamp(k * 2.2)),
      y: y * (1 - m),
      x: x * (1 - m),
      b: b * (1 - ease.outCubic(clamp(k * 1.4))),
      s: lerp(s, 1, m),
    };
  }
  function blurOut(t, t1, { dur = 0.55, y = -50, b = 30, s = 1.0, x = 0 } = {}) {
    const k = ease.inCubic(prog(t, t1, dur));
    return { o: 1 - k, y: y * k, x: x * k, b: b * k, s: lerp(1, s, k) };
  }
  const mix = (...st) =>
    st.reduce(
      (a, c) => ({ o: a.o * (c.o ?? 1), x: a.x + (c.x || 0), y: a.y + (c.y || 0), b: a.b + (c.b || 0), s: a.s * (c.s ?? 1), r: a.r + (c.r || 0), rx: a.rx + (c.rx || 0) }),
      { o: 1, x: 0, y: 0, b: 0, s: 1, r: 0, rx: 0 }
    );
  const inOut = (t, t0, t1, inOpt, outOpt) => mix(blurIn(t, t0, inOpt), blurOut(t, t1, outOpt));

  /* ── Build dynamic DOM ───────────────────────────────────────── */
  const LOGO_SVG = `<svg viewBox="0 0 100 100">
      <path d="M22 38 C 36 24, 50 52, 78 30" style="opacity:.55"/>
      <path d="M22 56 C 36 42, 50 70, 78 48"/>
      <path d="M22 74 C 36 60, 50 88, 78 66" style="opacity:.55"/>
    </svg>`;
  $('#logoB').innerHTML = LOGO_SVG;
  $('#logoG').innerHTML = LOGO_SVG;

  const CHIPS = [
    { t: '12 new messages', c: '#30d158', i: '✉', badge: '12' },
    { t: 'Standup in 5 min', c: '#ff9f0a', i: '◷' },
    { t: 'Deadline moved', c: '#ff453a', i: '!' },
    { t: '@you in #launch', c: '#5e5ce6', i: '@' },
    { t: 'Build failed', c: '#ff375f', i: '×' },
    { t: '3 unread threads', c: '#0a84ff', i: '≡', badge: '3' },
    { t: 'Invoice overdue', c: '#bf5af2', i: '$' },
    { t: 'Review requested', c: '#64d2ff', i: '↗' },
    { t: 'New comment', c: '#ffd60a', i: '“' },
  ];
  // Hand-placed so nothing covers the headline; depth drives blur & scale.
  const CHIP_POS = [
    { x: 110, y: 330, d: 0.1 },
    { x: 560, y: 470, d: 0.5 },
    { x: 60, y: 580, d: 0.85 },
    { x: 600, y: 1240, d: 0.05 },
    { x: 90, y: 1360, d: 0.45 },
    { x: 520, y: 1520, d: 0.8 },
    { x: 140, y: 1640, d: 0.15 },
    { x: 650, y: 250, d: 0.9 },
    { x: 380, y: 1120, d: 0.95 },
  ];
  const chipWrap = $('#chips');
  const chipEls = CHIPS.map((c) => {
    const el = document.createElement('div');
    el.className = 'chip';
    el.innerHTML = `<span class="dot" style="background:${c.c}">${c.i}</span>${c.t}${c.badge ? `<span class="badge">${c.badge}</span>` : ''}`;
    chipWrap.appendChild(el);
    return el;
  });

  const BAR_H = [0.38, 0.52, 0.45, 0.68, 0.6, 0.82, 1.0];
  const barWrap = $('#bars');
  const barEls = BAR_H.map((h, i) => {
    const el = document.createElement('div');
    el.className = 'bar' + (i === BAR_H.length - 1 ? ' hi' : '');
    barWrap.appendChild(el);
    return el;
  });

  /* ── Element refs ────────────────────────────────────────────── */
  const el = {
    bgLight: $('#bgLight'),
    auroras: $$('.aurora'),
    glow: $('#glowDark'),
    fade: $('#fade'),
    A: $('#sceneA'), aWords: $$('#aHead .w'), aHead: $('#aHead'), spark: $('#spark'),
    B: $('#sceneB'), logoB: $('#logoB'), bWords: $$('#bTitle .w'),
    C: $('#sceneC'), cBlock: $('#cBlock'), c1: $('#c1'), c2: $('#c2'), slot: $$('#c3 .slot-w'),
    D: $('#sceneD'), card: $('#card'), caps: [$('#capPlan'), $('#capTrack'), $('#capShip')],
    tasks: $$('#tasks .task'), focusVal: $('#focusVal'), ringFg: $('#ringFg'), ringVal: $('#ringVal'),
    chipUp: $('#chipUp'), touch: $('#touch'), ripple: $('#ripple'), toast: $('#toast'),
    E: $('#sceneE'), eEyebrow: $('#eEyebrow'), eNum: $('#eNum'), eSub: $('#eSub'),
    F: $('#sceneF'), fWords: $$('#fTitle .w'), fCards: $$('#grid .fcard'),
    G: $('#sceneG'), logoG: $('#logoG'), gWord: $('#gWord'), gTag: $('#gTag'), gCta: $('#gCta'), gUrl: $('#gUrl'),
  };

  /* ── Scenes ──────────────────────────────────────────────────── */

  // A · 0 → 3.4s — "Work is noisy." + notification chaos, then implosion.
  function sceneA(t) {
    const on = t < 3.6;
    showScene(el.A, on);
    if (!on) return;

    const suck = ease.inExpo(prog(t, 2.55, 0.6)); // implosion
    const focus = clamp((t - 1.1) / 1.2) * (1 - suck); // headline defocus while chips pile up

    el.aWords.forEach((w, i) => {
      const st = blurIn(t, 0.15 + i * 0.22, { y: 90, b: 40, s: 1.08 });
      set(w, { ...st, b: st.b + focus * 5 + suck * 40, s: st.s * lerp(1, 0.35, suck), o: st.o * (1 - suck), y: st.y + (i < 2 ? 90 : -90) * suck });
    });

    chipEls.forEach((c, i) => {
      const p = CHIP_POS[i];
      const t0 = 0.95 + i * 0.13;
      const k = t - t0;
      const sp = spring(k, { freq: 1.9, damping: 0.55 });
      const depthScale = lerp(1.05, 0.72, p.d);
      const drift = Math.max(0, k) * lerp(26, 8, p.d);
      const dirX = p.x < 400 ? -1 : 1;
      const tx = p.x + dirX * drift * 0.4;
      const ty = p.y - drift + 40 * (1 - sp);
      // pull to centre
      const cx = 540 - 220, cy = 960 - 50;
      const x = lerp(tx, cx, suck);
      const y = lerp(ty, cy, suck);
      set(c, {
        o: clamp(k * 5) * (1 - ease.inCubic(prog(t, 2.75, 0.4))),
        x, y,
        s: depthScale * lerp(0.6, 1, sp) * lerp(1, 0.15, suck),
        b: lerp(0, 11, p.d) + (1 - clamp(k * 3)) * 18 + suck * 30,
        r: (rand(i) - 0.5) * 8 * (1 - suck),
      });
    });

    // Spark that blooms into the light world
    const sIn = ease.outExpo(prog(t, 2.85, 0.5));
    const sOut = ease.inCubic(prog(t, 3.15, 0.35));
    set(el.spark, { o: sIn * (1 - sOut), s: lerp(0.1, 2.2, sIn) + sOut * 6, b: sOut * 20 });
  }

  // Background: dark → light via circular reveal (3.05s), light → dark (13.4s).
  function backgrounds(t) {
    const r = ease.inOutCubic(prog(t, 3.0, 0.75)) * 1150;
    const toDark = ease.inOutCubic(prog(t, 13.45, 0.6));
    const lightOn = t > 3.0 && toDark < 1;
    el.bgLight.style.display = lightOn ? '' : 'none';
    if (lightOn) {
      el.bgLight.style.clipPath = r < 1149 ? `circle(${r.toFixed(1)}px at 540px 960px)` : '';
      el.bgLight.style.opacity = (1 - toDark).toFixed(4);
      const [a1, a2, a3] = el.auroras;
      set(a1, { x: Math.sin(t * 0.6) * 120, y: Math.cos(t * 0.5) * 90 });
      set(a2, { x: Math.cos(t * 0.45) * 140, y: Math.sin(t * 0.55) * 120 });
      set(a3, { x: Math.sin(t * 0.5 + 1) * 120, y: Math.cos(t * 0.4) * 100 });
    }

    // Dark glow for the stat & end card
    const gE = prog(t, 13.8, 1.0) * (1 - prog(t, 16.6, 0.5));
    const gG = ease.outCubic(prog(t, 20.6, 1.2)) * (1 - prog(t, 23.2, 0.7));
    const g = Math.max(gE, gG * 0.7);
    set(el.glow, { o: g * (0.75 + 0.25 * Math.sin(t * 2.2)), s: 1 + 0.06 * Math.sin(t * 1.3), r: t * 6, b: 0 });

    set(el.fade, { o: ease.inCubic(prog(t, 23.35, 0.65)) });
  }

  // B · 3.2 → 6.2s — "Meet Lumen."
  function sceneB(t) {
    const on = t > 3.1 && t < 6.6;
    showScene(el.B, on);
    if (!on) return;

    const k = t - 3.3;
    const sp = spring(k, { freq: 1.25, damping: 0.5 });
    const exit = ease.inOutCubic(prog(t, 5.65, 0.75));
    set(el.logoB, {
      o: clamp(k * 4) * (1 - ease.inCubic(prog(t, 5.95, 0.45))),
      s: lerp(0.3, 1, sp) * lerp(1, 0.42, exit),
      r: lerp(-28, 0, sp),
      b: (1 - clamp(k * 2.5)) * 30 + exit * 10,
      y: lerp(160, 0, ease.outExpo(clamp(k / 1.2))) - exit * 540,
    });
    el.bWords.forEach((w, i) => {
      set(w, inOut(t, 3.95 + i * 0.2, 5.55 + i * 0.06, { y: 80, b: 36 }, { y: -60, b: 30 }));
    });
  }

  // C · 6.1 → 9.0s — kinetic type with a blurred word slot.
  function sceneC(t) {
    const on = t > 6.0 && t < 9.2;
    showScene(el.C, on);
    if (!on) return;

    const exit = ease.inCubic(prog(t, 8.65, 0.5));
    set(el.cBlock, { o: 1 - exit, s: lerp(1, 0.86, exit), b: exit * 28, y: -40 * exit });

    set(el.c1, blurIn(t, 6.1, { y: 120, b: 40 }));
    set(el.c2, blurIn(t, 6.3, { y: 120, b: 40 }));

    const swaps = [6.5, 7.15, 7.6, 8.05]; // in-times for tasks / docs / chats / work
    el.slot.forEach((w, i) => {
      const tin = swaps[i];
      const tout = swaps[i + 1] ?? 99;
      const st = mix(
        blurIn(t, tin, { y: i === 0 ? 120 : 110, b: 36, dur: 0.75 }),
        blurOut(t, tout - 0.06, { y: -110, b: 32, dur: 0.32 })
      );
      if (t < tin) st.o = 0;
      // the final word lands with a little scale pop
      if (i === 3) st.s *= 1 + 0.06 * Math.sin(Math.PI * prog(t, tin, 0.5));
      set(w, st);
    });
  }

  // D · 9.0 → 14.0s — product UI: Plan / Track / Ship.
  const TASK_TIMES = [11.85, 12.25, 12.65];
  // Checkbox centres in stage coordinates (layout offsets ignore transforms).
  let _centres;
  const checkCentres = () => {
    if (_centres) return _centres;
    const stage = $('#stage');
    _centres = el.tasks.map((row) => {
      const c = row.querySelector('.check');
      let x = c.offsetWidth / 2, y = c.offsetHeight / 2, n = c;
      while (n && n !== stage) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x, y };
    });
    return _centres;
  };
  function sceneD(t) {
    const on = t > 8.9 && t < 14.1;
    showScene(el.D, on);
    if (!on) return;

    // Card entrance / exit
    const k = t - 9.0;
    const sp = spring(k, { freq: 1.05, damping: 0.72 });
    const out = ease.inExpo(prog(t, 13.25, 0.6));
    set(el.card, {
      o: clamp(k * 3) * (1 - out),
      y: lerp(1100, 0, sp) - out * 120,
      rx: lerp(38, 0, ease.outCubic(clamp(k / 1.1))),
      s: lerp(1, 1.35, out),
      b: (1 - clamp(k * 2)) * 30 + out * 30,
    });

    // Captions
    const capT = [[9.35, 10.55], [10.65, 11.7], [11.8, 13.15]];
    el.caps.forEach((c, i) => {
      set(c, inOut(t, capT[i][0], capT[i][1], { y: 80, b: 36, s: 0.96 }, { y: -70, b: 30, dur: 0.4 }));
    });

    // Plan — tasks cascade in
    el.tasks.forEach((row, i) => {
      set(row, blurIn(t, 9.55 + i * 0.12, { y: 50, b: 16, dur: 0.9 }));
      const tc = TASK_TIMES[i];
      const fill = spring(t - tc, { freq: 2.2, damping: 0.5 });
      row.style.setProperty('--fill', clamp(fill, 0, 1.2).toFixed(3));
      row.style.setProperty('--draw', (20 * (1 - ease.outCubic(prog(t, tc + 0.08, 0.35)))).toFixed(2));
      row.style.setProperty('--strike', ease.inOutCubic(prog(t, tc + 0.12, 0.4)).toFixed(3));
      row.querySelector('.task-t').style.color = t > tc + 0.1 ? '#a1a1a6' : '';
      row.querySelector('.check').style.transform = `scale(${(1 + 0.18 * Math.sin(Math.PI * prog(t, tc, 0.3))).toFixed(3)})`;
    });

    // Track — bars, ring, counters
    barEls.forEach((b, i) => {
      const g = spring(t - (10.75 + i * 0.07), { freq: 1.6, damping: 0.6 });
      const h = BAR_H[i] * Math.max(0.04, g);
      b.style.transform = `scaleY(${Math.max(0.04, h).toFixed(4)})`;
    });
    const ringK = ease.outQuint(prog(t, 10.8, 1.4));
    el.ringFg.style.strokeDashoffset = (301.6 * (1 - 0.86 * ringK)).toFixed(2);
    el.ringVal.textContent = `${Math.round(86 * ringK)}%`;
    const mins = Math.round(380 * ease.outQuint(prog(t, 10.75, 1.5)));
    el.focusVal.textContent = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
    set(el.chipUp, { ...blurIn(t, 11.2, { y: 0, b: 12, s: 0.6, dur: 0.6 }) });

    // Ship — touch indicator travels to each checkbox
    const pts = checkCentres();
    const start = { x: 760, y: 1900 };
    let pos = start;
    let press = 0;
    for (let i = 0; i < pts.length; i++) {
      const tc = TASK_TIMES[i];
      const from = i === 0 ? start : pts[i - 1];
      const m = ease.inOutCubic(prog(t, tc - (i === 0 ? 0.55 : 0.35), i === 0 ? 0.5 : 0.3));
      if (t >= tc - (i === 0 ? 0.55 : 0.35)) pos = { x: lerp(from.x, pts[i].x, m), y: lerp(from.y, pts[i].y, m) };
      press = Math.max(press, Math.sin(Math.PI * prog(t, tc - 0.06, 0.2)));
    }
    const touchO = clamp((t - 11.3) * 4) * (1 - clamp((t - 12.95) * 4));
    set(el.touch, { o: touchO, x: pos.x, y: pos.y, s: 1 - 0.18 * press });
    const lastTap = TASK_TIMES.filter((tc) => t >= tc).pop();
    if (lastTap) {
      const rk = prog(t, lastTap, 0.5);
      set(el.ripple, { o: (1 - rk) * 0.9, s: 1 + rk * 1.4 });
    } else set(el.ripple, { o: 0 });

    // Toast
    const tk = t - 12.95;
    const tsp = spring(tk, { freq: 1.7, damping: 0.6 });
    set(el.toast, {
      o: clamp(tk * 5) * (1 - ease.inCubic(prog(t, 13.2, 0.35))),
      y: lerp(-120, 0, tsp),
      s: lerp(0.7, 1, tsp),
      b: (1 - clamp(tk * 4)) * 16 + ease.inCubic(prog(t, 13.2, 0.35)) * 20,
    });
  }

  // E · 14.0 → 17.0s — the stat.
  function sceneE(t) {
    const on = t > 13.7 && t < 17.3;
    showScene(el.E, on);
    if (!on) return;
    const out = (d = 0) => blurOut(t, 16.55 + d, { y: -60, b: 36, s: 1.08, dur: 0.45 });
    set(el.eEyebrow, mix(blurIn(t, 14.0, { y: 60, b: 30 }), out(0)));
    const k = t - 14.25;
    const sp = spring(k, { freq: 1.1, damping: 0.62 });
    set(el.eNum, mix({ o: clamp(k * 3), s: lerp(1.9, 1, sp), b: (1 - ease.outCubic(clamp(k / 0.8))) * 60, y: 0 }, out(0.04)));
    el.eNum.style.backgroundPosition = `${(100 - ((t - 14) / 3) * 160).toFixed(2)}% 50%`;
    set(el.eSub, mix(blurIn(t, 14.85, { y: 90, b: 36 }), out(0.08)));
  }

  // F · 17.0 → 20.6s — features grid.
  function sceneF(t) {
    const on = t > 16.9 && t < 20.9;
    showScene(el.F, on);
    if (!on) return;
    const out = ease.inCubic(prog(t, 20.1, 0.5));
    el.fWords.forEach((w, i) => set(w, mix(blurIn(t, 17.0 + i * 0.12, { y: 80, b: 34 }), blurOut(t, 20.05, { y: -60, b: 30, dur: 0.45 }))));
    el.fCards.forEach((c, i) => {
      const k = t - (17.45 + i * 0.11);
      const sp = spring(k, { freq: 1.35, damping: 0.64 });
      const col = i % 2 ? 1 : -1;
      const row = i < 2 ? -1 : 1;
      const float = Math.sin(t * 1.6 + i * 1.3) * 6;
      set(c, {
        o: clamp(k * 3.5) * (1 - out),
        y: lerp(260, 0, sp) + float + row * 120 * out,
        x: col * 140 * out,
        s: lerp(0.85, 1, sp) * lerp(1, 0.9, out),
        rx: lerp(30, 0, ease.outCubic(clamp(k / 0.9))),
        b: (1 - clamp(k * 2.4)) * 26 + out * 30,
      });
    });
  }

  // G · 20.6 → 24s — end card.
  function sceneG(t) {
    const on = t > 20.5;
    showScene(el.G, on);
    if (!on) return;
    const k = t - 20.7;
    const sp = spring(k, { freq: 1.2, damping: 0.52 });
    set(el.logoG, {
      o: clamp(k * 4),
      s: lerp(0.3, 1, sp) * (1 + 0.012 * Math.sin(t * 2)),
      r: lerp(-30, 0, sp),
      b: (1 - clamp(k * 2.5)) * 30,
      y: lerp(140, 0, ease.outExpo(clamp(k / 1.2))),
    });
    set(el.gWord, blurIn(t, 21.05, { y: 80, b: 36 }));
    set(el.gTag, blurIn(t, 21.35, { y: 60, b: 30 }));
    const ck = t - 21.85;
    const csp = spring(ck, { freq: 1.6, damping: 0.58 });
    set(el.gCta, { o: clamp(ck * 4), s: lerp(0.6, 1, csp), b: (1 - clamp(ck * 3)) * 20, y: lerp(40, 0, csp) });
    set(el.gUrl, blurIn(t, 22.15, { y: 30, b: 20 }));
  }

  function renderAt(t) {
    t = clamp(t, 0, DURATION);
    backgrounds(t);
    sceneA(t);
    sceneB(t);
    sceneC(t);
    sceneD(t);
    sceneE(t);
    sceneF(t);
    sceneG(t);
  }

  window.renderAt = renderAt;
  window.DURATION = DURATION;

  /* ── Preview player / render mode ───────────────────────────── */
  const params = new URLSearchParams(location.search);
  if (params.has('render')) {
    document.body.classList.add('render');
    renderAt(Number(params.get('t') || 0));
    return;
  }

  const stage = $('#stage');
  const fit = () => {
    const s = Math.min(window.innerWidth / 1080, (window.innerHeight - 70) / 1920);
    stage.style.transform = `scale(${s})`;
  };
  fit();
  window.addEventListener('resize', fit);

  const scrub = $('#scrub');
  const playBtn = $('#play');
  const timeLbl = $('#time');
  let playing = true;
  let t = Number(params.get('t') || 0);
  let last = performance.now();

  const togglePlay = () => {
    playing = !playing;
    playBtn.textContent = playing ? '❚❚' : '▶';
    last = performance.now();
  };
  playBtn.addEventListener('click', togglePlay);
  window.addEventListener('keydown', (e) => e.code === 'Space' && (e.preventDefault(), togglePlay()));
  scrub.addEventListener('input', () => {
    t = Number(scrub.value) * DURATION;
    if (playing) togglePlay();
  });

  const loop = (now) => {
    if (playing) {
      t += (now - last) / 1000;
      if (t > DURATION) t = 0;
    }
    last = now;
    renderAt(t);
    scrub.value = String(t / DURATION);
    timeLbl.textContent = `${t.toFixed(2)}s`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();

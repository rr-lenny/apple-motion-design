/*
 * Lumen — editorial "Premiere-style" motion short (v2), 1080×1920.
 *
 * Same engine as v1: renderAt(t) is a pure function of time. Collage
 * objects move on a 12 fps "stop-motion" clock, typography and camera on the
 * continuous clock, and the whole cut sits on a 120 BPM grid (0.5 s beats)
 * so scripts/audio-v2.mjs can hit every edit.
 */
(() => {
  const DURATION = 25;
  const FPS_TC = 30; // timecode / grain refresh rate

  /* ── Math ─────────────────────────────────────────────────────── */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, s, d) => clamp((t - s) / d);
  const ease = {
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2),
  };
  const spring = (x, { freq = 1.6, damping = 0.6 } = {}) => {
    if (x <= 0) return 0;
    const w = 2 * Math.PI * freq;
    const wd = w * Math.sqrt(1 - damping * damping);
    return 1 - Math.exp(-damping * w * x) * (Math.cos(wd * x) + ((damping * w) / wd) * Math.sin(wd * x));
  };
  const rand = (i) => {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const step = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps; // stop-motion clock

  /* ── DOM helpers ──────────────────────────────────────────────── */
  const $ = (s) => document.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function set(el, { o = 1, x = 0, y = 0, s = 1, r = 0, b = 0, rx = 0, ry = 0 } = {}) {
    if (o <= 0.002) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = 'visible';
    el.style.opacity = o >= 0.999 ? '' : o.toFixed(4);
    let tf = '';
    if (rx || ry) tf += `perspective(1600px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) `;
    if (x || y) tf += `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) `;
    if (r) tf += `rotate(${r.toFixed(3)}deg) `;
    if (s !== 1) tf += `scale(${s.toFixed(4)})`;
    el.style.transform = tf;
    el.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : '';
  }
  const show = (el, on) => (el.style.display = on ? '' : 'none');
  const stagePos = (node) => {
    const stage = $('#stage');
    let x = node.offsetWidth / 2, y = node.offsetHeight / 2;
    while (node && node !== stage) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
    return { x, y };
  };

  function blurIn(t, t0, { dur = 0.8, y = 60, x = 0, b = 30, s = 1 } = {}) {
    const k = prog(t, t0, dur), m = ease.outExpo(k);
    return { o: ease.outCubic(clamp(k * 2.4)), y: y * (1 - m), x: x * (1 - m), b: b * (1 - ease.outCubic(clamp(k * 1.5))), s: lerp(s, 1, m) };
  }
  function blurOut(t, t1, { dur = 0.4, y = -40, x = 0, b = 26, s = 1 } = {}) {
    const k = ease.inCubic(prog(t, t1, dur));
    return { o: 1 - k, y: y * k, x: x * k, b: b * k, s: lerp(1, s, k) };
  }
  const mix = (...a) => a.reduce((p, c) => ({ o: p.o * (c.o ?? 1), x: p.x + (c.x || 0), y: p.y + (c.y || 0), b: p.b + (c.b || 0), s: p.s * (c.s ?? 1), r: p.r + (c.r || 0) }), { o: 1, x: 0, y: 0, b: 0, s: 1, r: 0 });

  /* ── Generated artwork ────────────────────────────────────────── */
  // Clock dial
  function dialSVG({ hole = false, inner = false } = {}) {
    let s = `<svg viewBox="0 0 1000 1000">`;
    if (!inner) {
      s += `<defs><radialGradient id="en${hole ? 'g' : 'm'}" cx="50%" cy="45%" r="55%"><stop offset=".55" stop-color="#f6f3ec"/><stop offset=".88" stop-color="#ddd7cb"/><stop offset="1" stop-color="#9f998c"/></radialGradient></defs>`;
      s += `<circle cx="500" cy="500" r="498" fill="url(#en${hole ? 'g' : 'm'})"/>`;
      s += `<circle cx="500" cy="500" r="472" fill="none" stroke="#1a1a1a" stroke-width="2"/>`;
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2, l = i % 5 ? 12 : 26;
        const x1 = 500 + Math.sin(a) * 472, y1 = 500 - Math.cos(a) * 472;
        const x2 = 500 + Math.sin(a) * (472 - l), y2 = 500 - Math.cos(a) * (472 - l);
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a1a1a" stroke-width="${i % 5 ? 2 : 4}"/>`;
      }
      for (let n = 1; n <= 12; n++) {
        const a = (n / 12) * 360;
        s += `<text x="500" y="105" transform="rotate(${a} 500 500)" font-family="Instrument Serif" font-size="120" text-anchor="middle" dominant-baseline="central" fill="#141414">${n}</text>`;
      }
      if (hole) s += `<circle cx="500" cy="500" r="275" fill="#080808"/>`;
    } else {
      s += `<circle cx="500" cy="500" r="345" fill="none" stroke="#1a1a1a" stroke-width="2"/>`;
      s += `<circle cx="500" cy="500" r="275" fill="none" stroke="#1a1a1a" stroke-width="3"/>`;
      for (let n = 13; n <= 24; n++) {
        const a = ((n - 12) / 12) * 360;
        s += `<text x="500" y="190" transform="rotate(${a} 500 500)" font-family="Instrument Serif" font-size="48" text-anchor="middle" dominant-baseline="central" fill="#2a2a2a">${n}</text>`;
      }
      s += `<text x="500" y="790" font-family="Space Mono" font-size="18" text-anchor="middle" fill="#555" letter-spacing="4">17 JEWELS</text>`;
    }
    return s + `</svg>`;
  }
  $('#clockOuter').innerHTML = dialSVG();
  $('#clockInner').innerHTML = dialSVG({ inner: true });
  $('#clockGhost').innerHTML = dialSVG({ hole: true });

  // Jigsaw piece path. Edges: 1 = tab out, -1 = blank in, 0 = flat.
  const EDGE = [[0, 0], [72, 0], ['C', 84, 0, 90, 8, 82, 20], ['C', 72, 36, 84, 50, 100, 50], ['C', 116, 50, 128, 36, 118, 20], ['C', 110, 8, 116, 0, 128, 0], [200, 0]];
  function piecePath([top, right, bottom, left]) {
    const sides = [
      { o: [0, 0], d: [1, 0], n: [0, -1], k: top },
      { o: [200, 0], d: [0, 1], n: [1, 0], k: right },
      { o: [200, 200], d: [-1, 0], n: [0, 1], k: bottom },
      { o: [0, 200], d: [0, -1], n: [-1, 0], k: left },
    ];
    const P = (sd, u, v) => [sd.o[0] + sd.d[0] * u + sd.n[0] * v * sd.k, sd.o[1] + sd.d[1] * u + sd.n[1] * v * sd.k].map((q) => q.toFixed(1)).join(' ');
    let p = 'M0 0';
    sides.forEach((sd) => {
      if (!sd.k) { p += ` L${P(sd, 200, 0)}`; return; }
      EDGE.slice(1).forEach((e) => {
        p += e[0] === 'C' ? ` C${P(sd, e[1], e[2])} ${P(sd, e[3], e[4])} ${P(sd, e[5], e[6])}` : ` L${P(sd, e[0], e[1])}`;
      });
    });
    return p + 'Z';
  }
  const PIECE_PX = 260, UNIT = PIECE_PX / 300, CELL = 200 * UNIT;
  const WORD = 'FOCUS';
  const pieceEls = WORD.split('').map((ch, i) => {
    const edges = [i % 2 ? -1 : 1, i % 2 ? 1 : -1, i % 2 ? 1 : -1, i % 2 ? -1 : 1];
    if (i > 0) edges[3] = i % 2 ? 1 : -1; // complements previous right edge
    const el = document.createElement('div');
    el.className = 'piece lit';
    el.innerHTML = `<svg viewBox="-50 -50 300 300"><path d="${piecePath(edges)}"/><text x="100" y="104">${ch}</text></svg>`;
    $('#pieces').appendChild(el);
    return el;
  });
  const ROW_X = (1080 - CELL * 5) / 2, ROW_Y = 1000 - CELL / 2;
  const pieceHome = (i) => ({ x: ROW_X + i * CELL - 50 * UNIT, y: ROW_Y - 50 * UNIT });
  const bgPieceEls = Array.from({ length: 11 }, (_, i) => {
    const el = document.createElement('div');
    el.className = 'piece bg';
    el.innerHTML = `<svg viewBox="-50 -50 300 300"><path d="${piecePath([1, -1, rand(i) > 0.5 ? 1 : -1, rand(i + 9) > 0.5 ? 1 : -1])}"/></svg>`;
    $('#bgPieces').appendChild(el);
    return el;
  });

  // Desk mat lines + rulers
  (() => {
    let s = '';
    [[0, 1920, 1080, 1920 - 1080 * Math.tan(Math.PI / 6)], [0, 1920, 1080, 840], [0, 1920, 1080 * Math.tan(Math.PI / 6), 0]].forEach(([a, b, c, d]) => (s += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`));
    for (let i = 1; i < 18; i++) s += `<text x="${i * 60 - 30 - 6}" y="-10">${i}</text>`;
    for (let i = 1; i < 32; i++) s += `<text x="-46" y="${i * 60 - 30 + 6}">${i}</text>`;
    s += `<text x="${1080 - 160}" y="${1920 - 160}" font-size="34">A2</text>`;
    $('#matLines').innerHTML = s;
  })();

  // "working?" letters
  $('#working').innerHTML = 'working?'.split('').map((c) => `<span class="ch">${c}</span>`).join('');

  // Lego-ish bricks
  const BRICKS = [
    { c: '#d8262c', x: 40, y: 150, r: -18, w: 4, h: 2 },
    { c: '#1a9c9c', x: 820, y: 230, r: 14, w: 2, h: 2 },
    { c: '#f4c430', x: -60, y: 1010, r: 28, w: 4, h: 2 },
    { c: '#2d6cdf', x: 880, y: 1000, r: -12, w: 2, h: 3 },
    { c: '#e86a1d', x: 60, y: 1740, r: 10, w: 3, h: 2 },
    { c: '#2aa04a', x: 760, y: 1720, r: -24, w: 4, h: 2 },
  ];
  const brickEls = BRICKS.map((b) => {
    const el = document.createElement('div');
    el.className = 'brick';
    el.style.background = b.c;
    el.style.width = `${b.w * 60 + 12}px`;
    el.style.height = `${b.h * 60 + 12}px`;
    el.style.gridTemplateColumns = `repeat(${b.w}, 1fr)`;
    el.innerHTML = `<i style="background:radial-gradient(circle at 40% 35%, rgba(255,255,255,.45), rgba(255,255,255,0) 55%), ${b.c}"></i>`.repeat(b.w * b.h);
    $('#bricks').appendChild(el);
    return el;
  });

  // Error-window cascade (the classic trail)
  const win = $('#win');
  const stack = $('#winStack');
  win.after(stack);
  const GHOSTS = 10;
  const ghostEls = Array.from({ length: GHOSTS }, () => {
    const g = win.cloneNode(true);
    g.removeAttribute('id');
    g.className = 'win win-ghost';
    $$('[id]', g).forEach((n) => n.removeAttribute('id'));
    g.querySelector('.win-bar span').textContent = 'focus.exe (Not Responding)';
    g.querySelector('.win-progress i').style.width = '6%';
    g.querySelector('.win-sub').textContent = 'Time remaining: forever';
    stack.appendChild(g);
    return g;
  });

  // Folders
  const FOLDERS = [
    { n: 'Tasks', c: '35 items', x: 70, y: 960, r: -6 },
    { n: 'Docs', c: '50 items', x: 420, y: 1000, r: 3 },
    { n: 'Chats', c: '100 items', x: 770, y: 950, r: 7 },
  ];
  const folderEls = FOLDERS.map((f) => {
    const el = document.createElement('div');
    el.className = 'folder';
    el.innerHTML = `<svg viewBox="0 0 240 190"><path d="M10 34a16 16 0 0 1 16-16h58a10 10 0 0 1 7 3l15 15h108a16 16 0 0 1 16 16v14H10z" fill="#1f8fe6"/><rect x="10" y="52" width="220" height="130" rx="16" fill="#3ab4ff"/><rect x="10" y="52" width="220" height="14" rx="7" fill="rgba(255,255,255,.28)"/></svg><div class="fl">${f.n}</div><div class="fn">${f.c}</div>`;
    $('#folders').appendChild(el);
    return el;
  });

  // Star + dust
  const STAR = `<svg viewBox="-200 -200 400 400">
      <defs><radialGradient id="sg"><stop offset="0" stop-color="#fff6dc" stop-opacity=".9"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient></defs>
      <circle r="190" fill="url(#sg)" opacity=".35"/>
      <g style="filter:drop-shadow(0 0 18px rgba(255,240,200,.9)) drop-shadow(0 0 50px rgba(255,220,150,.6))">
        <path d="M0-195C10-45 45-10 195 0 45 10 10 45 0 195-10 45-45 10-195 0-45-10-10-45 0-195Z" fill="#fffaf0"/>
        <path transform="rotate(45) scale(.42)" d="M0-195C10-45 45-10 195 0 45 10 10 45 0 195-10 45-45 10-195 0-45-10-10-45 0-195Z" fill="#fffaf0"/>
        <circle r="16" fill="#1a1712"/><circle r="7" fill="#fffaf0"/>
      </g></svg>`;
  $('#star').innerHTML = STAR;
  const dustEls = Array.from({ length: 70 }, (_, i) => {
    const d = document.createElement('div');
    d.className = 'dot';
    const sz = 2 + rand(i * 3) * 5;
    Object.assign(d.style, { left: `${rand(i) * 1080}px`, top: `${rand(i + 50) * 1920}px`, width: `${sz}px`, height: `${sz}px` });
    $('#dust').appendChild(d);
    return d;
  });

  /* ── Refs ─────────────────────────────────────────────────────── */
  const E = {
    cam: $('#cam'), flash: $('#flash'), leak: $('#leak'), turb: $('#turb'), rgbR: $('#rgbR'), rgbB: $('#rgbB'),
    tc: $('#tc'), fig: $('#hudFig'), hud: $('#hud'),
    s1: $('#s1'), clockWrap: $('#clockWrap'), clockOuter: $('#clockOuter'), clockInner: $('#clockInner'), clockGhost: $('#clockGhost'),
    s1a: $('#s1a'), s1b: $('#s1b'), roll: $$('#timeRoll span'),
    s2: $('#s2'), s2script: $('#s2script'), s2note: $('#s2note'),
    s3: $('#s3'), oBook: $('#oBook'), oSticky: $('#oSticky'), oPen: $('#oPen'), oCup: $('#oCup'), oClip: $('#oClip'),
    chars: $$('#working .ch'), areYou: $('#areYou'), tech: $('#tech'), practically: $('#practically'), arrow: $('#arrow'), arrowPaths: $$('#arrow path'), notif: $('#notif'),
    s4: $('#s4'), win, winTitle: $('#winTitle'), winSub: $('#winSub'), winBar: $('#winBar'), btn: $('#btnCancel'), stamps: [$('#st1'), $('#st2'), $('#st3')], px: $('#pxCursor'),
    s5: $('#s5'), toggle: $('#toggle'), knob: $('#knob'), tgBusy: $('#tgBusy'), tgFocus: $('#tgFocus'), meet1: $('#meet1'), meet2: $('#meet2'), meetSub: $('#meetSub'), fcard: $('#fcard'), fcount: $('#fcount'), mac: $('#macCursor'),
    s6: $('#s6'), star: $('#star'), q1: $('#q1'), q2: $('#q2'), lkWord: $('#lkWord'), lkTag: $('#lkTag'), lkUrl: $('#lkUrl'),
  };
  E.arrowPaths.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });

  /* ── Camera language ──────────────────────────────────────────── */
  const IMPULSES = [
    [4.5, 14], [5.0, 9], [5.25, 9], [5.5, 9], [5.75, 9], [6.0, 14], [8.0, 26],
    [8.5, 6], [10.25, 8], [11.0, 10], [13.0, 12], [15.0, 16], [15.5, 22], [15.75, 22], [16.0, 26],
    [17.0, 18], [17.25, 7], [17.5, 9], [19.0, 9], [20.0, 5], [20.25, 5], [20.5, 7], [21.5, 10],
  ];
  const PUNCH = [[4.5, 0.06], [8.0, 0.08], [15.5, 0.035], [15.75, 0.035], [16.0, 0.05], [17.0, 0.07], [21.5, 0.05]];
  const RGB = [[4.5, 14], [8.0, 22], [13.0, 26], [15.0, 10], [16.0, 12], [17.0, 28], [21.5, 16]];

  function camera(t) {
    let x = 0, y = 0, r = 0, s = 1;
    IMPULSES.forEach(([ti, a], i) => {
      const d = t - ti;
      if (d < 0 || d > 0.6) return;
      const env = a * Math.exp(-d * 11);
      x += env * Math.sin(d * 70 + i);
      y += env * Math.cos(d * 63 + i * 2);
      r += env * 0.02 * Math.sin(d * 50 + i);
    });
    PUNCH.forEach(([ti, a]) => { const d = t - ti; if (d >= 0) s += a * Math.exp(-d * 7); });
    // handheld drift
    x += Math.sin(t * 0.9) * 4 + Math.sin(t * 2.3) * 2;
    y += Math.cos(t * 0.7) * 4 + Math.sin(t * 1.9) * 2;
    r += Math.sin(t * 0.5) * 0.25;
    E.cam.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`;

    let rgb = 0;
    RGB.forEach(([ti, a]) => { const d = t - ti; rgb += a * Math.exp(-Math.abs(d) * (d < 0 ? 18 : 9)); });
    if (t > 16.7 && t < 17.0) rgb += 18 * (0.5 + 0.5 * Math.sin(step(t, 24) * 90));
    if (rgb > 0.6) {
      E.rgbR.setAttribute('dx', rgb.toFixed(1));
      E.rgbB.setAttribute('dx', (-rgb).toFixed(1));
      E.cam.style.filter = 'url(#rgb)';
    } else E.cam.style.filter = '';

    let fl = 0;
    [[4.5, 0.35], [8.0, 0.9], [17.0, 0.75], [21.5, 0.5]].forEach(([ti, a]) => { const d = t - ti; if (d >= 0) fl += a * Math.exp(-d * 14); });
    set(E.flash, { o: clamp(fl) });

    let lk = 0;
    [[8.0, 0.8], [17.0, 1], [21.4, 0.7], [4.4, 0.4]].forEach(([ti, a]) => { lk += a * Math.exp(-Math.pow((t - ti) / 0.25, 2)); });
    set(E.leak, { o: clamp(lk), x: (t % 5) * 40 - 100 });

    // grain refresh per output frame, timecode, end fade
    const f = Math.round(t * FPS_TC);
    E.turb.setAttribute('seed', String((f % 97) + 1));
    const ss = Math.floor(f / FPS_TC), ff = f % FPS_TC;
    E.tc.textContent = `00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
    const scene = t < 4.5 ? 1 : t < 8 ? 2 : t < 13 ? 3 : t < 17 ? 4 : t < 21.5 ? 5 : 6;
    E.fig.textContent = `FIG.0${scene}`;
    const end = 1 - ease.inCubic(prog(t, 24.4, 0.6));
    E.cam.style.opacity = end < 1 ? end.toFixed(3) : '';
    E.hud.style.opacity = (end * clamp(t * 3)).toFixed(3);
  }

  /* ── S1 · Time (0 → 4.5) ──────────────────────────────────────── */
  function s1(t) {
    const on = t < 4.55;
    show(E.s1, on);
    if (!on) return;
    const intro = ease.outCubic(prog(t, 0, 0.9));
    const through = ease.inExpo(prog(t, 3.7, 0.8));
    set(E.clockWrap, { o: intro, s: lerp(0.88, 1.0, ease.inOutCubic(prog(t, 0, 3.7))) * lerp(1, 9, through), r: through * 110, b: (1 - intro) * 20 });
    E.clockOuter.style.transform = `rotate(${(-t * 9 - through * 200).toFixed(2)}deg)`;
    E.clockInner.style.transform = `rotate(${(t * 22 + through * 300).toFixed(2)}deg)`;
    E.clockGhost.style.transform = `rotate(${(t * 5).toFixed(2)}deg)`;

    const up = ease.inOutCubic(prog(t, 1.75, 0.5)) * -112;
    set(E.s1a, mix(blurIn(t, 0.35, { y: 50 }), { y: up }));
    set(E.s1b, mix(blurIn(t, 0.85, { y: 50 }), { y: up }));
    // TIME. rolls in with an echo trail that collapses into it
    const [g1, g2, big, g3, g4] = E.roll;
    const k = t - 2.0;
    const sp = spring(k, { freq: 1.4, damping: 0.7 });
    big.style.top = '262px';
    set(big, { o: clamp(k * 4), y: lerp(300, 0, sp), b: (1 - clamp(k * 2.5)) * 18 });
    [g3, g4, g2, g1].forEach((g, i) => {
      const lag = spring(k - 0.06 * (i + 1), { freq: 1.2, damping: 0.8 });
      g.style.top = '290px';
      const off = (i < 2 ? 1 : -1) * (i % 2 ? 260 : 130);
      set(g, { o: clamp(k * 4) * (1 - clamp((k - 0.5) * 2)) * 0.9, y: lerp(300 + Math.abs(off), 0, lag) + off * (1 - clamp((k - 0.2) * 1.4)) });
    });
  }

  /* ── S2 · Focus (4.5 → 8.0) ───────────────────────────────────── */
  const LAND = [5.0, 5.25, 5.5, 5.75, 6.0];
  function s2(t) {
    const on = t > 4.45 && t < 8.05;
    show(E.s2, on);
    if (!on) return;
    const zin = ease.outExpo(prog(t, 4.5, 0.8));
    E.s2.style.transform = `scale(${lerp(1.5, 1, zin).toFixed(4)})`;
    const boom = ease.inExpo(prog(t, 7.55, 0.45));

    // script writes on left → right
    const w = ease.inOutCubic(prog(t, 4.6, 0.7));
    E.s2script.style.clipPath = `inset(-20% ${(100 - w * 100).toFixed(2)}% -20% 0)`;
    set(E.s2script, { o: 1 - boom, b: boom * 20, y: -boom * 200 });
    set(E.s2note, mix(blurIn(t, 6.5, { y: 20, b: 10 }), { o: 1 - boom }));

    pieceEls.forEach((el, i) => {
      const home = pieceHome(i);
      const tl = LAND[i];
      const a = rand(i + 3) * Math.PI * 2;
      const from = { x: home.x + Math.cos(a) * 1100, y: home.y + Math.sin(a) * 1300 };
      const k = ease.outExpo(prog(t, tl - 0.4, 0.4));
      const settle = spring(t - tl, { freq: 3, damping: 0.45 });
      const rot = lerp((rand(i) - 0.5) * 280, 0, k);
      // explode toward camera
      const ex = { x: (i - 2) * 520 * boom, y: (rand(i + 7) - 0.5) * 900 * boom };
      set(el, {
        o: clamp((t - (tl - 0.4)) * 6),
        x: lerp(from.x, home.x, k) + ex.x,
        y: lerp(from.y, home.y, k) + ex.y - (t > tl ? 0 : 0),
        s: lerp(2.2, 1, k) * (t > tl ? lerp(1.08, 1, settle) : 1) * lerp(1, 3.2, boom),
        r: rot + boom * (rand(i + 2) - 0.5) * 120,
        b: (1 - k) * 16 + boom * 26,
      });
    });

    bgPieceEls.forEach((el, i) => {
      const d = rand(i + 20);
      const x = rand(i + 30) * 1180 - 150, y = rand(i + 40) * 2000 - 120;
      set(el, {
        o: clamp((t - 4.5 - i * 0.04) * 3) * 0.55 * (1 - boom),
        x: x + Math.sin(t * 0.6 + i) * 40,
        y: y - (t - 4.5) * lerp(30, 90, d),
        s: lerp(0.45, 1.25, d) * lerp(1, 2, boom),
        r: (t - 4.5) * (rand(i + 50) - 0.5) * 60 + i * 33,
        b: lerp(2, 14, d) + boom * 10,
      });
    });
  }

  /* ── S3 · Desk (8.0 → 13.0) ───────────────────────────────────── */
  const OBJ = [
    { k: 'oBook', x: -130, y: 110, r: -14, fx: -700, fy: -300, t: 8.0 },
    { k: 'oSticky', x: 800, y: 300, r: 10, fx: 600, fy: -200, t: 8.08 },
    { k: 'oCup', x: -90, y: 1400, r: 0, fx: -600, fy: 200, t: 8.16 },
    { k: 'oPen', x: 440, y: 1690, r: -28, fx: 500, fy: 500, t: 8.25 },
    { k: 'oClip', x: 930, y: 1150, r: 22, fx: 400, fy: 0, t: 8.33 },
  ];
  function s3(t) {
    const on = t > 7.95 && t < 13.05;
    show(E.s3, on);
    if (!on) return;
    const zin = ease.outExpo(prog(t, 8.0, 0.7));
    const whip = ease.inExpo(prog(t, 12.72, 0.28));
    const push = ease.inOutCubic(prog(t, 8, 4.7));
    E.s3.style.transform = `translate3d(${(-whip * 1500).toFixed(1)}px,0,0) scale(${(lerp(1.3, 1, zin) * lerp(1, 1.06, push)).toFixed(4)})`;

    const ts = step(t); // stop-motion
    OBJ.forEach((o) => {
      const k = ease.outCubic(prog(ts, o.t, 0.42));
      const jit = k >= 1 ? 0 : (rand(Math.floor(ts * 12) + o.x) - 0.5) * 6;
      set(E[o.k], { o: k > 0 ? 1 : 0, x: o.x + o.fx * (1 - k) + jit, y: o.y + o.fy * (1 - k), r: o.r + (1 - k) * 25 + jit });
    });

    E.chars.forEach((c, i) => {
      const k = t - (8.5 + i * 0.05);
      const sp = spring(k, { freq: 2.2, damping: 0.5 });
      set(c, { o: clamp(k * 8), y: lerp(-260, 0, sp), s: lerp(1.6, 1, sp), r: (1 - clamp(k * 3)) * (rand(i) - 0.5) * 40, b: (1 - clamp(k * 5)) * 14 });
    });
    const wr = ease.inOutCubic(prog(t, 8.9, 0.55));
    E.areYou.style.clipPath = `inset(-30% ${(100 - wr * 100).toFixed(2)}% -30% 0)`;
    set(E.areYou, { r: -9, o: wr > 0 ? 1 : 0 });

    const wt = ease.inOutCubic(prog(t, 9.75, 0.55));
    E.tech.style.clipPath = `inset(-30% ${(100 - wt * 100).toFixed(2)}% -30% 0)`;
    set(E.tech, { r: -5, o: wt > 0 ? 1 : 0 });

    const sk = step(t) - 10.25; // sticker pops stop-motion style
    set(E.practically, { o: sk >= 0 ? 1 : 0, s: sk < 0 ? 0 : sk < 0.09 ? 1.25 : sk < 0.17 ? 0.94 : 1, r: -4 });

    E.arrowPaths.forEach((p, i) => {
      const L = +p.dataset.len;
      const k = ease.inOutCubic(prog(t, 10.5 + i * 0.3, i ? 0.15 : 0.35));
      p.style.strokeDashoffset = (L * (1 - k)).toFixed(1);
    });
    set(E.arrow, { o: t > 10.5 ? 1 : 0 });

    const nk = t - 11.0;
    const nsp = spring(nk, { freq: 2.0, damping: 0.45 });
    set(E.notif, { o: clamp(nk * 8), s: lerp(0.4, 1, nsp), r: lerp(-20, 5, nsp), y: lerp(120, 0, nsp) });
  }

  /* ── S4 · Retro OS (13.0 → 17.0) ──────────────────────────────── */
  let cancelPos;
  function s4(t) {
    const on = t > 12.95 && t < 17.05;
    show(E.s4, on);
    if (!on) return;
    const enter = ease.outExpo(prog(t, 13.0, 0.4));
    const gl = t > 16.72 ? (rand(Math.floor(t * 24)) - 0.5) * 80 : 0;
    E.s4.style.transform = `translate3d(${((1 - enter) * 1500 + gl).toFixed(1)}px,0,0)`;

    const ts = step(t);
    brickEls.forEach((el, i) => {
      const b = BRICKS[i];
      const k = ease.outCubic(prog(ts, 13.1 + i * 0.08, 0.34));
      set(el, { o: k > 0 ? 1 : 0, x: b.x, y: b.y - (1 - k) * 80, s: lerp(1.7, 1, k), r: b.r + (1 - k) * 30 });
    });

    const wk = step(t, 24) - 13.25;
    set(E.win, { o: wk >= 0 ? 1 : 0, s: wk < 0 ? 0.6 : wk < 0.08 ? 1.06 : 1 });
    // progress: crawls to 3%, then hangs
    const pct = Math.min(3, Math.floor(ease.outCubic(prog(t, 13.5, 0.6)) * 3 + 0.0001)) + (t > 13.5 ? 3 : 0);
    E.winBar.style.width = `${pct}%`;
    const hang = t > 14.5;
    E.winTitle.textContent = hang ? 'focus.exe (Not Responding)' : 'focus.exe';
    E.winSub.textContent = hang ? 'Time remaining: forever' : t > 13.6 ? `${pct}% — 2 hours remaining` : 'Estimating time remaining';
    E.win.style.filter = hang ? 'grayscale(.4) brightness(1.06)' : '';

    // cursor → Cancel, click at 15.0
    cancelPos = cancelPos || stagePos(E.btn);
    const ck = ease.inOutCubic(prog(t, 14.45, 0.5));
    const cx = lerp(980, cancelPos.x - 6, ck), cy = lerp(1560, cancelPos.y - 6, ck);
    set(E.px, { o: t > 14.4 && t < 15.3 ? 1 : 0, x: cx, y: cy });
    E.btn.classList.toggle('down', t > 14.97 && t < 15.1);

    ghostEls.forEach((g, i) => {
      const gt = 15.05 + i * 0.05;
      set(g, { o: step(t, 24) >= gt ? 1 : 0, x: (i + 1) * 20, y: (i + 1) * 22 });
    });

    E.stamps.forEach((s, i) => {
      const sk = step(t, 24) - [15.5, 15.75, 16.0][i];
      set(s, { o: sk >= 0 ? 1 : 0, s: sk < 0 ? 1 : sk < 0.042 ? 1.45 : sk < 0.084 ? 0.92 : 1, r: sk < 0.084 && sk >= 0 ? (i - 1) * 4 : 0 });
    });
  }

  /* ── S5 · Lumen (17.0 → 21.5) ─────────────────────────────────── */
  let togglePos, cardPos;
  function s5(t) {
    const on = t > 16.95 && t < 21.55;
    show(E.s5, on);
    if (!on) return;
    cardPos = cardPos || { x: 540, y: 1300 + 260 };
    const zout = ease.inExpo(prog(t, 21.0, 0.5));
    const punch = ease.outExpo(prog(t, 17.0, 0.6));
    E.s5.style.transformOrigin = `${cardPos.x}px ${cardPos.y}px`;
    E.s5.style.transform = `scale(${(lerp(1.15, 1, punch) * lerp(1, 5, zout)).toFixed(4)})`;
    E.s5.style.filter = zout > 0.02 ? `blur(${(zout * 24).toFixed(1)}px)` : '';

    set(E.toggle, blurIn(t, 17.05, { y: -40, b: 16, dur: 0.6 }));
    const tk = spring(t - 18.0, { freq: 2.2, damping: 0.55 });
    E.knob.style.transform = `translateX(${(tk * 274).toFixed(1)}px)`;
    E.tgBusy.style.color = tk < 0.5 ? '#111' : '#fff';
    E.tgFocus.style.color = tk < 0.5 ? '#fff' : '#111';

    set(E.meet1, blurIn(t, 17.25, { y: 120, b: 34, s: 1.1 }));
    set(E.meet2, blurIn(t, 17.5, { y: 120, b: 34, s: 1.1 }));
    set(E.meetSub, blurIn(t, 17.85, { y: 40, b: 20 }));

    const ts = step(t);
    const DRAG = [19.75, 19.95, 20.15];
    folderEls.forEach((el, i) => {
      const f = FOLDERS[i];
      const pk = ts - [18.25, 18.5, 18.75][i];
      const pop = pk < 0 ? 0 : pk < 0.09 ? 1.2 : pk < 0.17 ? 0.95 : 1;
      const dk = ease.inOutCubic(prog(t, DRAG[i], 0.45));
      const tx = cardPos.x - 120, ty = cardPos.y - 150;
      const x = lerp(f.x, tx, dk), y = lerp(f.y, ty, dk) - Math.sin(Math.PI * dk) * 180;
      set(el, { o: (pk >= 0 ? 1 : 0) * (1 - clamp((dk - 0.8) * 5)), x, y, s: pop * lerp(1, 0.35, dk), r: f.r * (1 - dk) });
    });

    const ck = spring(t - 19.0, { freq: 1.3, damping: 0.65 });
    set(E.fcard, { o: clamp((t - 19.0) * 4), y: lerp(700, 0, ck), r: lerp(8, -1.5, ck) });
    const count = [35, 50, 100].reduce((a, n, i) => a + (t > DRAG[i] + 0.4 ? n : 0), 0);
    E.fcount.textContent = `${count} items`;

    // cursor: toggle click, then drags "Tasks"
    togglePos = togglePos || { x: 540 + 140, y: 260 };
    let mx, my;
    if (t < 18.6) {
      const k = ease.inOutCubic(prog(t, 17.55, 0.4));
      mx = lerp(1000, togglePos.x, k); my = lerp(560, togglePos.y, k);
    } else {
      const k = ease.inOutCubic(prog(t, 19.3, 0.4));
      const dk = ease.inOutCubic(prog(t, DRAG[0], 0.45));
      const fx = FOLDERS[0].x + 150, fy = FOLDERS[0].y + 110;
      mx = lerp(lerp(togglePos.x, fx, k), cardPos.x + 30, dk);
      my = lerp(lerp(togglePos.y, fy, k), cardPos.y - 40, dk) - Math.sin(Math.PI * dk) * 180;
    }
    const press = t > 17.95 && t < 18.08 ? 0.85 : 1;
    set(E.mac, { o: t > 17.5 && t < 20.4 ? 1 : 0, x: mx, y: my, s: press });
  }

  /* ── S6 · End (21.5 → 25) ─────────────────────────────────────── */
  function s6(t) {
    const on = t > 21.45;
    show(E.s6, on);
    if (!on) return;
    dustEls.forEach((d, i) => {
      const tw = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * (1 + rand(i + 5) * 3) + i));
      d.style.opacity = (tw * clamp((t - 21.5 - rand(i) * 0.8) * 2) * 0.7).toFixed(3);
    });
    const sk = t - 21.6;
    const sp = spring(sk, { freq: 1.2, damping: 0.55 });
    set(E.star, { o: clamp(sk * 4), s: lerp(0.1, 1, sp) * (1 + 0.04 * Math.sin(t * 3)), r: lerp(-90, 0, sp) + (t - 21.6) * 6, b: (1 - clamp(sk * 3)) * 20 });

    set(E.q1, mix(blurIn(t, 21.75, { y: 70, b: 30 }), blurOut(t, 22.95, { y: -60 })));
    set(E.q2, mix(blurIn(t, 22.0, { y: 70, b: 30 }), blurOut(t, 23.0, { y: -60 })));
    set(E.lkWord, blurIn(t, 23.25, { y: 80, b: 36, s: 1.08 }));
    set(E.lkTag, blurIn(t, 23.5, { y: 40, b: 24 }));
    set(E.lkUrl, blurIn(t, 23.75, { y: 20, b: 12 }));
  }

  function renderAt(t) {
    t = clamp(t, 0, DURATION);
    camera(t);
    s1(t); s2(t); s3(t); s4(t); s5(t); s6(t);
  }
  window.renderAt = renderAt;
  window.DURATION = DURATION;
  window.fontsReady = Promise.all(Array.from(document.fonts).map((f) => f.load().catch(() => null)));

  /* ── Preview player / render mode ─────────────────────────────── */
  const params = new URLSearchParams(location.search);
  if (params.has('render')) {
    document.body.classList.add('render');
    renderAt(Number(params.get('t') || 0));
    return;
  }
  const stage = $('#stage');
  const fit = () => (stage.style.transform = `scale(${Math.min(innerWidth / 1080, (innerHeight - 70) / 1920)})`);
  fit();
  addEventListener('resize', fit);
  const scrub = $('#scrub'), playBtn = $('#play'), timeLbl = $('#time');
  let playing = true, t = Number(params.get('t') || 0), last = performance.now();
  const toggle = () => { playing = !playing; playBtn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  playBtn.addEventListener('click', toggle);
  addEventListener('keydown', (e) => e.code === 'Space' && (e.preventDefault(), toggle()));
  scrub.addEventListener('input', () => { t = +scrub.value * DURATION; if (playing) toggle(); });
  const loop = (now) => {
    if (playing) { t += (now - last) / 1000; if (t > DURATION) t = 0; }
    last = now;
    renderAt(t);
    scrub.value = String(t / DURATION);
    timeLbl.textContent = `${t.toFixed(2)}s`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
